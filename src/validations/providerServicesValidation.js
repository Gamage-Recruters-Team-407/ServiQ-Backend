const { z } = require("zod");
const { PRICING_TYPES, SERVICE_STATUSES } = require("../constants/enums");

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid MongoDB ObjectId");
const text = (max) => z.string().trim().min(1).max(max);
const nonempty = (value) => Object.keys(value).length > 0;

const priceFields = {
  amount: z.number().finite().nonnegative(),
  currency: z.string().trim().toUpperCase().length(3).optional(),
  pricing_type: z.enum(Object.values(PRICING_TYPES)).optional()
};

const coverageFields = {
  coverage_area: text(150).optional(),
  supported_locations: z.array(text(100)).max(50).optional(),
  radius_km: z.number().finite().nonnegative().max(10000).optional()
};

const createServiceSchema = z.strictObject({
  category_id: objectId,
  name: text(120),
  description: text(2000),
  price: z.strictObject(priceFields),
  coverage: z.strictObject(coverageFields).optional(),
  duration_minutes: z.number().int().positive().max(10080).optional(),
  availability_info: text(500).optional(),
  images: z.array(z.string().trim().url().max(2048)).max(10).optional()
});

const updateServiceSchema = z.strictObject({
  category_id: objectId.optional(),
  name: text(120).optional(),
  description: text(2000).optional(),
  price: z.strictObject({
    ...priceFields,
    amount: priceFields.amount.optional()
  }).refine(nonempty, "Provide at least one price field").optional(),
  coverage: z.strictObject(coverageFields)
    .refine(nonempty, "Provide at least one coverage field")
    .optional(),
  duration_minutes: z.number().int().positive().max(10080).optional(),
  availability_info: text(500).optional(),
  images: z.array(z.string().trim().url().max(2048)).max(10).optional()
}).refine(nonempty, "Provide at least one field");

const statusSchema = z.strictObject({
  status: z.enum([
    SERVICE_STATUSES.ACTIVE,
    SERVICE_STATUSES.INACTIVE,
    SERVICE_STATUSES.TEMPORARILY_UNAVAILABLE
  ])
});

module.exports = {
  createServiceSchema,
  updateServiceSchema,
  statusSchema
};