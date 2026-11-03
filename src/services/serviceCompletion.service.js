// Service Completion business logic (Developer 15).
// Built as a factory so the data layer can be swapped in unit tests.
const AppError = require("../utils/AppError");
const rules = require("./serviceCompletion.rules");
const {
  USER_ROLES,
  SERVICE_COMPLETION_STATUSES: S,
  PROVIDER_ACCOUNT_STATUSES,
  CUSTOMER_STATUSES,
  NOTIFICATION_EVENT_TYPES: N
} = require("../constants/enums");

const MIN_COMPLETION_NOTES = 10;
const MIN_CANCEL_REASON = 5;

// Customer confirmation of completion is pending confirmation in the project plan,
// so it is switchable: REQUIRE_CUSTOMER_CONFIRMATION=true makes the booking (and review unlock)
// wait for the customer. Default false: provider completion finishes the booking immediately.
const defaultConfig = () => ({
  requireCustomerConfirmation: String(process.env.REQUIRE_CUSTOMER_CONFIRMATION).toLowerCase() === "true"
});

const idOf = (v) => (v && typeof v === "object" && v._id ? String(v._id) : v ? String(v) : null);
const fullName = (u) => (u ? `${u.first_name || ""} ${u.last_name || ""}`.trim() : "");

const POPULATE = [
  {
    path: "booking_id",
    select: "booking_reference booking_status total_amount currency service_location requested_at service_id",
    populate: { path: "service_id", select: "name" }
  },
  {
    path: "provider_id",
    select: "business_information.business_name user_id",
    populate: { path: "user_id", select: "first_name last_name" }
  },
  {
    path: "customer_id",
    select: "user_id profile_details",
    populate: { path: "user_id", select: "first_name last_name" }
  }
];

