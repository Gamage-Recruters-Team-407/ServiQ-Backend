const { z } = require("zod");
const { NOTIFICATION_EVENT_TYPES } = require("../constants/enums");

const objectId = z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid id");

const idParam = z.object({ id: objectId });

const listQuery = z.object({
  status: z.enum(["unread", "read"]).optional(),
  event_type: z.enum(Object.values(NOTIFICATION_EVENT_TYPES)).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10)
});

module.exports = { idParam, listQuery };
