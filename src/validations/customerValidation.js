const { z } = require("zod");
const { NOTIFICATION_CHANNELS } = require("../constants/enums");

const updateCustomerProfileSchema = z.object({
  first_name: z.string().trim().min(1, "First name is required").max(60).optional(),
  last_name: z.string().trim().min(1, "Last name is required").max(60).optional(),
  phone_number: z.string().trim().regex(/^\+?[\d\s\-()]{7,18}$/, "Enter a valid phone number").optional(),
  bio: z.string().trim().max(500, "Bio cannot exceed 500 characters").optional(),
  avatar_url: z.string().trim().url("Enter a valid URL for avatar").optional().or(z.literal("")),
  address: z.object({
    street: z.string().trim().optional(),
    city: z.string().trim().optional(),
    state: z.string().trim().optional(),
    postal_code: z.string().trim().optional(),
    country: z.string().trim().default("Sri Lanka").optional(),
    location: z.object({
      type: z.literal("Point").optional(),
      coordinates: z.array(z.number()).length(2, "Coordinates must be [longitude, latitude]").optional()
    }).optional()
  }).optional(),
  preferences: z.object({
    preferred_categories: z.array(z.string()).optional(), // Will be validated as ObjectIds in service if needed
    notification_channels: z.array(z.enum(Object.values(NOTIFICATION_CHANNELS))).optional(),
    language: z.string().trim().length(2, "Language must be a 2-letter code (e.g., 'en', 'si')").optional()
  }).optional()
});

module.exports = {
  updateCustomerProfileSchema
};