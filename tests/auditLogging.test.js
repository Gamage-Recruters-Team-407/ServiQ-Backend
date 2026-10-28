const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const { sanitizeAuditState } = require("../src/services/auditLogService");
const { auditLogQuerySchema } = require("../src/validations/auditLogValidation");
const { AUDIT_EVENT_TYPES, AUDIT_OUTCOMES } = require("../src/constants/enums");
const auditLogService = require("../src/services/auditLogService");
const auditLogging = require("../src/middlewares/auditLogging");

describe("Audit logging", () => {
  it("removes sensitive fields from before and after state", () => {
    const result = sanitizeAuditState({
      status: "updated",
      password: "do-not-store",
      apiKey: "do-not-store",
      discard_reason: "keep-this",
      payment: {
        card_number: "4111111111111111",
        provider_reference: "pay-123"
      },
      reset_token: "do-not-store",
      identity_document: "do-not-store"
    });

    assert.deepEqual(result, {
      status: "updated",
      discard_reason: "keep-this",
      payment: { provider_reference: "pay-123" }
    });
  });

  it("limits nested state, arrays, and string values", () => {
    const result = sanitizeAuditState({
      value: "x".repeat(2200),
      items: Array.from({ length: 105 }, (_, index) => index),
      nested: { level1: { level2: { level3: { level4: { level5: { level6: "hidden" } } } } } }
    });

    assert.equal(result.value.length, 2000);
    assert.equal(result.items.length, 100);
    assert.equal(result.nested.level1.level2.level3.level4.level5, "[truncated]");
  });

  it("validates audit filters and applies safe pagination defaults", () => {
    const result = auditLogQuerySchema.safeParse({
      event_type: AUDIT_EVENT_TYPES.TRANSACTION,
      outcome: AUDIT_OUTCOMES.SUCCESS
    });

    assert.equal(result.success, true);
    assert.equal(result.data.page, 1);
    assert.equal(result.data.limit, 50);
  });

  it("rejects oversized pages and invalid date ranges", () => {
    assert.equal(auditLogQuerySchema.safeParse({ limit: "101" }).success, false);
    assert.equal(auditLogQuerySchema.safeParse({
      from: "2026-02-02",
      to: "2026-02-01"
    }).success, false);
  });

  it("records request outcome and correlation without capturing request data", async () => {
    const originalRecordEvent = auditLogService.recordEvent;
    let recordedEvent;
    auditLogService.recordEvent = async (event) => {
      recordedEvent = event;
    };

    try {
      const req = {
        method: "PATCH",
        path: "/api/bookings/booking-id",
        baseUrl: "/api/bookings",
        route: { path: "/:id" },
        params: { id: "booking-id" },
        user: { _id: "507f1f77bcf86cd799439011", user_role: "Administrator" },
        ip: "127.0.0.1",
        get: (name) => ({
          "x-correlation-id": "request-123",
          "user-agent": "test-agent"
        }[name.toLowerCase()] || null)
      };
      const res = new EventEmitter();
      res.statusCode = 200;
      res.setHeader = (name, value) => {
        res[name] = value;
      };

      auditLogging(req, res, () => {});
      res.emit("finish");
      await new Promise((resolve) => setImmediate(resolve));

      assert.equal(req.correlationId, "request-123");
      assert.equal(res["X-Correlation-ID"], "request-123");
      assert.equal(recordedEvent.action, "PATCH /api/bookings/:id");
      assert.equal(recordedEvent.resource_id, "booking-id");
      assert.equal(recordedEvent.event_type, AUDIT_EVENT_TYPES.TRANSACTION);
      assert.equal(recordedEvent.outcome, AUDIT_OUTCOMES.SUCCESS);
      assert.equal("body" in recordedEvent, false);
    } finally {
      auditLogService.recordEvent = originalRecordEvent;
    }
  });
});
