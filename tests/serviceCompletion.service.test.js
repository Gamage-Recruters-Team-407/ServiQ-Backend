const { describe, it, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const { createServiceCompletionService } = require("../src/services/serviceCompletion.service");
const { USER_ROLES, SERVICE_COMPLETION_STATUSES: S } = require("../src/constants");

// ---- tiny in-memory fakes ---------------------------------------------------
let seq = 0;
const newId = () => String(++seq).padStart(24, "0");
const clone = (o) => JSON.parse(JSON.stringify(o));
const matches = (doc, filter) =>
  Object.entries(filter).every(([k, cond]) => {
    const val = doc[k];
    if (cond && typeof cond === "object" && !(cond instanceof Date)) {
      if ("$ne" in cond) return String(val) !== String(cond.$ne);
      if ("$nin" in cond) return !cond.$nin.includes(val);
      if ("$in" in cond) return cond.$in.includes(val);
    }
    return String(val) === String(cond);
  });

class Query {
  constructor(rows) { this.rows = rows; }
  populate() { return this; }
  select() { return this; }
  sort() { return this; }
  skip(n) { this.rows = this.rows.slice(n); return this; }
  limit(n) { this.rows = this.rows.slice(0, n); return this; }
  lean() { return this; }
  then(res, rej) { return Promise.resolve(this.rows.length === undefined ? this.rows : this.rows).then(res, rej); }
}
class One extends Query {
  then(res, rej) { return Promise.resolve(this.rows[0] ? clone(this.rows[0]) : null).then(res, rej); }
}

function makeStore() {
  const db = { completions: [], bookings: [], providers: [], customers: [] };
  const models = {
    ServiceCompletion: {
      findById: (id) => new One(db.completions.filter((c) => c._id === String(id))),
      findOne: (f) => new One(db.completions.filter((c) => matches(c, f))),
      find: (f) => new Query(db.completions.filter((c) => matches(c, f)).map(clone)),
      countDocuments: async (f) => db.completions.filter((c) => matches(c, f)).length,
      create: async (data) => {
        if (db.completions.some((c) => c.booking_id === String(data.booking_id))) { const e = new Error("dup"); e.code = 11000; throw e; }
        const doc = { _id: newId(), completion_confirmation: false, review_eligibility: false, evidence_urls: [], ...data, booking_id: String(data.booking_id), created_at: new Date(), updated_at: new Date() };
        doc.status_history = (data.status_history || []).map((h) => ({ ...h, changed_at: new Date() }));
        db.completions.push(doc);
        return clone(doc);
      },
      findOneAndUpdate: (f, upd) => {
        const doc = db.completions.find((c) => matches(c, f));
        if (doc) {
          Object.assign(doc, upd.$set || {});
          if (upd.$push?.status_history) doc.status_history.push(upd.$push.status_history);
          if (upd.$pop?.status_history) doc.status_history.pop();
          doc.updated_at = new Date();
        }
        return new One(doc ? [doc] : []);
      }
    },
    Booking: { findById: (id) => new One(db.bookings.filter((b) => b._id === String(id))) },
    Provider: {
      findOne: (f) => new One(db.providers.filter((p) => p.user_id === f.user_id)),
      findById: (id) => new One(db.providers.filter((p) => p._id === String(id)))
    },
    Customer: {
      findOne: (f) => new One(db.customers.filter((c) => c.user_id === f.user_id)),
      findById: (id) => new One(db.customers.filter((c) => c._id === String(id)))
    }
  };
  return { db, models };
}

describe("Service Completion service", () => {
  let db, svc, notes, audits, bookingCalls, cfg, failBooking;
  const providerUser = { id: "u-prov", role: USER_ROLES.PROVIDER };
  const otherProviderUser = { id: "u-prov2", role: USER_ROLES.PROVIDER };
  const customerUser = { id: "u-cust", role: USER_ROLES.CUSTOMER };
  const otherCustomerUser = { id: "u-cust2", role: USER_ROLES.CUSTOMER };
  const adminUser = { id: "u-admin", role: USER_ROLES.ADMIN };
  let bookingId;

  beforeEach(() => {
    const store = makeStore();
    db = store.db;
    notes = []; audits = []; bookingCalls = []; cfg = { requireCustomerConfirmation: false }; failBooking = false;
    db.providers.push({ _id: "p1", user_id: "u-prov", account_status: "Active" }, { _id: "p2", user_id: "u-prov2", account_status: "Active" });
    db.customers.push({ _id: "c1", user_id: "u-cust", account_status: "Active" }, { _id: "c2", user_id: "u-cust2", account_status: "Active" });
    bookingId = newId();
    db.bookings.push({ _id: bookingId, provider_id: "p1", customer_id: "c1", booking_status: "Accepted" });
    svc = createServiceCompletionService({
      models: store.models,
      notify: async (n) => notes.push(n),
      logAudit: async (a) => audits.push(a),
      getConfig: () => cfg,
      bookings: { setStatus: async (id, status, extra) => { if (failBooking) throw new Error("boom"); bookingCalls.push({ id, status, ...extra }); } }
    });
  });

  const start = () => svc.create(providerUser, { booking_id: bookingId });
  const advance = async (id, ...statuses) => { for (const status of statuses) await svc.update(providerUser, id, { status }); };

  it("provider starts tracking an accepted booking", async () => {
    const dto = await start();
    assert.equal(dto.status, S.ACCEPTED);
    assert.equal(dto.progress_percent, 0);
    assert.deepEqual(dto.allowed_next_statuses, ["Confirmed", "On the Way", "Cancelled"]);
    assert.equal(audits[0].action, "SERVICE_TRACKING_STARTED");
  });

  it("rejects tracking for another provider's booking, wrong booking state, duplicates and customers", async () => {
    await assert.rejects(svc.create(otherProviderUser, { booking_id: bookingId }), { code: "NOT_YOUR_BOOKING" });
    await assert.rejects(svc.create(customerUser, { booking_id: bookingId }), { code: "FORBIDDEN" });
    db.bookings[0].booking_status = "Requested";
    await assert.rejects(svc.create(providerUser, { booking_id: bookingId }), { code: "INVALID_BOOKING_STATE" });
    db.bookings[0].booking_status = "Accepted";
    await start();
    await assert.rejects(start(), { code: "ALREADY_EXISTS" });
    await assert.rejects(svc.create(providerUser, { booking_id: newId() }), { code: "BOOKING_NOT_FOUND" });
  });

  it("walks the full flow, syncs the booking, notifies the customer and unlocks review", async () => {
    const { id } = await start();
    await advance(id, "Confirmed", "On the Way", "Started", "In Progress");
    const done = await svc.update(providerUser, id, { status: "Completed", notes: "Replaced the pipe and tested for leaks." });
    assert.equal(done.status, S.COMPLETED);
    assert.equal(done.progress_percent, 100);
    assert.equal(done.review_eligible, true);
    assert.ok(done.start_datetime && done.completion_datetime);
    assert.equal(done.status_history.length, 6);
    assert.equal(bookingCalls.at(-1).status, "Completed");
    assert.ok(notes.some((n) => n.eventType === "Review Request"));
    assert.ok(notes.every((n) => n.recipientId === "u-cust"));
  });

  it("rejects illegal transitions and unchanged status with the allowed list", async () => {
    const { id } = await start();
    await assert.rejects(svc.update(providerUser, id, { status: "Completed", notes: "long enough notes here" }), (e) => e.code === "INVALID_TRANSITION" && e.details.allowed.includes("Confirmed"));
    await assert.rejects(svc.update(providerUser, id, { status: "Accepted" }), { code: "INVALID_TRANSITION" });
  });

  it("requires completion notes and a cancellation reason", async () => {
    const { id } = await start();
    await advance(id, "Confirmed", "Started");
    await assert.rejects(svc.update(providerUser, id, { status: "Completed" }), { code: "NOTES_REQUIRED" });
    await assert.rejects(svc.update(providerUser, id, { status: "Completed", notes: "short" }), { code: "NOTES_REQUIRED" });
    await assert.rejects(svc.update(providerUser, id, { status: "Cancelled" }), { code: "REASON_REQUIRED" });
  });

  it("cancelling records the reason, cancels the booking and locks the job", async () => {
    const { id } = await start();
    const dto = await svc.update(providerUser, id, { status: "Cancelled", notes: "Customer not reachable" });
    assert.equal(dto.status, S.CANCELLED);
    assert.equal(bookingCalls.at(-1).status, "Cancelled");
    assert.equal(bookingCalls.at(-1).reason, "Customer not reachable");
    assert.deepEqual(dto.allowed_next_statuses, []);
    await assert.rejects(svc.update(providerUser, id, { notes: "edit after cancel" }), { code: "INVALID_TRANSITION" });
  });

  it("with customer confirmation required, booking stays In Progress until the customer confirms", async () => {
    cfg.requireCustomerConfirmation = true;
    const { id } = await start();
    await advance(id, "Confirmed", "Started");
    const done = await svc.update(providerUser, id, { status: "Completed", notes: "All work finished and cleaned up." });
    assert.equal(done.review_eligible, false);
    assert.equal(bookingCalls.at(-1).status, "In Progress");
    assert.equal(notes.some((n) => n.eventType === "Review Request"), false);

    await assert.rejects(svc.update(otherCustomerUser, id, { confirm_completion: true }), { code: "FORBIDDEN" });
    const view = await svc.getById(customerUser, id);
    assert.equal(view.can_confirm, true);
    const confirmed = await svc.update(customerUser, id, { confirm_completion: true });
    assert.equal(confirmed.customer_confirmed, true);
    assert.equal(confirmed.review_eligible, true);
    assert.equal(bookingCalls.at(-1).status, "Completed");
    assert.equal(notes.at(-1).recipientId, "u-prov");
    await assert.rejects(svc.update(customerUser, id, { confirm_completion: true }), { code: "ALREADY_CONFIRMED" });
  });

  it("customer cannot confirm before completion, change status, or provider confirm", async () => {
    const { id } = await start();
    await assert.rejects(svc.update(customerUser, id, { confirm_completion: true }), { code: "NOT_COMPLETED" });
    await assert.rejects(svc.update(customerUser, id, { status: "Started" }), { code: "FORBIDDEN" });
    await assert.rejects(svc.update(providerUser, id, { confirm_completion: true }), { code: "FORBIDDEN" });
    await assert.rejects(svc.update(adminUser, id, { status: "Started" }), { code: "FORBIDDEN" });
  });

  it("another provider cannot update someone else's job", async () => {
    const { id } = await start();
    await assert.rejects(svc.update(otherProviderUser, id, { status: "Confirmed" }), { code: "FORBIDDEN" });
  });

  it("rolls back the completion change if the booking sync fails", async () => {
    const { id } = await start();
    failBooking = true;
    await assert.rejects(svc.update(providerUser, id, { status: "Confirmed" }), { code: "BOOKING_SYNC_FAILED" });
    const after = await svc.getById(providerUser, id);
    assert.equal(after.status, S.ACCEPTED);
    assert.equal(after.status_history.length, 1);
  });

  it("access control on reads", async () => {
    const { id } = await start();
    assert.equal((await svc.getById(customerUser, id)).id, id);
    assert.equal((await svc.getById(adminUser, id)).id, id);
    await assert.rejects(svc.getById(otherCustomerUser, id), { code: "FORBIDDEN" });
    await assert.rejects(svc.getById(otherProviderUser, id), { code: "FORBIDDEN" });
    await assert.rejects(svc.getByBooking(providerUser, newId()), { code: "COMPLETION_NOT_FOUND" });
    assert.equal((await svc.getByBooking(providerUser, bookingId)).id, id);
  });

  it("lists only the caller's records with pagination meta and scope filter", async () => {
    const { id } = await start();
    const other = newId();
    db.bookings.push({ _id: other, provider_id: "p2", customer_id: "c2", booking_status: "Accepted" });
    await svc.create(otherProviderUser, { booking_id: other });
    const mine = await svc.list(providerUser, { page: 1, limit: 10 });
    assert.equal(mine.items.length, 1);
    assert.equal(mine.meta.total, 1);
    assert.equal((await svc.list(adminUser, { page: 1, limit: 10 })).items.length, 2);
    assert.equal((await svc.list(customerUser, { page: 1, limit: 10, scope: "finished" })).items.length, 0);
    assert.equal((await svc.list(customerUser, { page: 1, limit: 10, scope: "active" })).items[0].id, id);
  });

  it("markDisputed (Dispute module interface) works only on started/completed jobs", async () => {
    const { id } = await start();
    await assert.rejects(svc.markDisputed(bookingId), { code: "INVALID_TRANSITION" });
    await advance(id, "Confirmed", "Started");
    const saved = await svc.markDisputed(bookingId, { actorId: "u-cust", actorRole: USER_ROLES.CUSTOMER, reason: "Poor quality" });
    assert.equal(saved.current_status, S.DISPUTED);
    assert.equal(bookingCalls.at(-1).status, "Disputed");
    assert.equal(await svc.markDisputed(newId()), null);
  });
});
