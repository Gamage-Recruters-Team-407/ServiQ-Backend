
function defaultGetAuthenticatedUserId(req) {
  return req.user?._id ?? req.user?.id ?? req.user?.userId ?? null;
}

function createReviewController({
  reviewService,
  ratingService,
  getAuthenticatedUserId = defaultGetAuthenticatedUserId
} = {}) {
  if (
    typeof reviewService?.submitReview !== "function" ||
    typeof reviewService?.getMyReviews !== "function" ||
    typeof reviewService?.getPublishedReviews !== "function" ||
    typeof ratingService?.getProviderRatingSummary !== "function" ||
    typeof getAuthenticatedUserId !== "function"
  ) {
    throw new TypeError(
      "Review services and authenticated user resolver are required"
    );
  }

  function sendError(error, res, next) {
    const knownError = [
      "ReviewServiceError",
      "ReviewEligibilityError",
      "ReviewRatingError"
    ].includes(error?.name);

    if (!knownError) {
      return next(error);
    }

    const status = Number.isInteger(error.status) &&
      error.status >= 400 && error.status <= 599
      ? error.status
      : 500;

    const response = {
      success: false,
      message: error.message
    };

    if (Array.isArray(error.errors)) {
      response.errors = error.errors;
    }

    return res.status(status).json(response);
  }

  function requireUserId(req, res) {
    const userId = getAuthenticatedUserId(req);

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Authentication is required"
      });

      return null;
    }

    return userId;
  }

  async function submitReview(req, res, next) {
    const userId = requireUserId(req, res);

    if (!userId) return;

    try {
      const review = await reviewService.submitReview({
        userId,
        payload: req.body
      });

      return res.status(201).json({
        success: true,
        message: "Review submitted for moderation",
        data: review
      });
    } catch (error) {
      return sendError(error, res, next);
    }
  }

  async function getMyReviews(req, res, next) {
    const userId = requireUserId(req, res);

    if (!userId) return;

    try {
      const result = await reviewService.getMyReviews({
        userId,
        page: req.query.page,
        limit: req.query.limit
      });

      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      return sendError(error, res, next);
    }
  }

  async function getPublishedReviews(req, res, next) {
    try {
      const result = await reviewService.getPublishedReviews({
        providerId: req.params.providerId,
        page: req.query.page,
        limit: req.query.limit
      });

      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      return sendError(error, res, next);
    }
  }

  async function getProviderRatingSummary(req, res, next) {
    try {
      const summary = await ratingService.getProviderRatingSummary(
        req.params.providerId
      );

      return res.status(200).json({
        success: true,
        data: summary
      });
    } catch (error) {
      return sendError(error, res, next);
    }
  }

  return {
    submitReview,
    getMyReviews,
    getPublishedReviews,
    getProviderRatingSummary
  };
}

module.exports = {
  createReviewController
};
