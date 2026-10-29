const { z } = require("zod");
const { PRICING_TYPES } = require("../constants/enums");

const searchServicesQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  category: z.string().trim().optional(),
  city: z.string().trim().max(100).optional(),
  location: z.string().trim().max(100).optional(),
  minPrice: z.coerce.number().min(0, "minPrice must be greater than or equal to 0").optional(),
  maxPrice: z.coerce.number().min(0, "maxPrice must be greater than or equal to 0").optional(),
  pricingType: z.enum(Object.values(PRICING_TYPES)).optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  availableDate: z.string().trim().optional(),
  sortBy: z.enum(["relevance", "price_asc", "price_desc", "rating_desc", "newest"]).default("relevance"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12)
}).refine(
  (data) => {
    if (data.minPrice !== undefined && data.maxPrice !== undefined) {
      return data.maxPrice >= data.minPrice;
    }
    return true;
  },
  {
    message: "maxPrice must be greater than or equal to minPrice",
    path: ["maxPrice"]
  }
);

const providerDiscoveryQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  city: z.string().trim().max(100).optional(),
  category: z.string().trim().optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  verifiedOnly: z.coerce.boolean().optional(),
  sortBy: z.enum(["rating_desc", "experience_desc", "newest"]).default("rating_desc"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12)
});

const featuredQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(20).default(6),
  category: z.string().trim().optional()
});

module.exports = {
  searchServicesQuerySchema,
  providerDiscoveryQuerySchema,
  featuredQuerySchema
};