function createServiceCompletionService(deps = {}) {
  const models = deps.models || require("../models");
  const { ServiceCompletion, Booking, Provider, Customer } = models;
  const notify = deps.notify || require("./notification.service").notify;
  const logAudit = deps.logAudit || require("./audit.service").logAudit;
  const getConfig = deps.getConfig || defaultConfig;

  // Booking interface (owned by Developer 08). The completion module only requests status changes.
  const bookings =
    deps.bookings ||
    {
      async setStatus(bookingId, status, { reason = null, cancelledBy = null } = {}) {
        const set = { booking_status: status };
        if (status === "Cancelled") {
          set.cancellation_reason = reason;
          set.cancelled_by = cancelledBy;
        }
        return Booking.findByIdAndUpdate(bookingId, { $set: set });
      }
    };

  // ---- actors ---------------------------------------------------------------
  async function resolveActor(user) {
    if (!user) throw new AppError("Authentication required", 401, "UNAUTHENTICATED");
    const actor = { userId: user.id, role: user.role, providerId: null, customerId: null };

    if (user.role === USER_ROLES.PROVIDER) {
      const provider = await Provider.findOne({ user_id: user.id }).select("_id account_status");
      if (!provider) throw new AppError("Complete your provider profile first", 403, "PROVIDER_PROFILE_REQUIRED");
      if ([PROVIDER_ACCOUNT_STATUSES.SUSPENDED, PROVIDER_ACCOUNT_STATUSES.RESTRICTED].includes(provider.account_status)) {
        throw new AppError("Your provider account cannot perform this action", 403, "PROVIDER_NOT_ALLOWED");
      }
      actor.providerId = String(provider._id);
    } else if (user.role === USER_ROLES.CUSTOMER) {
      const customer = await Customer.findOne({ user_id: user.id }).select("_id account_status");
      if (!customer) throw new AppError("Customer profile not found", 403, "CUSTOMER_PROFILE_REQUIRED");
      if ([CUSTOMER_STATUSES.SUSPENDED, CUSTOMER_STATUSES.RESTRICTED].includes(customer.account_status)) {
        throw new AppError("Your account cannot perform this action", 403, "CUSTOMER_NOT_ALLOWED");
      }
      actor.customerId = String(customer._id);
    }
    return actor;
  }

  const canView = (c, actor) =>
    actor.role === USER_ROLES.ADMIN ||
    (actor.role === USER_ROLES.PROVIDER && idOf(c.provider_id) === actor.providerId) ||
    (actor.role === USER_ROLES.CUSTOMER && idOf(c.customer_id) === actor.customerId);

  // ---- presentation ---------------------------------------------------------
  function toDTO(c, actor) {
    const cfg = getConfig();
    const booking = c.booking_id && typeof c.booking_id === "object" ? c.booking_id : null;
    const provider = c.provider_id && typeof c.provider_id === "object" ? c.provider_id : null;
    const customer = c.customer_id && typeof c.customer_id === "object" ? c.customer_id : null;
    const isProvider = actor?.role === USER_ROLES.PROVIDER;
    const isCustomer = actor?.role === USER_ROLES.CUSTOMER;

    return {
      id: String(c._id),
      booking: {
        id: idOf(c.booking_id),
        reference: booking?.booking_reference || null,
        status: booking?.booking_status || null,
        service_name: booking?.service_id?.name || null,
        total_amount: booking?.total_amount ?? null,
        currency: booking?.currency || null,
        location: booking?.service_location
          ? [booking.service_location.address, booking.service_location.city].filter(Boolean).join(", ")
          : null
      },
      provider: {
        id: idOf(c.provider_id),
        name: provider?.business_information?.business_name || fullName(provider?.user_id) || null
      },
      customer: { id: idOf(c.customer_id), name: fullName(customer?.user_id) || null },
      status: c.current_status,
      progress_percent: rules.progressPercent(c.current_status),
      start_datetime: c.start_datetime || null,
      completion_datetime: c.completion_datetime || null,
      completion_notes: c.completion_notes || null,
      evidence_urls: c.evidence_urls || [],
      customer_confirmed: !!c.completion_confirmation,
      confirmed_by_customer_at: c.confirmed_by_customer_at || null,
      review_eligible: !!c.review_eligibility,
      requires_customer_confirmation: cfg.requireCustomerConfirmation,
      allowed_next_statuses: isProvider ? rules.allowedNextStatuses(c.current_status) : [],
      can_confirm: !!(isCustomer && c.current_status === S.COMPLETED && !c.completion_confirmation),
      status_history: (c.status_history || []).map((h) => ({
        status: h.status,
        note: h.note || null,
        changed_by_role: h.changed_by_role || null,
        changed_at: h.changed_at
      })),
      created_at: c.created_at,
      updated_at: c.updated_at
    };
  }

  const loadPopulated = (id) => ServiceCompletion.findById(id).populate(POPULATE).lean();

  // ---- queries --------------------------------------------------------------
  async function list(user, query) {
    const actor = await resolveActor(user);
    const filter = {};
    if (actor.role === USER_ROLES.PROVIDER) filter.provider_id = actor.providerId;
    else if (actor.role === USER_ROLES.CUSTOMER) filter.customer_id = actor.customerId;
    else if (actor.role !== USER_ROLES.ADMIN) throw new AppError("Forbidden", 403, "FORBIDDEN");

    if (query.status) filter.current_status = query.status;
    else if (query.scope === "active") filter.current_status = { $nin: [S.COMPLETED, S.CANCELLED, S.DISPUTED] };
    else if (query.scope === "finished") filter.current_status = { $in: [S.COMPLETED, S.CANCELLED, S.DISPUTED] };
    if (query.booking_id) filter.booking_id = query.booking_id;

    const { page, limit } = query;
    const [total, rows] = await Promise.all([
      ServiceCompletion.countDocuments(filter),
      ServiceCompletion.find(filter)
        .populate(POPULATE)
        .sort({ updated_at: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
    ]);
    return {
      items: rows.map((r) => toDTO(r, actor)),
      meta: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) }
    };
  }

  async function getById(user, id) {
    const actor = await resolveActor(user);
    const c = await loadPopulated(id);
    if (!c) throw new AppError("Service completion record not found", 404, "COMPLETION_NOT_FOUND");
    if (!canView(c, actor)) throw new AppError("You do not have access to this record", 403, "FORBIDDEN");
    return toDTO(c, actor);
  }

  async function getByBooking(user, bookingId) {
    const actor = await resolveActor(user);
    const found = await ServiceCompletion.findOne({ booking_id: bookingId }).select("_id");
    if (!found) throw new AppError("No progress record exists for this booking yet", 404, "COMPLETION_NOT_FOUND");
    const c = await loadPopulated(found._id);
    if (!canView(c, actor)) throw new AppError("You do not have access to this record", 403, "FORBIDDEN");
    return toDTO(c, actor);
  }

  // ---- commands -------------------------------------------------------------
  async function create(user, { booking_id }, ctx = {}) {
    const actor = await resolveActor(user);
    if (actor.role !== USER_ROLES.PROVIDER) throw new AppError("Only providers can start service tracking", 403, "FORBIDDEN");

    const booking = await Booking.findById(booking_id).lean();
    if (!booking) throw new AppError("Booking not found", 404, "BOOKING_NOT_FOUND");
    if (idOf(booking.provider_id) !== actor.providerId) {
      throw new AppError("This booking is not assigned to you", 403, "NOT_YOUR_BOOKING");
    }
    if (!rules.TRACKABLE_BOOKING_STATUSES.includes(booking.booking_status)) {
      throw new AppError(
        `Service tracking can only start for accepted or confirmed bookings (current: ${booking.booking_status})`,
        409,
        "INVALID_BOOKING_STATE"
      );
    }
    const existing = await ServiceCompletion.findOne({ booking_id }).select("_id");
    if (existing) throw new AppError("Tracking has already started for this booking", 409, "ALREADY_EXISTS", { id: String(existing._id) });

    const initial = booking.booking_status === "Confirmed" ? S.CONFIRMED : S.ACCEPTED;
    let doc;
    try {
      doc = await ServiceCompletion.create({
        booking_id,
        provider_id: actor.providerId,
        customer_id: idOf(booking.customer_id),
        current_status: initial,
        status_history: [{ status: initial, changed_by: actor.userId, changed_by_role: actor.role, note: "Service tracking started" }]
      });
    } catch (err) {
      if (err?.code === 11000) throw new AppError("Tracking has already started for this booking", 409, "ALREADY_EXISTS");
      throw err;
    }

    await logAudit({
      actorId: actor.userId, actorRole: actor.role, action: "SERVICE_TRACKING_STARTED",
      resourceType: "ServiceCompletion", resourceId: doc._id, newState: { status: initial, booking_id: String(booking_id) },
      ipAddress: ctx.ip, userAgent: ctx.userAgent
    });
    return toDTO(await loadPopulated(doc._id), actor);
  }

  async function update(user, id, body, ctx = {}) {
    const actor = await resolveActor(user);
    if (actor.role === USER_ROLES.CUSTOMER) return confirmCompletion(actor, id, body, ctx);
    if (actor.role !== USER_ROLES.PROVIDER) throw new AppError("Only the assigned provider can update progress", 403, "FORBIDDEN");
    if (body.confirm_completion) throw new AppError("Only the customer can confirm completion", 403, "FORBIDDEN");
    return providerUpdate(actor, id, body, ctx);
  }

  async function providerUpdate(actor, id, body, ctx) {
    const current = await ServiceCompletion.findById(id).lean();
    if (!current) throw new AppError("Service completion record not found", 404, "COMPLETION_NOT_FOUND");
    if (idOf(current.provider_id) !== actor.providerId) throw new AppError("You do not have access to this record", 403, "FORBIDDEN");

    const from = current.current_status;
    const cfg = getConfig();
    const set = {};
    const update = {};
    const now = new Date();

    if (body.evidence_urls !== undefined) set.evidence_urls = body.evidence_urls;

    if (body.status !== undefined) {
      const to = body.status;
      if (to === from) throw new AppError(`Job is already ${from}`, 409, "INVALID_TRANSITION");
      if (!rules.canProviderTransition(from, to)) {
        throw new AppError(`Cannot change status from "${from}" to "${to}"`, 409, "INVALID_TRANSITION", {
          allowed: rules.allowedNextStatuses(from)
        });
      }
      const notes = body.notes ?? (to === S.COMPLETED ? current.completion_notes : null);
      if (to === S.COMPLETED && (!notes || notes.length < MIN_COMPLETION_NOTES)) {
        throw new AppError(`Completion notes are required (at least ${MIN_COMPLETION_NOTES} characters)`, 400, "NOTES_REQUIRED");
      }
      if (to === S.CANCELLED && (!body.notes || body.notes.length < MIN_CANCEL_REASON)) {
        throw new AppError("Please give a reason for cancelling", 400, "REASON_REQUIRED");
      }

      set.current_status = to;
      if (body.notes !== undefined) set.completion_notes = body.notes;
      if ((to === S.STARTED || to === S.IN_PROGRESS) && !current.start_datetime) set.start_datetime = now;
      if (to === S.COMPLETED) {
        if (!current.start_datetime) set.start_datetime = now;
        set.completion_datetime = now;
        set.review_eligibility = rules.reviewEligible(to, { requireCustomerConfirmation: cfg.requireCustomerConfirmation });
      }
      update.$push = {
        status_history: { status: to, changed_by: actor.userId, changed_by_role: actor.role, note: body.notes || null, changed_at: now }
      };
    } else {
      if (from === S.CANCELLED) throw new AppError("This job was cancelled and can no longer be edited", 409, "INVALID_TRANSITION");
      if (body.notes !== undefined) set.completion_notes = body.notes;
    }
    update.$set = set;

    // Conditional write: fails if someone changed the status since we read it.
    const saved = await ServiceCompletion.findOneAndUpdate({ _id: id, current_status: from }, update, { returnDocument: "after" }).lean();
    if (!saved) throw new AppError("This job was just updated elsewhere. Refresh and try again.", 409, "CONFLICT");

    if (body.status !== undefined) {
      const bookingStatus = rules.bookingStatusFor(body.status, { requireCustomerConfirmation: cfg.requireCustomerConfirmation });
      try {
        if (bookingStatus) {
          await bookings.setStatus(saved.booking_id, bookingStatus, { reason: body.notes || null, cancelledBy: actor.userId });
        }
      } catch (err) {
        // Keep the two records consistent: undo the completion change.
        await ServiceCompletion.findOneAndUpdate(
          { _id: id, current_status: body.status },
          { $set: { current_status: from, completion_datetime: current.completion_datetime || null, review_eligibility: !!current.review_eligibility }, $pop: { status_history: 1 } }
        );
        throw new AppError("Could not update the booking. No changes were saved.", 502, "BOOKING_SYNC_FAILED");
      }
      await afterStatusChange({ actor, saved, from, to: body.status, cfg, ctx });
    } else {
      await logAudit({
        actorId: actor.userId, actorRole: actor.role, action: "SERVICE_COMPLETION_DETAILS_UPDATED",
        resourceType: "ServiceCompletion", resourceId: id, ipAddress: ctx.ip, userAgent: ctx.userAgent
      });
    }
    return toDTO(await loadPopulated(id), actor);
  }

  async function afterStatusChange({ actor, saved, from, to, cfg, ctx }) {
    const customerUserId = await userIdOfCustomer(saved.customer_id);
    const ref = saved._id;
    const label = {
      [S.CONFIRMED]: "Your provider confirmed the job.",
      [S.ON_THE_WAY]: "Your provider is on the way.",
      [S.STARTED]: "Your provider has started the service.",
      [S.IN_PROGRESS]: "Your service is in progress.",
      [S.COMPLETED]: cfg.requireCustomerConfirmation
        ? "Your provider marked the service as completed. Please confirm completion."
        : "Your service has been completed.",
      [S.CANCELLED]: "Your provider cancelled this service."
    }[to];

    await notify({
      recipientId: customerUserId,
      eventType: to === S.COMPLETED ? N.SERVICE_COMPLETION : N.SCHEDULE_OR_SERVICE_UPDATE,
      relatedRecordId: ref,
      title: `Service ${to}`,
      message: label
    });
    if (saved.review_eligibility) {
      await notify({
        recipientId: customerUserId, eventType: N.REVIEW_REQUEST, relatedRecordId: saved.booking_id,
        title: "How was your service?", message: "Your service is complete. You can now rate your provider."
      });
    }
    await logAudit({
      actorId: actor.userId, actorRole: actor.role, action: "SERVICE_COMPLETION_STATUS_CHANGED",
      resourceType: "ServiceCompletion", resourceId: ref,
      previousState: { status: from }, newState: { status: to }, ipAddress: ctx.ip, userAgent: ctx.userAgent
    });
  }

  async function confirmCompletion(actor, id, body, ctx) {
    if (!body.confirm_completion) throw new AppError("Customers can only confirm completion", 403, "FORBIDDEN");
    const current = await ServiceCompletion.findById(id).lean();
    if (!current) throw new AppError("Service completion record not found", 404, "COMPLETION_NOT_FOUND");
    if (idOf(current.customer_id) !== actor.customerId) throw new AppError("You do not have access to this record", 403, "FORBIDDEN");
    if (current.current_status !== S.COMPLETED) {
      throw new AppError("The provider has not marked this service as completed yet", 409, "NOT_COMPLETED");
    }
    if (current.completion_confirmation) throw new AppError("Completion is already confirmed", 409, "ALREADY_CONFIRMED");

    const now = new Date();
    const saved = await ServiceCompletion.findOneAndUpdate(
      { _id: id, current_status: S.COMPLETED, completion_confirmation: { $ne: true } },
      {
        $set: { completion_confirmation: true, confirmed_by_customer_at: now, review_eligibility: true },
        $push: { status_history: { status: S.COMPLETED, changed_by: actor.userId, changed_by_role: actor.role, note: "Customer confirmed completion", changed_at: now } }
      },
      { returnDocument: "after" }
    ).lean();
    if (!saved) throw new AppError("Completion was just confirmed elsewhere.", 409, "CONFLICT");

    await bookings.setStatus(saved.booking_id, rules.bookingStatusFor(S.COMPLETED, { customerConfirmed: true }));
    const providerUserId = await userIdOfProvider(saved.provider_id);
    await notify({
      recipientId: providerUserId, eventType: N.SERVICE_COMPLETION, relatedRecordId: saved._id,
      title: "Completion confirmed", message: "The customer confirmed that the service was completed."
    });
    await logAudit({
      actorId: actor.userId, actorRole: actor.role, action: "SERVICE_COMPLETION_CONFIRMED_BY_CUSTOMER",
      resourceType: "ServiceCompletion", resourceId: id, previousState: { confirmed: false }, newState: { confirmed: true },
      ipAddress: ctx.ip, userAgent: ctx.userAgent
    });
    return toDTO(await loadPopulated(id), actor);
  }

  // Internal interface for the Dispute module (Developer 17). Not exposed over HTTP.
  async function markDisputed(bookingId, { actorId = null, actorRole = null, reason = null } = {}) {
    const current = await ServiceCompletion.findOne({ booking_id: bookingId }).lean();
    if (!current) return null;
    if (!rules.canDispute(current.current_status)) {
      throw new AppError(`A job that is "${current.current_status}" cannot be disputed`, 409, "INVALID_TRANSITION");
    }
    const saved = await ServiceCompletion.findOneAndUpdate(
      { _id: current._id, current_status: current.current_status },
      {
        $set: { current_status: S.DISPUTED, review_eligibility: false },
        $push: { status_history: { status: S.DISPUTED, changed_by: actorId, changed_by_role: actorRole, note: reason, changed_at: new Date() } }
      },
      { returnDocument: "after" }
    ).lean();
    if (!saved) throw new AppError("Job was just updated elsewhere.", 409, "CONFLICT");
    await bookings.setStatus(bookingId, rules.bookingStatusFor(S.DISPUTED));
    await logAudit({
      actorId, actorRole, action: "SERVICE_COMPLETION_DISPUTED", resourceType: "ServiceCompletion", resourceId: saved._id,
      previousState: { status: current.current_status }, newState: { status: S.DISPUTED }
    });
    return saved;
  }

  // ---- helpers --------------------------------------------------------------
  async function userIdOfCustomer(customerId) {
    const c = await Customer.findById(customerId).select("user_id").lean();
    return c?.user_id || null;
  }
  async function userIdOfProvider(providerId) {
    const p = await Provider.findById(providerId).select("user_id").lean();
    return p?.user_id || null;
  }

  return { list, getById, getByBooking, create, update, markDisputed, toDTO };
}

let defaultInstance;
const getDefaultService = () => (defaultInstance ||= createServiceCompletionService());

module.exports = { createServiceCompletionService, getDefaultService, MIN_COMPLETION_NOTES, MIN_CANCEL_REASON };
