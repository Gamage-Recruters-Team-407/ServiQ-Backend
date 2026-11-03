// Audit log interface (owned by Developer 24). Modules call `logAudit`; failures never block the action.
const AuditLog = require("../models/AuditLog");
const { AUDIT_EVENT_TYPES, AUDIT_OUTCOMES } = require("../constants/enums");

async function logAudit({
  actorId = null,
  actorRole = null,
  action,
  resourceType,
  resourceId = null,
  outcome = AUDIT_OUTCOMES.SUCCESS,
  previousState = null,
  newState = null,
  eventType = AUDIT_EVENT_TYPES.APPLICATION,
  ipAddress = null,
  userAgent = null
}) {
  try {
    return await AuditLog.create({
      actor_id: actorId,
      actor_role: actorRole,
      event_type: eventType,
      action,
      resource_type: resourceType,
      resource_id: resourceId ? String(resourceId) : null,
      outcome,
      previous_state: previousState,
      new_state: newState,
      ip_address: ipAddress,
      user_agent: userAgent
    });
  } catch (err) {
    console.error("Audit log failed:", err.message);
    return null;
  }
}

module.exports = { logAudit };
