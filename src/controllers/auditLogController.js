const auditLogService = require("../services/auditLogService");
const { auditLogQuerySchema } = require("../validations/auditLogValidation");

async function list(req, res) {
  const parsed = auditLogQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid audit log filters.",
      errors: parsed.error.issues
    });
  }

  try {
    const { page, limit, ...filters } = parsed.data;
    const result = await auditLogService.searchEvents(filters, { page, limit });
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    console.error("[audit] Failed to retrieve audit records:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve audit records."
    });
  }
}

module.exports = { list };
