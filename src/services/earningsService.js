const Earnings = require("../models/Earnings");
const EarningsHistory = require("../models/EarningsHistory");
const auditLogService = require("./auditLogService");
const { defaultSources } = require("../integrations/earningsSources");
const {
  EARNINGS_STATUSES,
  EARNINGS_HISTORY_ENTRY_TYPES,
  AUDIT_EVENT_TYPES,
  AUDIT_OUTCOMES
} = require("../constants/enums");

const OUTCOMES = {
  CREATED: "created",
  EXISTING: "existing",
  DEFERRED: "deferred",
  REJECTED: "rejected"
};

const CODES = {
  POLICY_NOT_CONFIGURED: "POLICY_NOT_CONFIGURED",
  SOURCE_MISSING: "SOURCE_MISSING",
  SOURCE_INCONSISTENT: "SOURCE_INCONSISTENT",
  INVALID_AMOUNT: "INVALID_AMOUNT",
  NOT_ELIGIBLE: "NOT_ELIGIBLE",
  POLICY_ERROR: "POLICY_ERROR"
};

/**
 * Policy contract (supplied by the approved financial rules; none is built in):
 *   version: string
 *   evaluateEligibility({ booking, payment, commission, completion })
 *     -> { eligible: boolean, deferred?: boolean, reason?: string }
 *        deferred=true means "not yet, retry later"; eligible=false without deferred is a rejection.
 *   calculate({ booking, payment, commission, completion })
 *     -> { earnings_amount: number, initial_status?: string, inputs?: object }
 */
function assertPolicy(policy) {
  return (
    policy &&
    typeof policy.version === "string" &&
    typeof policy.evaluateEligibility === "function" &&
    typeof policy.calculate === "function"
  );
}

const isMoney = (n) => typeof n === "number" && Number.isFinite(n) && n >= 0;
const sameId = (a, b) => a != null && b != null && String(a) === String(b);

function result(outcome, extra = {}) {
  return { outcome, ...extra };
}

