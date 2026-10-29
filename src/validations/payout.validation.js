const { z } = require("zod");
const { PAYOUT_METHODS, PAYOUT_STATUSES } = require("../constants/enums");

const createPayoutSchema = z.object({
  payout_amount: z
    .number({ error: "payout_amount must be a number" })
    .positive("payout_amount must be greater than 0"),
  payout_method: z.enum(Object.values(PAYOUT_METHODS), { error: "Invalid payout_method" }),
  // PROVISIONAL: The payout account source is not finalized. For now, use the request body.
  destination_ref: z
    .string({ error: "destination_ref is required" })
    .trim()
    .min(1, "destination_ref is required"),
});

const listQuerySchema = z.object({
  status: z.enum(Object.values(PAYOUT_STATUSES)).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

// Status changes allowed for Admin.
const ADMIN_STATUSES = [
  PAYOUT_STATUSES.APPROVED,
  PAYOUT_STATUSES.REJECTED,
  PAYOUT_STATUSES.SUCCESSFUL,
  PAYOUT_STATUSES.FAILED,
];

const updateStatusSchema = z
  .object({
    status: z.enum(ADMIN_STATUSES, { error: `status must be one of: ${ADMIN_STATUSES.join(", ")}` }),
    reason: z.string().trim().min(3, "reason must be at least 3 characters").optional(),
  })
  .refine(
    (data) =>
      ![PAYOUT_STATUSES.REJECTED, PAYOUT_STATUSES.FAILED].includes(data.status) || Boolean(data.reason),
    { message: "reason is required when rejecting or failing a payout", path: ["reason"] }
  );

module.exports = { createPayoutSchema, listQuerySchema, updateStatusSchema };