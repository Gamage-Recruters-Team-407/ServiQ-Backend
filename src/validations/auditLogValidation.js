const { z } = require("zod");
const { AUDIT_EVENT_TYPES, AUDIT_OUTCOMES } = require("../constants/enums");

const auditLogQuerySchema = z.object({
  event_type: z.enum(Object.values(AUDIT_EVENT_TYPES)).optional(),
  actor_id: z.string().regex(/^[a-f\d]{24}$/i, "actor_id must be a valid ID").optional(),
  resource_type: z.string().trim().min(1).max(200).optional(),
  resource_id: z.string().trim().min(1).max(200).optional(),
  outcome: z.enum(Object.values(AUDIT_OUTCOMES)).optional(),
  correlation_reference: z.string().trim().min(1).max(128).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50)
}).refine(
  ({ from, to }) => !from || !to || from <= to,
  { message: "from must be earlier than or equal to to", path: ["from"] }
);

module.exports = { auditLogQuerySchema };
