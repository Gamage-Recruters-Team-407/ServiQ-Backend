const { z } = require("zod");
const { SERVICE_COMPLETION_STATUSES } = require("../constants/enums");
const { PROVIDER_SETTABLE } = require("../services/serviceCompletion.rules");

const objectId = z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid id");

// Evidence file storage is pending confirmation (Dev 17 / project decision),
// so evidence is stored as http(s) links for now.
const evidenceUrl = z.url({ protocol: /^https?$/, error: "Must be a valid http(s) URL" });

const idParam = z.object({ id: objectId });
const bookingParam = z.object({ bookingId: objectId });

const createBody = z.object({ booking_id: objectId }).strict();

const listQuery = z.object({
  status: z.enum(Object.values(SERVICE_COMPLETION_STATUSES)).optional(),
  scope: z.enum(["active", "finished"]).optional(),
  booking_id: objectId.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10)
});

const updateBody = z
  .object({
    status: z.enum(PROVIDER_SETTABLE).optional(),
    notes: z.string().trim().min(1, "Notes cannot be empty").max(2000, "Notes are too long (max 2000 characters)").optional(),
    evidence_urls: z.array(evidenceUrl).max(5, "A maximum of 5 evidence links is allowed").optional(),
    confirm_completion: z.literal(true).optional()
  })
  .strict()
  .superRefine((body, ctx) => {
    const hasProviderPart = body.status !== undefined || body.notes !== undefined || body.evidence_urls !== undefined;
    if (body.confirm_completion && hasProviderPart) {
      ctx.addIssue({ code: "custom", message: "confirm_completion cannot be combined with other fields", path: ["confirm_completion"] });
    }
    if (!body.confirm_completion && !hasProviderPart) {
      ctx.addIssue({ code: "custom", message: "Provide a status, notes, evidence_urls or confirm_completion", path: [] });
    }
  });

module.exports = { idParam, bookingParam, createBody, listQuery, updateBody };
