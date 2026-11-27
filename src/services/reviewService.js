
const {
  CUSTOMER_STATUSES,
  REVIEW_STATUSES,
  REVIEW_MODERATION_STATUSES
} = require("../constants/enums");

const {
  validateCreateReview
} = require("../validations/reviewValidation");

const OBJECT_ID_PATTERN = /^[0-9a-f]{24}$/i;
const MAX_PAGE_SIZE = 50;

class ReviewServiceError extends Error {
  constructor(message, status = 400, errors = undefined) {
    super(message);
    this.name = "ReviewServiceError";
    this.status = status;

    if (errors) {
      this.errors = errors;
    }
  }
}

function toId(value) {
  if (value == null) return null;

  const id = String(value);

  return OBJECT_ID_PATTERN.test(id)
    ? id.toLowerCase()
    : null;
}

function parsePagination({ page = 1, limit = 10 } = {}) {
  const currentPage = Number(page);
  const pageSize = Number(limit);

  if (
    !Number.isSafeInteger(currentPage) ||
    currentPage < 1 ||
    !Number.isSafeInteger(pageSize) ||
    pageSize < 1 ||
    pageSize > MAX_PAGE_SIZE ||
    !Number.isSafeInteger((currentPage - 1) * pageSize)
  ) {
    throw new ReviewServiceError(
      "Invalid pagination parameters",
      400
    );
  }

  return {
    page: currentPage,
    limit: pageSize,
    skip: (currentPage - 1) * pageSize
  };
}

function asObject(document) {
  return typeof document?.toObject === "function"
    ? document.toObject()
    : document;
}

function ownReviewView(document) {
  const review = asObject(document);

  return {
    id: String(review._id),
    bookingId: String(review.booking_id),
    providerId: String(review.provider_id),
    serviceId: String(review.service_id),
    rating: review.rating_value,
    text: review.review_text ?? null,
    status: review.review_status,
    moderationStatus: review.moderation_status,
    submittedAt: review.submitted_at
  };
}

function publicReviewView(document) {
  const review = asObject(document);

  return {
    id: String(review._id),
    providerId: String(review.provider_id),
    serviceId: String(review.service_id),
    rating: review.rating_value,
    text: review.review_text ?? null,
    submittedAt: review.submitted_at
  };
}

function createReviewService({
  ReviewModel,
  checkReviewEligibility,
  getCustomerByUserId
} = {}) {
  if (
    !ReviewModel ||
    typeof ReviewModel.create !== "function" ||
    typeof ReviewModel.find !== "function" ||
    typeof ReviewModel.countDocuments !== "function" ||
    typeof checkReviewEligibility !== "function" ||
    typeof getCustomerByUserId !== "function"
  ) {
    throw new TypeError(
      "Review model and approved lookup functions are required"
    );
  }

  async function submitReview({ userId, payload } = {}) {
    const validation = validateCreateReview(payload);

    if (!validation.success) {
      const errors = validation.error.issues.map(
        (issue) => ({
          field: issue.path.join(".") || "body",
          message: issue.message
        })
      );

      throw new ReviewServiceError(
        "Validation failed",
        400,
        errors
      );
    }

    const eligibility = await checkReviewEligibility({
      userId,
      bookingId: validation.data.booking_id
    });

    if (
      !toId(eligibility?.bookingId) ||
      !toId(eligibility?.customerId) ||
      !toId(eligibility?.providerId) ||
      !toId(eligibility?.serviceId)
    ) {
      throw new ReviewServiceError(
        "Review eligibility data is unavailable",
        503
      );
    }

    try {
      const created = await ReviewModel.create({
        booking_id: eligibility.bookingId,
        customer_id: eligibility.customerId,
        provider_id: eligibility.providerId,
        service_id: eligibility.serviceId,
        rating_value: validation.data.rating_value,
        review_text: validation.data.review_text,
        review_status: REVIEW_STATUSES.SUBMITTED,
        moderation_status: REVIEW_MODERATION_STATUSES.PENDING
      });

      return ownReviewView(created);
    } catch (error) {
      if (error?.code === 11000) {
        throw new ReviewServiceError(
          "A review already exists for this booking",
          409
        );
      }

      throw error;
    }
  }

  async function getMyReviews({
    userId,
    page = 1,
    limit = 10
  } = {}) {
    const authenticatedUserId = toId(userId);

    if (!authenticatedUserId) {
      throw new ReviewServiceError(
        "Authentication is required",
        401
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
      throw new ReviewServiceError(
        "Active customer profile required",
        403
      );
    }

    const pagination = parsePagination({
      page,
      limit
    });

    const filter = {
      customer_id: customerId
    };

    const [records, total] = await Promise.all([
      ReviewModel.find(filter)
        .sort({ submitted_at: -1, _id: -1 })
        .skip(pagination.skip)
        .limit(pagination.limit)
        .lean(),

      ReviewModel.countDocuments(filter)
    ]);

    return {
      reviews: records.map(ownReviewView),
      total,
      page: pagination.page,
      limit: pagination.limit
    };
  }

  async function getPublishedReviews({
    providerId,
    page = 1,
    limit = 10
  } = {}) {
    const requestedProviderId = toId(providerId);

    if (!requestedProviderId) {
      throw new ReviewServiceError(
        "Invalid provider ID",
        400
      );
    }

    const pagination = parsePagination({
      page,
      limit
    });

    const filter = {
      provider_id: requestedProviderId,
      review_status: REVIEW_STATUSES.PUBLISHED,
      moderation_status: REVIEW_MODERATION_STATUSES.APPROVED
    };

    const [records, total] = await Promise.all([
      ReviewModel.find(filter)
        .select(
          "_id provider_id service_id rating_value review_text submitted_at"
        )
        .sort({ submitted_at: -1, _id: -1 })
        .skip(pagination.skip)
        .limit(pagination.limit)
        .lean(),

      ReviewModel.countDocuments(filter)
    ]);

    return {
      reviews: records.map(publicReviewView),
      total,
      page: pagination.page,
      limit: pagination.limit
    };
  }

  return {
    submitReview,
    getMyReviews,
    getPublishedReviews
  };
}

module.exports = {
  ReviewServiceError,
  createReviewService
};
