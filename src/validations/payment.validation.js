const { z } = require("zod");
const { PAYMENT_STATUSES, PAYMENT_METHODS } = require("../constants/enums");

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid id");

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  status: z.enum(Object.values(PAYMENT_STATUSES)).optional(),
  method: z.enum(Object.values(PAYMENT_METHODS)).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  search: z.string().trim().max(50).optional(),
  customerId: objectId.optional()
});

const idParamSchema = z.object({ id: objectId });

module.exports = { listQuerySchema, idParamSchema };