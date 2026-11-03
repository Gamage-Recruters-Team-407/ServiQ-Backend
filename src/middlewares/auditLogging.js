const { randomUUID } = require("node:crypto");
const auditLogService = require("../services/auditLogService");
const { AUDIT_EVENT_TYPES, AUDIT_OUTCOMES } = require("../constants/enums");

const CORRELATION_ID_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;

function getEventType(path) {
  if (/\/auth(?:\/|$)/i.test(path)) return AUDIT_EVENT_TYPES.AUTHENTICATION_AND_SECURITY;
  if (/\/admin(?:\/|$)/i.test(path)) return AUDIT_EVENT_TYPES.ADMINISTRATIVE_AUDIT;
  if (/booking|payment|commission|earning|payout|dispute|verification/i.test(path)) {
    return AUDIT_EVENT_TYPES.TRANSACTION;
  }
  if (/notification|integration/i.test(path)) {
    return AUDIT_EVENT_TYPES.INTEGRATION_AND_NOTIFICATION;
  }
  if (/\/ai(?:\/|$)/i.test(path)) return AUDIT_EVENT_TYPES.AI_OPERATIONAL;
  return AUDIT_EVENT_TYPES.APPLICATION;
}

function getRoutePath(req) {
  if (!req.route) return "unmatched";
  return `${req.baseUrl || ""}${req.route.path}`;
}

function auditLogging(req, res, next) {
  const suppliedId = req.get("x-correlation-id");
  const correlationId = suppliedId && CORRELATION_ID_PATTERN.test(suppliedId)
    ? suppliedId
    : randomUUID();

  req.correlationId = correlationId;
  res.setHeader("X-Correlation-ID", correlationId);

  res.on("finish", () => {
    if (req.path === "/api/health") return;

    const routePath = getRoutePath(req);
    const outcome = res.statusCode >= 500
      ? AUDIT_OUTCOMES.FAILURE
      : res.statusCode === 401 || res.statusCode === 403
        ? AUDIT_OUTCOMES.DENIED
        : res.statusCode >= 400
          ? AUDIT_OUTCOMES.FAILURE
          : AUDIT_OUTCOMES.SUCCESS;

    auditLogService.recordEvent({
      actor_id: req.user?._id || req.user?.id || null,
      actor_role: req.user?.user_role || null,
      event_type: getEventType(routePath),
      action: `${req.method} ${routePath}`,
      resource_type: routePath,
      resource_id: req.params?.id || null,
      outcome,
      correlation_reference: correlationId,
      error_reference: outcome === AUDIT_OUTCOMES.SUCCESS ? null : `HTTP_${res.statusCode}`,
      ip_address: req.ip || null,
      user_agent: req.get("user-agent") || null
    }).catch((error) => {
      console.error("[audit] Failed to persist request audit record:", error);
    });
  });

  next();
}

module.exports = auditLogging;
