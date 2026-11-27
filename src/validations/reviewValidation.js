
const { z } = require("zod");

const mongoObjectIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, "Invalid MongoDB ObjectId")
  .transform((value) => value.toLowerCase());

const createReviewSchema = z.strictObject({
  booking_id: mongoObjectIdSchema,

  rating_value: z.number().int().min(1).max(5),

  review_text: z
    .string()
    .trim()
    .nullable()
    .optional()
    .transform((value) => value || null)
});

function validateCreateReview(payload) {
  return createReviewSchema.safeParse(payload);
}

module.exports = {
  mongoObjectIdSchema,
  createReviewSchema,
  validateCreateReview
};
