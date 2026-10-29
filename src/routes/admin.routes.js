const express = require("express");
const router  = express.Router();

const {
  getAllBookings,
  getBookingById,
  updateBookingStatus,
  getDashboardSummary
} = require("../controllers/adminBooking.controller");

// ── NOTE FOR TEAM ────────────────────────────────────────────────────────────
// Authentication middleware (verifyToken + requireAdmin) will be wired here
// by Developer 01 once the shared auth module is ready. Example:
//
//   const { verifyToken, requireAdmin } = require("../middlewares/auth.middleware");
//   router.use(verifyToken, requireAdmin);
//
// ─────────────────────────────────────────────────────────────────────────────

// Dashboard summary (Dev 21 – Marketplace Administration)
router.get("/dashboard/summary", getDashboardSummary);

// Booking management (Dev 21)
router.get("/bookings",              getAllBookings);
router.get("/bookings/:id",          getBookingById);
router.patch("/bookings/:id/status", updateBookingStatus);

module.exports = router;
