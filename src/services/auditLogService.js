const AuditLog = require("../models/AuditLog");

const SENSITIVE_FIELD = /(?:^|[_-])(?:password|passwd|secret|token|authorization|auth|key|card|cvv|cvc|otp|document|credential)s?(?:$|[_-])/i;

function sanitizeAuditState(value, depth = 0) {
  if (value === null || value === undefined) return value;
  if (depth > 5) return "[truncated]";
  if (value instanceof Date) return value.toISOString();
  if (typeof value?.toHexString === "function") return value.toHexString();
  if (typeof value !== "object") {
    if (typeof value === "string") return value.slice(0, 2000);
    if (typeof value === "number" || typeof value === "boolean") return value;
    return undefined;
  }
  if (Array.isArray(value)) {
    return value.slice(0, 100).map((item) => sanitizeAuditState(item, depth + 1));
  }

  const result = {};
  for (const [key, nestedValue] of Object.entries(value)) {
    const normalizedKey = key.replace(/([a-z0-9])([A-Z])/g, "$1_$2");
    if (SENSITIVE_FIELD.test(normalizedKey)) continue;
    const sanitizedValue = sanitizeAuditState(nestedValue, depth + 1);
    if (sanitizedValue !== undefined) result[key] = sanitizedValue;
  }
  return result;
}

async function recordEvent(event) {
  return AuditLog.create({
    actor_id: event.actor_id || null,
    actor_role: event.actor_role || null,
    event_type: event.event_type,
    action: event.action,
    resource_type: event.resource_type,
    resource_id: event.resource_id || null,
    outcome: event.outcome,
    previous_state: sanitizeAuditState(event.previous_state),
    new_state: sanitizeAuditState(event.new_state),
    correlation_reference: event.correlation_reference || null,
    error_reference: event.error_reference || null,
    ip_address: event.ip_address || null,
    user_agent: event.user_agent || null
  });
}

async function searchEvents(filters, { page = 1, limit = 50 } = {}) {
  const query = {};
  const filterFields = [
    "event_type",
    "actor_id",
    "resource_type",
    "resource_id",
    "outcome",
    "correlation_reference"
  ];

  for (const field of filterFields) {
    if (filters[field]) query[field] = filters[field];
  }

  if (filters.from || filters.to) {
    query.logged_at = {};
    if (filters.from) query.logged_at.$gte = filters.from;
    if (filters.to) query.logged_at.$lte = filters.to;
  }

  const [records, total] = await Promise.all([
    AuditLog.find(query)
      .sort({ logged_at: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    AuditLog.countDocuments(query)
  ]);

  return {
    records,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  };
}

module.exports = {
  recordEvent,
  searchEvents,
  sanitizeAuditState
};
