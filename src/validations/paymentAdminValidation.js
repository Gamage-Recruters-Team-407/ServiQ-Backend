const { z } = require("zod");
const { PAYMENT_STATUSES, PAYMENT_METHODS } = require("../constants/enums");

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid id");

const listPaymentsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  status: z.enum(Object.values(PAYMENT_STATUSES)).optional(),
  method: z.enum(Object.values(PAYMENT_METHODS)).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  minAmount: z.coerce.number().min(0).optional(),
  maxAmount: z.coerce.number().min(0).optional(),
  search: z.string().trim().max(100).optional(),
  bookingId: objectId.optional(),
  customerId: objectId.optional(),
  providerId: objectId.optional(),
  sortBy: z.enum(["payment_datetime", "amount", "created_at"]).default("payment_datetime"),
  order: z.enum(["asc", "desc"]).default("desc")
});

const idParamSchema = z.object({ id: objectId });

module.exports = { listPaymentsQuerySchema, idParamSchema };