const Booking = require("../models/Booking");
const Payment = require("../models/Payment");
const Commission = require("../models/Commission");
const ServiceCompletion = require("../models/ServiceCompletion");

// Read-only default readers. Replace with the owning modules' service interfaces once agreed.
const defaultSources = {
  getBooking: (bookingId) => Booking.findById(bookingId).lean(),
  getPayment: (paymentId) => Payment.findById(paymentId).lean(),
  getCommissionByPayment: (paymentId) => Commission.findOne({ payment_id: paymentId }).lean(),
  getServiceCompletion: (bookingId) => ServiceCompletion.findOne({ booking_id: bookingId }).lean()
};

module.exports = { defaultSources };
