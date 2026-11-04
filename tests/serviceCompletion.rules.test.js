const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const rules = require("../src/services/serviceCompletion.rules");
const { SERVICE_COMPLETION_STATUSES: S, BOOKING_STATUSES: B } = require("../src/constants");

describe("Service Completion rules", () => {
  it("allows the normal provider flow step by step", () => {
    assert.ok(rules.canProviderTransition(S.ACCEPTED, S.CONFIRMED));
    assert.ok(rules.canProviderTransition(S.CONFIRMED, S.ON_THE_WAY));
    assert.ok(rules.canProviderTransition(S.ON_THE_WAY, S.STARTED));
    assert.ok(rules.canProviderTransition(S.STARTED, S.IN_PROGRESS));
    assert.ok(rules.canProviderTransition(S.IN_PROGRESS, S.COMPLETED));
  });

  it("blocks skipping ahead, going backwards and leaving terminal states", () => {
    assert.equal(rules.canProviderTransition(S.ACCEPTED, S.COMPLETED), false);
    assert.equal(rules.canProviderTransition(S.IN_PROGRESS, S.STARTED), false);
    assert.deepEqual(rules.allowedNextStatuses(S.COMPLETED), []);
    assert.deepEqual(rules.allowedNextStatuses(S.CANCELLED), []);
    assert.deepEqual(rules.allowedNextStatuses(S.DISPUTED), []);
  });

  it("lets a provider cancel any non-terminal job", () => {
    [S.ACCEPTED, S.CONFIRMED, S.ON_THE_WAY, S.STARTED, S.IN_PROGRESS].forEach((s) =>
      assert.ok(rules.canProviderTransition(s, S.CANCELLED), s)
    );
  });

  it("never lets the provider set Disputed, Requested or Accepted directly", () => {
    assert.equal(rules.PROVIDER_SETTABLE.includes(S.DISPUTED), false);
    assert.equal(rules.PROVIDER_SETTABLE.includes(S.REQUESTED), false);
    assert.equal(rules.PROVIDER_SETTABLE.includes(S.ACCEPTED), false);
  });

  it("calculates progress percentage", () => {
    assert.equal(rules.progressPercent(S.ACCEPTED), 0);
    assert.equal(rules.progressPercent(S.STARTED), 60);
    assert.equal(rules.progressPercent(S.COMPLETED), 100);
    assert.equal(rules.progressPercent(S.CANCELLED), 0);
  });

  it("maps completion status to booking status", () => {
    assert.equal(rules.bookingStatusFor(S.ON_THE_WAY), B.CONFIRMED);
    assert.equal(rules.bookingStatusFor(S.STARTED), B.IN_PROGRESS);
    assert.equal(rules.bookingStatusFor(S.COMPLETED), B.COMPLETED);
    assert.equal(rules.bookingStatusFor(S.COMPLETED, { requireCustomerConfirmation: true }), B.IN_PROGRESS);
    assert.equal(rules.bookingStatusFor(S.COMPLETED, { requireCustomerConfirmation: true, customerConfirmed: true }), B.COMPLETED);
    assert.equal(rules.bookingStatusFor(S.CANCELLED), B.CANCELLED);
  });

  it("unlocks reviews only when complete (and confirmed, if required)", () => {
    assert.equal(rules.reviewEligible(S.COMPLETED), true);
    assert.equal(rules.reviewEligible(S.IN_PROGRESS), false);
    assert.equal(rules.reviewEligible(S.COMPLETED, { requireCustomerConfirmation: true }), false);
    assert.equal(rules.reviewEligible(S.COMPLETED, { requireCustomerConfirmation: true, customerConfirmed: true }), true);
  });
});
