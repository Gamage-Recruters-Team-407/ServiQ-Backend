
const { z } = require("zod");
const { PROVIDER_TYPES } = require("../constants/enums");

// Reusable text validation
const text = (max) =>
  z.string().trim().min(1).max(max);

const optionalText = (max) =>
  z.union([text(max), z.literal("")]).optional();

// Business information supplied by the provider
const businessInformationSchema = z.strictObject({
  business_name: optionalText(150),
  registration_number: optionalText(100),
  tax_id: optionalText(100),

  contact_email: z.union([
    z.email().max(254),
    z.literal("")
  ]).optional(),

  contact_phone: optionalText(30),
  business_address: optionalText(500),

  website: z.union([
    z.url().max(500),
    z.literal("")
  ]).optional(),

  description: optionalText(2000)
});

// Professional experience and qualifications
const experienceSchema = z.strictObject({
  years_of_experience: z.number()
    .int()
    .nonnegative()
    .max(80)
    .optional(),

  qualifications: z.array(text(200))
    .max(30)
    .optional(),

  skills: z.array(text(100))
    .max(50)
    .optional(),

  bio: optionalText(2000)
});

// Verify required business details for business providers
const validateBusinessProvider = (data, ctx) => {
  if (data.provider_type !== PROVIDER_TYPES.BUSINESS) {
    return;
  }

  if (!data.business_information?.business_name?.trim()) {
    ctx.addIssue({
      code: "custom",
      path: ["business_information", "business_name"],
      message: "Business name is required for business providers"
    });
  }

  if (!data.business_information?.business_address?.trim()) {
    ctx.addIssue({
      code: "custom",
      path: ["business_information", "business_address"],
      message: "Business address is required for business providers"
    });
  }
};

// Create provider profile
const createProviderSchema = z.strictObject({
  provider_type: z.enum(Object.values(PROVIDER_TYPES)),

  business_information: businessInformationSchema.optional(),

  experience: experienceSchema.optional()
}).superRefine(validateBusinessProvider);

// Update provider profile

const updateProviderSchema = z.strictObject({
  provider_type: z.enum(
    Object.values(PROVIDER_TYPES)
  ).optional(),

  business_information: businessInformationSchema
    .refine(
      (data) => Object.keys(data).length > 0,
      "Business information update cannot be empty"
    )
    .optional(),

  experience: experienceSchema
    .refine(
      (data) => Object.keys(data).length > 0,
      "Experience update cannot be empty"
    )
    .optional()
}).refine(
  (data) => Object.keys(data).length > 0,
  "At least one field is required"
);


module.exports = {
  createProviderSchema,
  updateProviderSchema
};
