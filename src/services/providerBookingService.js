const mongoose = require("mongoose");

const ownerAdapter = require("../integrations/providerBookingOwnerAdapter");
const { BOOKING_STATUSES } = require("../constants/enums");

class ProviderBookingError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

function idOf(value) {
  return value == null ? null : String(value._id ?? value);
}

function presentBooking(booking) {
  const customer = booking.customer_id;
  const customerUser = customer?.user_id;
  const service = booking.service_id;

  return {
    id: idOf(booking),
    booking_reference: booking.booking_reference,
    booking_status: booking.booking_status,
    requested_at: booking.requested_at,
    created_at: booking.created_at,
    updated_at: booking.updated_at,
    service_location: booking.service_location || null,
    service_requirements: booking.service_requirements || null,
    total_amount: booking.total_amount,
    currency: booking.currency,
    rejection_reason: booking.rejection_reason || null,
    cancellation_reason: booking.cancellation_reason || null,
    customer: customer
      ? {
          id: idOf(customer),
          name: [customerUser?.first_name, customerUser?.last_name]
            .filter(Boolean)
            .join(" ") || null,
          email: customerUser?.email || null,
          profile: customer.profile_details || null
        }
      : null,
    service: service
      ? {
          id: idOf(service),
          name: service.name,
          description: service.description,
          price: service.price || null,
          duration_minutes: service.duration_minutes
        }
      : null
  };
}

function assertObjectId(value, fieldName) {
  if (!mongoose.isObjectIdOrHexString(value)) {
    throw new ProviderBookingError(400, `Invalid ${fieldName}`);
  }
}

function createProviderBookingService(adapter = ownerAdapter) {
  async function providerForUser(user) {
    const provider = await adapter.getProviderByUserId(user._id);

    if (!provider) {
      throw new ProviderBookingError(404, "Provider profile not found");
    }

    return provider;
  }

  async function list(user) {
    const provider = await providerForUser(user);
    const bookings = await adapter.listProviderBookings(provider._id);

    return bookings.map(presentBooking);
  }

  async function getById(user, bookingId) {
    assertObjectId(bookingId, "booking ID");

    const provider = await providerForUser(user);
    const booking = await adapter.getProviderBooking(provider._id, bookingId);

    if (!booking) {
      throw new ProviderBookingError(404, "Booking not found");
    }

    return presentBooking(booking);
  }

  async function transition(user, bookingId, nextStatus, rejectionReason = null) {
    assertObjectId(bookingId, "booking ID");

    const provider = await providerForUser(user);
    const current = await adapter.getProviderBooking(provider._id, bookingId);

    if (!current) {
      throw new ProviderBookingError(404, "Booking not found");
    }

    if (current.booking_status !== BOOKING_STATUSES.REQUESTED) {
      throw new ProviderBookingError(
        409,
        `Booking cannot be ${nextStatus.toLowerCase()} from its current status`
      );
    }

    const updated = await adapter.transitionProviderBooking(
      provider._id,
      bookingId,
      nextStatus,
      rejectionReason
    );

    if (!updated) {
      throw new ProviderBookingError(
        409,
        "Booking was already changed or is no longer awaiting provider action"
      );
    }

    if (typeof adapter.notifyCustomerForBooking === "function") {
      await adapter.notifyCustomerForBooking(updated, nextStatus);
    }

    return presentBooking(updated);
  }

  return {
    list,
    getById,
    accept: (user, bookingId) =>
      transition(user, bookingId, BOOKING_STATUSES.ACCEPTED),
    reject: (user, bookingId, reason) =>
      transition(user, bookingId, BOOKING_STATUSES.REJECTED, reason)
  };
}

const defaultService = createProviderBookingService();

module.exports = {
  ProviderBookingError,
  createProviderBookingService,
  presentBooking,
  ...defaultService
};
