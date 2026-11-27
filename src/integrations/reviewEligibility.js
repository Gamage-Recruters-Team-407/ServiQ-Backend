
const {
  BOOKING_STATUSES,
  CUSTOMER_STATUSES,
  SERVICE_COMPLETION_STATUSES
} = require("../constants/enums");

const OBJECT_ID_PATTERN = /^[0-9a-f]{24}$/i;

class ReviewEligibilityError extends Error {
  constructor(message, status = 403) {
    super(message);
    this.name = "ReviewEligibilityError";
    this.status = status;
  }
}

function toId(value) {
  if (value == null) return null;

  const raw = typeof value === "object" && value._id != null
    ? value._id
    : value;

  const id = String(raw);

  return OBJECT_ID_PATTERN.test(id)
    ? id.toLowerCase()
    : null;
}

function createReviewEligibility({
  getCustomerByUserId,
  getBookingById,
  getCompletionByBookingId,
  getReviewByBookingId
} = {}) {
  const dependencies = [
    getCustomerByUserId,
    getBookingById,
    getCompletionByBookingId,
    getReviewByBookingId
  ];

  if (
    dependencies.some(
      (dependency) => typeof dependency !== "function"
    )
  ) {
    throw new TypeError(
      "All review eligibility lookup functions are required"
    );
  }

  return async function checkReviewEligibility({
    userId,
    bookingId
  } = {}) {
    const authenticatedUserId = toId(userId);
    const requestedBookingId = toId(bookingId);

    if (!authenticatedUserId) {
      throw new ReviewEligibilityError(
        "Authentication is required",
        401
      );
    }

    if (!requestedBookingId) {
      throw new ReviewEligibilityError(
        "Invalid booking ID",
        400
      );
    }

    const customer = await getCustomerByUserId(
      authenticatedUserId
    );

    const customerId = toId(customer?._id);

    if (
      !customerId ||
      customer.account_status !== CUSTOMER_STATUSES.ACTIVE
    ) {
      throw new ReviewEligibilityError(
        "Active customer profile required",
        403
      );
    }

    const booking = await getBookingById(
      requestedBookingId
    );

    if (
      !booking ||
      toId(booking.customer_id) !== customerId
    ) {
      throw new ReviewEligibilityError(
        "Booking not found",
        404
      );
    }

    const providerId = toId(booking.provider_id);
    const serviceId = toId(booking.service_id);

    if (!providerId || !serviceId) {
      throw new ReviewEligibilityError(
        "Booking information is unavailable",
        503
      );
    }

    if (
      booking.booking_status !== BOOKING_STATUSES.COMPLETED
    ) {
      throw new ReviewEligibilityError(
        "Booking has not been completed",
        403
      );
    }

    const completion = await getCompletionByBookingId(
      requestedBookingId
    );

    if (
      !completion ||
      toId(completion.booking_id) !== requestedBookingId ||
      completion.current_status !==
        SERVICE_COMPLETION_STATUSES.COMPLETED ||
      completion.review_eligibility !== true ||
      (
        completion.customer_id != null &&
        toId(completion.customer_id) !== customerId
      ) ||
      (
        completion.provider_id != null &&
        toId(completion.provider_id) !== providerId
      )
    ) {
      throw new ReviewEligibilityError(
        "Service is not eligible for review",
        403
      );
    }

    const existingReview = await getReviewByBookingId(
      requestedBookingId
    );

    if (existingReview != null) {
      throw new ReviewEligibilityError(
        "A review already exists for this booking",
        409
      );
    }

    return {
      bookingId: requestedBookingId,
      customerId,
      providerId,
      serviceId
    };
  };
}

module.exports = {
  ReviewEligibilityError,
  createReviewEligibility
};
