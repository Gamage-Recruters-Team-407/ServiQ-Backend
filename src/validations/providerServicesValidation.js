const { z } = require("zod");
const { PRICING_TYPES, SERVICE_STATUSES } = require("../constants/enums");

const objectId = z.string().regex(
  /^[a-f\d]{24}$/i,
  "Invalid MongoDB ObjectId"
);

const shortText = (max) => z.string().trim().min(1).max(max);

const priceFields = {
  amount: z.number().finite().nonnegative(),
  currency: z.string().trim().toUpperCase().length(3).optional(),
  pricing_type: z.enum(Object.values(PRICING_TYPES)).optional()
};

const coverageFields = {
  coverage_area: shortText(150).optional(),
  supported_locations: z.array(shortText(100)).max(50).optional(),
  radius_km: z.number().finite().nonnegative().max(10000).optional()
};

const nonempty = (data) => Object.keys(data).length > 0;

const createServiceSchema = z.strictObject({
  category_id: objectId,
  name: shortText(120),
  description: shortText(2000),
  price: z.strictObject(priceFields),
  coverage: z.strictObject(coverageFields).optional(),
  duration_minutes: z.number().int().positive().max(10080).optional()
});

const updateServiceSchema = z.strictObject({
  category_id: objectId.optional(),
  name: shortText(120).optional(),
  description: shortText(2000).optional(),

  price: z.strictObject({
    ...priceFields,
    amount: priceFields.amount.optional()
  }).refine(nonempty, "Price update cannot be empty").optional(),

  coverage: z.strictObject(coverageFields)
    .refine(nonempty, "Coverage update cannot be empty")
    .optional(),

  duration_minutes: z.number().int().positive().max(10080).optional()
}).refine(nonempty, "At least one field is required");

const statusSchema = z.strictObject({
  status: z.enum([
    SERVICE_STATUSES.ACTIVE,
    SERVICE_STATUSES.INACTIVE
  ])
});

module.exports = {
  objectId,
  createServiceSchema,
  updateServiceSchema,
  statusSchema
};