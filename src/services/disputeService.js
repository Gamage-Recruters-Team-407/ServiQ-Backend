const {
  Dispute,
  DisputeEvidence,
  Booking,
  Customer,
  Provider,
  Payment,
  Earnings
} = require("../models");
const {
  DISPUTE_STATUSES,
  DISPUTE_RESOLUTION_OUTCOMES,
  USER_ROLES
} = require("../constants/enums");

/**
 * Custom error class for Dispute module operations
 */
class DisputeError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = "DisputeError";
    this.status = status;
  }
}

/**
 * Allowed status transitions for the dispute state machine (SRS FR-DSP-005)
 */
const ALLOWED_STATUS_TRANSITIONS = {
  [DISPUTE_STATUSES.SUBMITTED]: [
    DISPUTE_STATUSES.UNDER_REVIEW,
    DISPUTE_STATUSES.CLOSED
  ],
  [DISPUTE_STATUSES.UNDER_REVIEW]: [
    DISPUTE_STATUSES.IN_INVESTIGATION,
    DISPUTE_STATUSES.ESCALATED,
    DISPUTE_STATUSES.CLOSED
  ],
  [DISPUTE_STATUSES.IN_INVESTIGATION]: [
    DISPUTE_STATUSES.UNDER_REVIEW,
    DISPUTE_STATUSES.ESCALATED,
    DISPUTE_STATUSES.CLOSED
  ],
  [DISPUTE_STATUSES.ESCALATED]: [
    DISPUTE_STATUSES.IN_INVESTIGATION,
    DISPUTE_STATUSES.UNDER_REVIEW,
    DISPUTE_STATUSES.CLOSED
  ],
  [DISPUTE_STATUSES.RESOLVED]: [
    DISPUTE_STATUSES.CLOSED
  ],
  [DISPUTE_STATUSES.CLOSED]: []
};

/**
 * Helper to verify if a user is an authorized participant (Customer, Provider, or Admin) of a booking
 */
async function verifyBookingParticipation(bookingId, user) {
  const booking = await Booking.findById(bookingId).populate("customer_id provider_id");
  if (!booking) {
    throw new DisputeError("Booking not found", 404);
  }

  if (user && user.user_role === USER_ROLES.ADMIN) {
    return booking;
  }

  const userIdStr = (user?._id || user?.id)?.toString();
  const customerUserId = booking.customer_id?.user_id?.toString();
  const providerUserId = booking.provider_id?.user_id?.toString();

  const isParticipant =
    (customerUserId && customerUserId === userIdStr) ||
    (providerUserId && providerUserId === userIdStr);

  if (!isParticipant) {
    throw new DisputeError("You are not authorized to raise or access a dispute for this booking", 403);
  }

  return booking;
}

/**
 * 1. Create a new dispute for a booking (FR-DSP-001)
 */
async function createDispute({ bookingId, user, category, description, initialEvidence = [] }) {
  if (!user || !user._id) {
    throw new DisputeError("Authenticated user context is required", 401);
  }

  // 1. Verify user is a participant of the booking
  await verifyBookingParticipation(bookingId, user);

  // 2. Prevent duplicate active disputes for the same booking
  const existingActiveDispute = await Dispute.findOne({
    booking_id: bookingId,
    dispute_status: {
      $in: [
        DISPUTE_STATUSES.SUBMITTED,
        DISPUTE_STATUSES.UNDER_REVIEW,
        DISPUTE_STATUSES.IN_INVESTIGATION,
        DISPUTE_STATUSES.ESCALATED
      ]
    }
  });

  if (existingActiveDispute) {
    throw new DisputeError(
      `An active dispute (${existingActiveDispute.dispute_reference}) already exists for this booking`,
      409
    );
  }

  // 3. Find associated payment and earnings if available
  const [payment, earnings] = await Promise.all([
    Payment.findOne({ booking_id: bookingId }).select("_id").lean(),
    Earnings.findOne({ booking_id: bookingId }).select("_id").lean()
  ]);

  // 4. Create dispute record
  const dispute = new Dispute({
    booking_id: bookingId,
    raised_by: user._id,
    payment_id: payment ? payment._id : null,
    earnings_id: earnings ? earnings._id : null,
    dispute_category: category,
    description: description,
    dispute_status: DISPUTE_STATUSES.SUBMITTED
  });

  await dispute.save();

  // 5. Save initial evidence documents if provided
  let createdEvidence = [];
  if (Array.isArray(initialEvidence) && initialEvidence.length > 0) {
    const evidenceDocs = initialEvidence.map((item) => ({
      dispute_id: dispute._id,
      uploaded_by: user._id,
      evidence_type: item.evidence_type,
      evidence_reference: item.evidence_reference,
      file_name: item.file_name || null,
      file_size: item.file_size || null,
      mime_type: item.mime_type || null
    }));

    createdEvidence = await DisputeEvidence.insertMany(evidenceDocs);
  }

  const populatedDispute = await Dispute.findById(dispute._id)
    .populate("booking_id", "booking_reference booking_status total_amount currency")
    .populate("raised_by", "first_name last_name email user_role");

  return {
    dispute: populatedDispute,
    evidence: createdEvidence
  };
}

