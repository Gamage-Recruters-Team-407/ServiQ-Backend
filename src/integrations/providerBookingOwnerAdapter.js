const Booking = require("../models/Booking");
const Customer = require("../models/Customer");
const Notification = require("../models/Notification");
const Provider = require("../models/Provider");

const {
  BOOKING_STATUSES,
  NOTIFICATION_CHANNELS,
  NOTIFICATION_EVENT_TYPES,
  NOTIFICATION_STATUSES
} = require("../constants/enums");

const customerPopulate = {
  path: "customer_id",
  select: "user_id profile_details",
  populate: {
    path: "user_id",
    select: "first_name last_name email"
  }
};

const servicePopulate = {
  path: "service_id",
  select: "name description price duration_minutes"
};

function withBookingDetails(query) {
  return query
    .populate(customerPopulate)
    .populate(servicePopulate)
    .lean();
}

const providerBookingOwnerAdapter = {
  getProviderByUserId(userId) {
    return Provider.findOne({ user_id: userId }).lean();
  },

  listProviderBookings(providerId) {
    return withBookingDetails(
      Booking.find({ provider_id: providerId }).sort({ requested_at: -1 })
    );
  },

  getProviderBooking(providerId, bookingId) {
    return withBookingDetails(
      Booking.findOne({ _id: bookingId, provider_id: providerId })
    );
  },

  transitionProviderBooking(providerId, bookingId, nextStatus, rejectionReason) {
    const changes = { booking_status: nextStatus };

    if (nextStatus === BOOKING_STATUSES.REJECTED) {
      changes.rejection_reason = rejectionReason || null;
    }

    return withBookingDetails(
      Booking.findOneAndUpdate(
        {
          _id: bookingId,
          provider_id: providerId,
          booking_status: BOOKING_STATUSES.REQUESTED
        },
        { $set: changes },
        { new: true, runValidators: true }
      )
    );
  },

  async notifyCustomerForBooking(booking, nextStatus) {
    const customerId = booking.customer_id?._id || booking.customer_id;
    const customer = await Customer.findById(customerId)
      .select("user_id")
      .lean();

    if (!customer?.user_id) return null;

    const accepted = nextStatus === BOOKING_STATUSES.ACCEPTED;
    const statusLabel = accepted ? "accepted" : "rejected";

    return Notification.create({
      recipient_id: customer.user_id,
      event_type: NOTIFICATION_EVENT_TYPES.BOOKING_ACCEPTANCE_OR_REJECTION,
      related_record_id: String(booking._id),
      channel: NOTIFICATION_CHANNELS.IN_APP,
      title: `Booking ${statusLabel}`,
      message: `Your booking ${booking.booking_reference} has been ${statusLabel} by the provider.`,
      message_reference: `booking:${booking._id}:${statusLabel}`,
      notification_status: NOTIFICATION_STATUSES.SUBMITTED
    });
  }
};

module.exports = providerBookingOwnerAdapter;
