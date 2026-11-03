const { Booking, Payment, Schedule, AuditLog } = require("../models");
const { BOOKING_STATUSES, AUDIT_EVENT_TYPES, AUDIT_OUTCOMES } = require("../constants/enums");

// ─── Helper: create audit log ──────────────────────────────────────────────
const createAuditLog = async ({ actorId, actorRole, action, resourceId, outcome, previousState, newState, req }) => {
  try {
    await AuditLog.create({
      actor_id: actorId,
      actor_role: actorRole,
      event_type: AUDIT_EVENT_TYPES.ADMINISTRATIVE_AUDIT,
      action,
      resource_type: "Booking",
      resource_id: resourceId,
      outcome,
      previous_state: previousState,
      new_state: newState,
      ip_address: req.ip || null,
      user_agent: req.headers["user-agent"] || null
    });
  } catch (err) {
    console.error("Audit log error:", err.message);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/bookings
// Query: status, paymentStatus, search, startDate, endDate, page, limit
// ─────────────────────────────────────────────────────────────────────────────
const getAllBookings = async (req, res) => {
  try {
    const {
      status,
      paymentStatus,
      search,
      startDate,
      endDate,
      page = 1,
      limit = 20,
      sortBy = "requested_at",
      sortOrder = "desc"
    } = req.query;

    // Build booking filter
    const filter = {};
    if (status) {
      const valid = Object.values(BOOKING_STATUSES);
      if (!valid.includes(status)) {
        return res.status(400).json({ success: false, message: `Invalid status. Valid: ${valid.join(", ")}` });
      }
      filter.booking_status = status;
    }
    if (startDate || endDate) {
      filter.requested_at = {};
      if (startDate) filter.requested_at.$gte = new Date(startDate);
      if (endDate)   filter.requested_at.$lte = new Date(endDate);
    }

    const pageNum  = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const sortDir  = sortOrder === "asc" ? 1 : -1;

    // Fetch bookings with populated refs
    let bookings = await Booking.find(filter)
      .populate({ path: "customer_id", populate: { path: "user_id", select: "first_name last_name email phone_number" } })
      .populate({ path: "provider_id", populate: { path: "user_id", select: "first_name last_name email phone_number" } })
      .populate("service_id", "service_name pricing_type base_price")
      .sort({ [sortBy]: sortDir })
      .lean();

    // Attach payment + schedule for each booking
    const bookingIds = bookings.map(b => b._id);

    const [payments, schedules] = await Promise.all([
      Payment.find({ booking_id: { $in: bookingIds } })
        .select("booking_id payment_status amount currency payment_method")
        .lean(),
      Schedule.find({ booking_id: { $in: bookingIds } })
        .sort({ scheduled_start: 1 })
        .select("booking_id scheduled_start scheduled_end duration_minutes schedule_status")
        .lean()
    ]);

    // Map payments and schedules by booking_id
    const paymentMap  = {};
    const scheduleMap = {};
    payments.forEach(p  => { paymentMap[p.booking_id.toString()]  = p; });
    schedules.forEach(s => { scheduleMap[s.booking_id.toString()] = s; });

    bookings = bookings.map(b => ({
      ...b,
      payment:  paymentMap[b._id.toString()]  || null,
      schedule: scheduleMap[b._id.toString()] || null
    }));

    // In-memory: filter by payment status
    if (paymentStatus) {
      bookings = bookings.filter(b => b.payment?.payment_status === paymentStatus);
    }

    // In-memory: search by ref, customer name, provider name
    if (search) {
      const term = search.toLowerCase();
      bookings = bookings.filter(b => {
        const cName = `${b.customer_id?.user_id?.first_name || ""} ${b.customer_id?.user_id?.last_name || ""}`.toLowerCase();
        const pName = `${b.provider_id?.user_id?.first_name || ""} ${b.provider_id?.user_id?.last_name || ""}`.toLowerCase();
        const ref   = (b.booking_reference || "").toLowerCase();
        return cName.includes(term) || pName.includes(term) || ref.includes(term);
      });
    }

    const total     = bookings.length;
    const paginated = bookings.slice((pageNum - 1) * limitNum, pageNum * limitNum);

    return res.status(200).json({
      success: true,
      data: {
        bookings: paginated,
        pagination: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) }
      }
    });
  } catch (error) {
    console.error("getAllBookings error:", error);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};


// GET /api/admin/bookings/:id  – full detail with payment + schedule

const getBookingById = async (req, res) => {
  try {
    const { id } = req.params;

    const booking = await Booking.findById(id)
      .populate({ path: "customer_id", populate: { path: "user_id", select: "first_name last_name email phone_number profile_image" } })
      .populate({ path: "provider_id", populate: { path: "user_id", select: "first_name last_name email phone_number profile_image" } })
      .populate("service_id", "service_name description pricing_type base_price currency")
      .populate("cancelled_by", "first_name last_name email user_role")
      .lean();

    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found." });
    }

    // Fetch related payment + schedule
    const [payment, schedule] = await Promise.all([
      Payment.findOne({ booking_id: id }).lean(),
      Schedule.findOne({ booking_id: id }).sort({ scheduled_start: 1 }).lean()
    ]);

    return res.status(200).json({
      success: true,
      data: { booking: { ...booking, payment: payment || null, schedule: schedule || null } }
    });
  } catch (error) {
    console.error("getBookingById error:", error);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/admin/bookings/:id/status
// Body: { status, reason }
// ─────────────────────────────────────────────────────────────────────────────
const updateBookingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;

    const validStatuses = Object.values(BOOKING_STATUSES);
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: `Invalid status. Valid: ${validStatuses.join(", ")}` });
    }

    const booking = await Booking.findById(id);
    if (!booking) return res.status(404).json({ success: false, message: "Booking not found." });

    const previousStatus = booking.booking_status;
    booking.booking_status = status;
    if (status === BOOKING_STATUSES.CANCELLED) {
      booking.cancellation_reason = reason || "Cancelled by Administrator";
      booking.cancelled_by        = req.user?._id || null;
    }
    await booking.save();

    await createAuditLog({
      actorId: req.user?._id || null,
      actorRole: req.user?.user_role || "Administrator",
      action: "ADMIN_BOOKING_STATUS_UPDATE",
      resourceId: booking._id.toString(),
      outcome: AUDIT_OUTCOMES.SUCCESS,
      previousState: { booking_status: previousStatus },
      newState: { booking_status: status, reason: reason || null },
      req
    });

    return res.status(200).json({
      success: true,
      message: `Booking status updated to "${status}".`,
      data: { bookingId: booking._id, booking_reference: booking.booking_reference, previousStatus, currentStatus: status }
    });
  } catch (error) {
    console.error("updateBookingStatus error:", error);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/dashboard/summary  – stat counts + recent 5 bookings
// ─────────────────────────────────────────────────────────────────────────────
const getDashboardSummary = async (req, res) => {
  try {
    const [total, requested, accepted, confirmed, inProgress, completed, cancelled, disputed] = await Promise.all([
      Booking.countDocuments(),
      Booking.countDocuments({ booking_status: BOOKING_STATUSES.REQUESTED }),
      Booking.countDocuments({ booking_status: BOOKING_STATUSES.ACCEPTED }),
      Booking.countDocuments({ booking_status: BOOKING_STATUSES.CONFIRMED }),
      Booking.countDocuments({ booking_status: BOOKING_STATUSES.IN_PROGRESS }),
      Booking.countDocuments({ booking_status: BOOKING_STATUSES.COMPLETED }),
      Booking.countDocuments({ booking_status: BOOKING_STATUSES.CANCELLED }),
      Booking.countDocuments({ booking_status: BOOKING_STATUSES.DISPUTED })
    ]);

    const recentBookings = await Booking.find()
      .sort({ requested_at: -1 })
      .limit(5)
      .populate({ path: "customer_id", populate: { path: "user_id", select: "first_name last_name email" } })
      .populate({ path: "provider_id", populate: { path: "user_id", select: "first_name last_name" } })
      .populate("service_id", "service_name")
      .lean();

    return res.status(200).json({
      success: true,
      data: {
        bookingStats: { total, requested, accepted, confirmed, inProgress, completed, cancelled, disputed },
        recentBookings
      }
    });
  } catch (error) {
    console.error("getDashboardSummary error:", error);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};

module.exports = { getAllBookings, getBookingById, updateBookingStatus, getDashboardSummary };