/**
 * 2. Get disputes with filtering and pagination
 */
async function getDisputes({ user, filters = {}, isAdmin = false }) {
  if (!user || !user._id) {
    throw new DisputeError("Authenticated user context is required", 401);
  }

  const query = {};

  // Role-based scoping
  if (!isAdmin && user.user_role !== USER_ROLES.ADMIN) {
    const userIdStr = user._id.toString();
    const [customer, provider] = await Promise.all([
      Customer.findOne({ user_id: user._id }).select("_id").lean(),
      Provider.findOne({ user_id: user._id }).select("_id").lean()
    ]);

    const bookingOrConditions = [];
    if (customer) bookingOrConditions.push({ customer_id: customer._id });
    if (provider) bookingOrConditions.push({ provider_id: provider._id });

    let userBookingIds = [];
    if (bookingOrConditions.length > 0) {
      const userBookings = await Booking.find({ $or: bookingOrConditions }).select("_id").lean();
      userBookingIds = userBookings.map((b) => b._id);
    }

    query.$or = [
      { raised_by: user._id },
      { booking_id: { $in: userBookingIds } }
    ];
  }

  // Filter conditions
  if (filters.status) {
    query.dispute_status = filters.status;
  }
  if (filters.category) {
    query.dispute_category = filters.category;
  }
  if (filters.search) {
    const searchRegex = new RegExp(filters.search.trim(), "i");
    query.$and = query.$and || [];
    query.$and.push({
      $or: [
        { dispute_reference: searchRegex },
        { description: searchRegex }
      ]
    });
  }

  const page = Math.max(1, parseInt(filters.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(filters.limit, 10) || 10));
  const skip = (page - 1) * limit;

  const [disputes, total] = await Promise.all([
    Dispute.find(query)
      .populate("booking_id", "booking_reference booking_status total_amount currency")
      .populate("raised_by", "first_name last_name email user_role")
      .populate("assigned_reviewer", "first_name last_name email")
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Dispute.countDocuments(query)
  ]);

  return {
    disputes,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1
    }
  };
}

/**
 * 3. Get single dispute details with attached evidence
 */
async function getDisputeById({ disputeId, user }) {
  if (!user || !user._id) {
    throw new DisputeError("Authenticated user context is required", 401);
  }

  const dispute = await Dispute.findById(disputeId)
    .populate({
      path: "booking_id",
      select: "booking_reference booking_status total_amount currency customer_id provider_id service_location",
      populate: [
        { path: "customer_id", select: "user_id profile_details" },
        { path: "provider_id", select: "user_id business_name" }
      ]
    })
    .populate("raised_by", "first_name last_name email user_role")
    .populate("assigned_reviewer", "first_name last_name email");

  if (!dispute) {
    throw new DisputeError("Dispute not found", 404);
  }

  // Ownership verification for non-admins
  if (user.user_role !== USER_ROLES.ADMIN) {
    const userIdStr = user._id.toString();
    const isRaiser = dispute.raised_by?._id?.toString() === userIdStr;
    const customerUserId = dispute.booking_id?.customer_id?.user_id?.toString();
    const providerUserId = dispute.booking_id?.provider_id?.user_id?.toString();

    if (!isRaiser && customerUserId !== userIdStr && providerUserId !== userIdStr) {
      throw new DisputeError("You are not authorized to view this dispute", 403);
    }
  }

  const evidence = await DisputeEvidence.find({ dispute_id: dispute._id })
    .populate("uploaded_by", "first_name last_name email user_role")
    .sort({ created_at: 1 })
    .lean();

  return {
    ...dispute.toObject(),
    evidence
  };
}

/**
 * 4. Add evidence to an existing open dispute
 */
