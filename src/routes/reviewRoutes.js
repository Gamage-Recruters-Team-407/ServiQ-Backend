
const express = require("express");

/**
 * Developer 13 — Customer Ratings & Reviews routes.
 *
 * Mount this router at /api/reviews once the team authentication
 * and customer-authorization middleware are available.
 *
 * Both security middleware functions must come from the team's
 * trusted authentication/authorization implementation.
 */
function createReviewRoutes({
  reviewController,
  authenticate,
  authorizeCustomer
} = {}) {
  const requiredHandlers = {
    submitReview: reviewController?.submitReview,
    getMyReviews: reviewController?.getMyReviews,
    getPublishedReviews: reviewController?.getPublishedReviews,
    getProviderRatingSummary: reviewController?.getProviderRatingSummary,
    authenticate,
    authorizeCustomer
  };

  for (const [name, handler] of Object.entries(requiredHandlers)) {
    if (typeof handler !== "function") {
      throw new TypeError(`Review routes require a ${name} function`);
    }
  }

  const router = express.Router();

  // Only authenticated customers can submit reviews or see their own.
  // The controller reads the user ID from req.user, never from req.body.
  router.post(
    "/",
    authenticate,
    authorizeCustomer,
    reviewController.submitReview
  );

  router.get(
    "/me",
    authenticate,
    authorizeCustomer,
    reviewController.getMyReviews
  );

  // Public endpoints expose only published + approved reviews.
  // These handlers must not return customer IDs or booking IDs.
  router.get(
    "/providers/:providerId/summary",
    reviewController.getProviderRatingSummary
  );

  router.get(
    "/providers/:providerId",
    reviewController.getPublishedReviews
  );

  return router;
}

module.exports = { createReviewRoutes };
