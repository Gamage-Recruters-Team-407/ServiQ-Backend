const { PAYOUT_STATUSES: S } = require("../constants/enums");
const { MIN_PAYOUT_AMOUNT, CURRENCY } = require("../config/payout.config");
const store = require("./payout.store.mock");

// MOCK: Once Dev 18 (Earnings) is ready, calculate this from Earnings records with status "Available" and payout_id null.
const MOCK_ELIGIBLE_EARNINGS = 55000;

// Payouts reserved from the balance.
const COMMITTED = [S.PENDING, S.AWAITING_APPROVAL, S.APPROVED, S.PROCESSING, S.SUCCESSFUL];
// Payouts not yet paid.
const IN_PROGRESS = [S.PENDING, S.AWAITING_APPROVAL, S.APPROVED, S.PROCESSING];

// PROVISIONAL: Allowed status transitions are not finalized. Update after leader/client approval.
const ALLOWED_TRANSITIONS = {
  [S.PENDING]: [S.APPROVED, S.REJECTED],
  [S.APPROVED]: [S.SUCCESSFUL, S.FAILED],
};

function httpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function pagination(total, page, limit) {
  return { page, limit, total, total_pages: Math.max(Math.ceil(total / limit), 1) };
}

async function getEligibility(providerId) {
  const committed = await store.sumAmount(providerId, COMMITTED);
  const available = Math.max(MOCK_ELIGIBLE_EARNINGS - committed, 0);
  return {
    currency: CURRENCY,
    available_balance: available,
    pending_payout: await store.sumAmount(providerId, IN_PROGRESS),
    total_paid_out: await store.sumAmount(providerId, [S.SUCCESSFUL]),
    minimum_payout: MIN_PAYOUT_AMOUNT,
    can_request: available >= MIN_PAYOUT_AMOUNT,
  };
}

async function createPayout(providerId, { payout_amount, payout_method, destination_ref }) {
  const { available_balance } = await getEligibility(providerId);
  if (payout_amount < MIN_PAYOUT_AMOUNT) {
    throw httpError(400, `Minimum payout amount is ${MIN_PAYOUT_AMOUNT} ${CURRENCY}`);
  }
  if (payout_amount > available_balance) {
    throw httpError(400, `Amount cannot be more than the available balance (${available_balance} ${CURRENCY})`);
  }
  // TODO (when Dev 18 is ready): Mark paid Earnings records with payout_id using Dev 18's interface.
  return store.create({
    provider_id: providerId,
    payout_amount,
    currency: CURRENCY,
    payout_method,
    destination_ref,
    payout_status: S.PENDING,
  });
}

async function listProviderPayouts(providerId, { status, page, limit }) {
  const { items, total } = await store.list({ providerId, status, page, limit });
  return { items, pagination: pagination(total, page, limit) };
}

async function listAdminPayouts({ status, page, limit }) {
  const { items, total } = await store.list({ status, page, limit });
  const counts = await store.countByStatus();
  return {
    items,
    pagination: pagination(total, page, limit),
    summary: {
      pending: counts[S.PENDING] || 0,
      approved: counts[S.APPROVED] || 0,
      successful: counts[S.SUCCESSFUL] || 0,
      rejected: counts[S.REJECTED] || 0,
    },
  };
}

async function changeStatus(id, adminId, { status, reason }) {
  const payout = await store.findById(id);
  if (!payout) throw httpError(404, "Payout not found");

  const allowed = ALLOWED_TRANSITIONS[payout.payout_status] || [];
  if (!allowed.includes(status)) {
    throw httpError(409, `Cannot change status from "${payout.payout_status}" to "${status}"`);
  }

  const now = new Date().toISOString();
  const patch = { payout_status: status };
  if (status === S.APPROVED) {
    patch.approved_by = adminId;
    patch.initiated_at = now;
  }
  if (status === S.SUCCESSFUL) patch.completed_at = now;
  if (status === S.REJECTED || status === S.FAILED) patch.failure_reason = reason;

  // TODO: Add notifications (Dev 24) and audit logs when their interfaces are ready.
  return store.update(id, patch);
}

module.exports = { getEligibility, createPayout, listProviderPayouts, listAdminPayouts, changeStatus };