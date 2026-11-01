const { z } = require("zod");
const {
  DISPUTE_CATEGORIES,
  DISPUTE_STATUSES,
  DISPUTE_RESOLUTION_OUTCOMES,
  DISPUTE_EVIDENCE_TYPES
} = require("../constants/enums");

/**
 * Helper schema for MongoDB 24-char hex ObjectId string
 */
const objectIdSchema = z
  .string({ required_error: "Identifier is required" })
  .trim()
  .regex(/^[0-9a-fA-F]{24}$/, {
    message: "Invalid ID format. Must be a 24-character hexadecimal ObjectId."
  });

/**
 * Schema for creating a dispute (POST /api/disputes)
 */
const createDisputeSchema = z.object({
  body: z.object({
    booking_id: objectIdSchema,
    dispute_category: z.enum(Object.values(DISPUTE_CATEGORIES), {
      errorMap: () => ({
        message: `Dispute category must be one of: ${Object.values(DISPUTE_CATEGORIES).join(", ")}`
      })
    }),
    description: z
      .string({ required_error: "Description is required" })
      .trim()
      .min(10, { message: "Description must be at least 10 characters long" })
      .max(2000, { message: "Description cannot exceed 2000 characters" }),
    initial_evidence: z
      .array(
        z.object({
          evidence_type: z.enum(Object.values(DISPUTE_EVIDENCE_TYPES), {
            errorMap: () => ({
              message: `Evidence type must be one of: ${Object.values(DISPUTE_EVIDENCE_TYPES).join(", ")}`
            })
          }),
          evidence_reference: z
            .string({ required_error: "Evidence reference is required" })
            .trim()
            .min(1, { message: "Evidence reference cannot be empty" })
            .max(1000, { message: "Evidence reference cannot exceed 1000 characters" }),
          file_name: z.string().trim().max(255).optional().nullable(),
          file_size: z.number().nonnegative().optional().nullable(),
          mime_type: z.string().trim().max(100).optional().nullable()
        })
      )
      .optional()
  })
});

/**
 * Schema for adding evidence to a dispute (POST /api/disputes/:id/evidence)
 */
const addEvidenceSchema = z.object({
  params: z.object({
    id: objectIdSchema
  }),
  body: z.object({
    evidence_type: z.enum(Object.values(DISPUTE_EVIDENCE_TYPES), {
      errorMap: () => ({
        message: `Evidence type must be one of: ${Object.values(DISPUTE_EVIDENCE_TYPES).join(", ")}`
      })
    }),
    evidence_reference: z
      .string({ required_error: "Evidence reference is required" })
      .trim()
      .min(1, { message: "Evidence reference cannot be empty" })
      .max(1000, { message: "Evidence reference cannot exceed 1000 characters" }),
    file_name: z.string().trim().max(255).optional().nullable(),
    file_size: z.number().nonnegative().optional().nullable(),
    mime_type: z.string().trim().max(100).optional().nullable()
  })
});

/**
 * Schema for updating dispute status (PATCH /api/admin/disputes/:id/status)
 */
const updateDisputeStatusSchema = z.object({
  params: z.object({
    id: objectIdSchema
  }),
  body: z.object({
    dispute_status: z.enum(Object.values(DISPUTE_STATUSES), {
      errorMap: () => ({
        message: `Dispute status must be one of: ${Object.values(DISPUTE_STATUSES).join(", ")}`
      })
    }),
    assigned_reviewer: objectIdSchema.optional().nullable()
  })
});

/**
 * Schema for resolving a dispute (PATCH /api/admin/disputes/:id/resolve)
 */
const resolveDisputeSchema = z.object({
  params: z.object({
    id: objectIdSchema
  }),
  body: z.object({
    resolution_outcome: z.enum(Object.values(DISPUTE_RESOLUTION_OUTCOMES), {
      errorMap: () => ({
        message: `Resolution outcome must be one of: ${Object.values(DISPUTE_RESOLUTION_OUTCOMES).join(", ")}`
      })
    }),
    resolution_notes: z
      .string({ required_error: "Resolution notes are required" })
      .trim()
      .min(5, { message: "Resolution notes must be at least 5 characters" })
      .max(3000, { message: "Resolution notes cannot exceed 3000 characters" })
  })
});

/**
 * Schema for dispute URL parameters (e.g. GET /api/disputes/:id)
 */
const disputeIdParamSchema = z.object({
  params: z.object({
    id: objectIdSchema
  })
});

/**
 * Schema for querying/filtering disputes
 */
const getDisputesQuerySchema = z.object({
  query: z
    .object({
      page: z.coerce.number().int().positive().default(1),
      limit: z.coerce.number().int().positive().max(100).default(10),
      status: z.enum(Object.values(DISPUTE_STATUSES)).optional(),
      category: z.enum(Object.values(DISPUTE_CATEGORIES)).optional(),
      search: z.string().trim().optional()
    })
    .default({})
});

/**
 * Express middleware helper to validate requests against Zod schemas
 */
const validate = (schema) => (req, res, next) => {
  try {
    if (schema.shape && (schema.shape.body || schema.shape.query || schema.shape.params)) {
      const parsed = schema.parse({
        body: req.body,
        query: req.query,
        params: req.params
      });
      if (parsed.body !== undefined) req.body = parsed.body;
      if (parsed.query !== undefined) req.query = parsed.query;
      if (parsed.params !== undefined) req.params = parsed.params;
    } else {
      req.body = schema.parse(req.body);
    }
    return next();
  } catch (error) {
    if (error && error.name === "ZodError") {
      const issues = error.issues || error.errors || [];
      const formattedErrors = issues.map((err) => ({
        field: err.path.join("."),
        message: err.message
      }));
      return res.status(400).json({
        success: false,
        message: "Validation Error",
        errors: formattedErrors
      });
    }
    return next(error);
  }
};

module.exports = {
  objectIdSchema,
  createDisputeSchema,
  addEvidenceSchema,
  updateDisputeStatusSchema,
  resolveDisputeSchema,
  disputeIdParamSchema,
  getDisputesQuerySchema,
  validate
};
