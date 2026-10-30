const { z } = require("zod");
const { REVIEW_STATUSES, REVIEW_MODERATION_STATUSES } = require("../constants/enums");

// Customer Review Submission Validation
const createReviewSchema = z.object({
  booking_id: z.string().min(1, "Booking ID is required"),
  customer_id: z.string().min(1, "Customer ID is required"),
  provider_id: z.string().min(1, "Provider ID is required"),
  service_id: z.string().min(1, "Service ID is required"),
  rating_value: z.number().min(1, "Rating must be at least 1").max(5, "Rating cannot exceed 5"),
  review_text: z.string().max(1000, "Review text cannot exceed 1000 characters").optional().or(z.literal(""))
});

// Customer Review Update Validation (Only rating and text can be updated)
const updateReviewSchema = z.object({
  rating_value: z.number().min(1, "Rating must be at least 1").max(5, "Rating cannot exceed 5").optional(),
  review_text: z.string().max(1000, "Review text cannot exceed 1000 characters").optional().or(z.literal(""))
});

// Admin Moderation Validation
const moderateReviewSchema = z.object({
  review_status: z.enum(Object.values(REVIEW_STATUSES)).optional(),
  moderation_status: z.enum(Object.values(REVIEW_MODERATION_STATUSES)).optional(),
  moderation_reason: z.string().max(500, "Reason cannot exceed 500 characters").optional()
});

module.exports = {
  createReviewSchema,
  updateReviewSchema,
  moderateReviewSchema
};