async function addEvidence({ disputeId, user, evidenceData }) {
  if (!user || !user._id) {
    throw new DisputeError("Authenticated user context is required", 401);
  }

  const dispute = await Dispute.findById(disputeId).populate({
    path: "booking_id",
    populate: [{ path: "customer_id" }, { path: "provider_id" }]
  });

  if (!dispute) {
    throw new DisputeError("Dispute not found", 404);
  }

  // Disallow adding evidence if closed
  if (dispute.dispute_status === DISPUTE_STATUSES.CLOSED) {
    throw new DisputeError("Cannot add evidence to a closed dispute", 400);
  }

  // Authorization check
  if (user.user_role !== USER_ROLES.ADMIN) {
    const userIdStr = user._id.toString();
    const isRaiser = dispute.raised_by?.toString() === userIdStr;
    const customerUserId = dispute.booking_id?.customer_id?.user_id?.toString();
    const providerUserId = dispute.booking_id?.provider_id?.user_id?.toString();

    if (!isRaiser && customerUserId !== userIdStr && providerUserId !== userIdStr) {
      throw new DisputeError("You are not authorized to add evidence to this dispute", 403);
    }
  }

  const evidence = new DisputeEvidence({
    dispute_id: dispute._id,
    uploaded_by: user._id,
    evidence_type: evidenceData.evidence_type,
    evidence_reference: evidenceData.evidence_reference,
    file_name: evidenceData.file_name || null,
    file_size: evidenceData.file_size || null,
    mime_type: evidenceData.mime_type || null
  });

  await evidence.save();

  return DisputeEvidence.findById(evidence._id)
    .populate("uploaded_by", "first_name last_name email user_role")
    .lean();
}

/**
 * 5. Update dispute status (Admin workflow)
 */
async function updateDisputeStatus({ disputeId, adminUser, newStatus, assignedReviewer }) {
  if (!adminUser || adminUser.user_role !== USER_ROLES.ADMIN) {
    throw new DisputeError("Only administrators can update dispute statuses", 403);
  }

  const dispute = await Dispute.findById(disputeId);
  if (!dispute) {
    throw new DisputeError("Dispute not found", 404);
  }

  const currentStatus = dispute.dispute_status;

  // Validate allowed state transitions
  const allowedNext = ALLOWED_STATUS_TRANSITIONS[currentStatus] || [];
  if (!allowedNext.includes(newStatus)) {
    throw new DisputeError(
      `Cannot transition dispute status from "${currentStatus}" to "${newStatus}". Allowed transitions: ${allowedNext.join(", ") || "None"}`,
      422
    );
  }

  dispute.dispute_status = newStatus;
  if (assignedReviewer !== undefined) {
    dispute.assigned_reviewer = assignedReviewer;
  }

  await dispute.save();

  return Dispute.findById(dispute._id)
    .populate("booking_id", "booking_reference booking_status")
    .populate("raised_by", "first_name last_name email user_role")
    .populate("assigned_reviewer", "first_name last_name email");
}

/**
 * 6. Resolve dispute with outcome and notes (Admin workflow)
 */
async function resolveDispute({ disputeId, adminUser, outcome, notes }) {
  if (!adminUser || adminUser.user_role !== USER_ROLES.ADMIN) {
    throw new DisputeError("Only administrators can resolve disputes", 403);
  }

  const dispute = await Dispute.findById(disputeId);
  if (!dispute) {
    throw new DisputeError("Dispute not found", 404);
  }

  if (
    dispute.dispute_status === DISPUTE_STATUSES.RESOLVED ||
    dispute.dispute_status === DISPUTE_STATUSES.CLOSED
  ) {
    throw new DisputeError("This dispute has already been resolved or closed", 400);
  }

  dispute.dispute_status = DISPUTE_STATUSES.RESOLVED;
  dispute.resolution_outcome = outcome;
  dispute.resolution_notes = notes;
  dispute.resolved_at = new Date();

  if (!dispute.assigned_reviewer) {
    dispute.assigned_reviewer = adminUser._id;
  }

  await dispute.save();

  return Dispute.findById(dispute._id)
    .populate("booking_id", "booking_reference booking_status total_amount currency")
    .populate("raised_by", "first_name last_name email user_role")
    .populate("assigned_reviewer", "first_name last_name email");
}

module.exports = {
  DisputeError,
  ALLOWED_STATUS_TRANSITIONS,
  createDispute,
  getDisputes,
  getDisputeById,
  addEvidence,
  updateDisputeStatus,
  resolveDispute
};