function createEarningsService({
  policy = null,
  sources = defaultSources,
  auditLog = auditLogService,
  models = { Earnings, EarningsHistory }
} = {}) {
  async function recordFailure(paymentId, code, reason, actor) {
    try {
      await auditLog.recordEvent({
        actor_id: actor?.id || null,
        actor_role: actor?.role || null,
        event_type: AUDIT_EVENT_TYPES.TRANSACTION,
        action: "earnings.process",
        resource_type: "Earnings",
        resource_id: null,
        outcome: AUDIT_OUTCOMES.FAILURE,
        correlation_reference: `earnings:payment:${paymentId}`,
        new_state: { code, reason }
      });
    } catch (_) {
      // Failure recording must never break processing or hide the original outcome.
    }
  }

  async function fail(outcome, paymentId, code, reason, actor) {
    await recordFailure(paymentId, code, reason, actor);
    return result(outcome, { code, reason });
  }

  async function appendCalculationHistory(earnings, snapshot, actor) {
    try {
      await models.EarningsHistory.create({
        earnings_id: earnings._id,
        provider_id: earnings.provider_id,
        entry_type: EARNINGS_HISTORY_ENTRY_TYPES.CALCULATION,
        amount: earnings.earnings_amount,
        currency: earnings.currency,
        previous_status: null,
        new_status: earnings.earnings_status,
        source_ref: { type: "Payment", id: earnings.payment_id },
        idempotency_key: `earnings:calc:${earnings.payment_id}`,
        actor_id: actor?.id || null,
        reason: `Calculated under policy ${snapshot.policy_version}`
      });
    } catch (err) {
      if (err?.code !== 11000) throw err; // already recorded by an earlier attempt
    }
  }

  /**
   * Idempotent: processing the same payment repeatedly never creates a second record,
   * and a record whose history entry was lost in a crash is repaired on retry.
   */
  async function processPayment(paymentId, { actor = null } = {}) {
    if (!assertPolicy(policy)) {
      return fail(OUTCOMES.DEFERRED, paymentId, CODES.POLICY_NOT_CONFIGURED,
        "Approved earnings policy is not configured; no amount was produced", actor);
    }

    const existing = await models.Earnings.findOne({ payment_id: paymentId });
    if (existing) {
      await appendCalculationHistory(existing, existing.calculation_snapshot || {}, actor);
      return result(OUTCOMES.EXISTING, { earnings: existing });
    }

    const payment = await sources.getPayment(paymentId);
    if (!payment) {
      return fail(OUTCOMES.DEFERRED, paymentId, CODES.SOURCE_MISSING, "Payment not found", actor);
    }

    const [booking, commission] = await Promise.all([
      sources.getBooking(payment.booking_id),
      sources.getCommissionByPayment(payment._id)
    ]);
    if (!booking) {
      return fail(OUTCOMES.DEFERRED, paymentId, CODES.SOURCE_MISSING, "Booking not found", actor);
    }
    if (!commission) {
      return fail(OUTCOMES.DEFERRED, paymentId, CODES.SOURCE_MISSING, "Commission not available", actor);
    }
    const completion = await sources.getServiceCompletion(booking._id);

    const providerId = booking.provider_id;
    const consistent =
      sameId(payment.booking_id, booking._id) &&
      sameId(commission.payment_id, payment._id) &&
      sameId(payment.provider_id ?? providerId, providerId) &&
      sameId(commission.provider_id ?? providerId, providerId) &&
      sameId(commission.booking_id ?? booking._id, booking._id);
    if (!consistent) {
      return fail(OUTCOMES.REJECTED, paymentId, CODES.SOURCE_INCONSISTENT,
        "Payment, booking, commission and provider references do not match", actor);
    }

    const currency = String(payment.currency || "").toUpperCase();
    if (!currency || (booking.currency && String(booking.currency).toUpperCase() !== currency)) {
      return fail(OUTCOMES.REJECTED, paymentId, CODES.SOURCE_INCONSISTENT,
        "Currency missing or mismatched between payment and booking", actor);
    }
    if (!isMoney(payment.amount) || !isMoney(commission.commission_amount)) {
      return fail(OUTCOMES.REJECTED, paymentId, CODES.INVALID_AMOUNT,
        "Payment or commission amount is missing or invalid", actor);
    }

    const context = { booking, payment, commission, completion };
    let eligibility;
    let calculation;
    try {
      eligibility = await policy.evaluateEligibility(context);
      if (eligibility?.eligible) calculation = await policy.calculate(context);
    } catch (err) {
      return fail(OUTCOMES.DEFERRED, paymentId, CODES.POLICY_ERROR, "Policy evaluation failed", actor);
    }

    if (!eligibility?.eligible) {
      return fail(
        eligibility?.deferred ? OUTCOMES.DEFERRED : OUTCOMES.REJECTED,
        paymentId,
        CODES.NOT_ELIGIBLE,
        eligibility?.reason || "Not eligible for earnings",
        actor
      );
    }

    const amount = calculation?.earnings_amount;
    if (!isMoney(amount) || amount > payment.amount) {
      return fail(OUTCOMES.REJECTED, paymentId, CODES.INVALID_AMOUNT,
        "Policy produced an invalid earnings amount", actor);
    }

    const snapshot = {
      policy_version: policy.version,
      inputs: {
        ...(calculation.inputs || {}),
        payment_amount: payment.amount,
        commission_amount: commission.commission_amount,
        commission_rate: commission.commission_rate ?? null
      }
    };

    let earnings;
    try {
      earnings = await models.Earnings.create({
        provider_id: providerId,
        booking_id: booking._id,
        service_id: booking.service_id || null,
        payment_id: payment._id,
        commission_id: commission._id,
        transaction_amount: payment.amount,
        commission_amount: commission.commission_amount,
        earnings_amount: amount,
        currency,
        earnings_status: calculation.initial_status || EARNINGS_STATUSES.CALCULATED,
        calculation_snapshot: snapshot,
        calculated_at: new Date()
      });
    } catch (err) {
      if (err?.code === 11000) {
        // Lost a race with a concurrent attempt for the same payment/commission.
        const winner = await models.Earnings.findOne({ payment_id: payment._id });
        if (winner) return result(OUTCOMES.EXISTING, { earnings: winner });
      }
      if (err?.name === "ValidationError") {
        return fail(OUTCOMES.REJECTED, paymentId, CODES.INVALID_AMOUNT, "Earnings record failed validation", actor);
      }
      throw err;
    }

    await appendCalculationHistory(earnings, snapshot, actor);
    return result(OUTCOMES.CREATED, { earnings });
  }

  return { processPayment };
}

module.exports = { createEarningsService, OUTCOMES, CODES };
