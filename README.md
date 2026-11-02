# LocalServices-Backend
AI-Powered Local Services Marketplace

## Audit logging

API requests are recorded in the MongoDB `AuditLog` collection with the actor (when
authenticated), role, normalized route/action, outcome, timestamp, request IP,
user agent, and a correlation reference. Request bodies, query values, credentials,
and response content are not included. Sensitive fields are also removed from
explicit `previous_state` and `new_state` values passed to the audit service.

Administrators can search records with `GET /api/admin/audit-logs`. The endpoint
requires an authenticated Administrator and supports `event_type`, `actor_id`,
`resource_type`, `resource_id`, `outcome`, `correlation_reference`, `from`,
`to`, `page`, and `limit` filters. Page size is capped at 100. Audit records are
append-only through the application model; production deployments should additionally
restrict database permissions and configure encrypted backups and retention according
to the approved policy.

For business events that happen outside HTTP request handling, call
`auditLogService.recordEvent()` from `src/services/auditLogService.js` with the
actor, event type, action, resource, outcome, correlation reference, and applicable
before/after states. Do not pass credentials, payment-card details, or ID-document
contents.
