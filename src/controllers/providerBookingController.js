const mongoose = require("mongoose");
const {
  ProviderBookingError,
  list,
  getById,
  accept,
  reject
} = require("../services/providerBookingService");

function errorResponse(res, error) {
  const status = error instanceof ProviderBookingError
    ? error.statusCode
    : error.name === "CastError" || error.name === "ValidationError"
      ? 400
      : 500;

  if (status === 500) {
    console.error("Provider Booking:", error);
  }

  return res.status(status).json({
    success: false,
    message: status === 500 ? "Internal server error" : error.message
  });
}

function validBookingId(req, res) {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) {
    res.status(400).json({
      success: false,
      message: "Invalid booking ID"
    });
    return false;
  }

  return true;
}

async function listBookings(req, res) {
  try {
    const bookings = await list(req.user);
    return res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings
    });
  } catch (error) {
    return errorResponse(res, error);
  }
}

async function getBooking(req, res) {
  if (!validBookingId(req, res)) return;

  try {
    const booking = await getById(req.user, req.params.id);
    return res.status(200).json({ success: true, data: booking });
  } catch (error) {
    return errorResponse(res, error);
  }
}

async function acceptBooking(req, res) {
  if (!validBookingId(req, res)) return;

  try {
    const booking = await accept(req.user, req.params.id);
    return res.status(200).json({
      success: true,
      message: "Booking accepted",
      data: booking
    });
  } catch (error) {
    return errorResponse(res, error);
  }
}

async function rejectBooking(req, res) {
  if (!validBookingId(req, res)) return;

  const reason = req.body?.reason == null ? null : String(req.body.reason).trim();

  if (reason && reason.length > 500) {
    return res.status(400).json({
      success: false,
      message: "Rejection reason must be 500 characters or fewer"
    });
  }

  try {
    const booking = await reject(req.user, req.params.id, reason);
    return res.status(200).json({
      success: true,
      message: "Booking rejected",
      data: booking
    });
  } catch (error) {
    return errorResponse(res, error);
  }
}

module.exports = {
  list: listBookings,
  getById: getBooking,
  accept: acceptBooking,
  reject: rejectBooking
};
