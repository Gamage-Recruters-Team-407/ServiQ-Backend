const test = require("node:test");
const assert = require("node:assert/strict");

const { BOOKING_STATUSES, USER_ROLES } = require("../src/constants");
const {
  ProviderBookingError,
  createProviderBookingService
} = require("../src/services/providerBookingService");

const PROVIDER_ID = "660c1234567890abcdef1234";
const BOOKING_ID = "660c1234567890abcdef5678";
const OTHER_BOOKING_ID = "660c1234567890abcdef9999";
const USER_ID = "660c1234567890abcdef1111";

function booking(overrides = {}) {
  return {
    _id: BOOKING_ID,
    booking_reference: "BKG-20261028-ABC123",
    booking_status: BOOKING_STATUSES.REQUESTED,
    requested_at: new Date("2026-10-28T08:00:00.000Z"),
    customer_id: {
      _id: "660c1234567890abcdef2222",
      profile_details: {},
      user_id: {
        first_name: "Kamal",
        last_name: "Perera",
        email: "kamal@example.com"
      }
    },
    service_id: {
      _id: "660c1234567890abcdef3333",
      name: "Plumbing",
      description: "Home plumbing",
      price: { amount: 2500, currency: "LKR" },
      duration_minutes: 60
    },
    total_amount: 2500,
    currency: "LKR",
    ...overrides
  };
}

function fakeAdapter({ current = booking() } = {}) {
  const calls = [];

  return {
    calls,
    async getProviderByUserId(userId) {
      return String(userId) === USER_ID ? { _id: PROVIDER_ID } : null;
    },
    async listProviderBookings(providerId) {
      calls.push(["list", String(providerId)]);
      return providerId === PROVIDER_ID ? [current] : [];
    },
    async getProviderBooking(providerId, bookingId) {
      calls.push(["get", String(providerId), String(bookingId)]);
      return providerId === PROVIDER_ID && bookingId === BOOKING_ID ? current : null;
    },
    async transitionProviderBooking(providerId, bookingId, nextStatus) {
      calls.push(["transition", String(providerId), String(bookingId), nextStatus]);
      if (providerId !== PROVIDER_ID || bookingId !== BOOKING_ID) return null;
      return booking({ booking_status: nextStatus });
    },
    async notifyCustomerForBooking(_booking, status) {
      calls.push(["notify", status]);
    }
  };
}

test("provider booking service lists only the authenticated provider's bookings", async () => {
  const adapter = fakeAdapter();
  const service = createProviderBookingService(adapter);
  const result = await service.list({ _id: USER_ID, user_role: USER_ROLES.PROVIDER });

  assert.equal(result.length, 1);
  assert.equal(result[0].id, BOOKING_ID);
  assert.deepEqual(adapter.calls[0], ["list", PROVIDER_ID]);
});

test("provider cannot access another provider's booking", async () => {
  const service = createProviderBookingService(fakeAdapter());

  await assert.rejects(
    () => service.getById({ _id: "660c1234567890abcdef4444" }, OTHER_BOOKING_ID),
    (error) => error instanceof ProviderBookingError && error.statusCode === 404
  );
});

test("provider can accept a requested booking and notify the customer", async () => {
  const adapter = fakeAdapter();
  const service = createProviderBookingService(adapter);
  const result = await service.accept({ _id: USER_ID }, BOOKING_ID);

  assert.equal(result.booking_status, BOOKING_STATUSES.ACCEPTED);
  assert.deepEqual(adapter.calls.at(-1), ["notify", BOOKING_STATUSES.ACCEPTED]);
});

test("provider can reject a requested booking and notify the customer", async () => {
  const adapter = fakeAdapter();
  const service = createProviderBookingService(adapter);
  const result = await service.reject({ _id: USER_ID }, BOOKING_ID, "Schedule conflict");

  assert.equal(result.booking_status, BOOKING_STATUSES.REJECTED);
  assert.deepEqual(adapter.calls.at(-1), ["notify", BOOKING_STATUSES.REJECTED]);
});

test("provider cannot transition a booking that is no longer requested", async () => {
  const service = createProviderBookingService(
    fakeAdapter({ current: booking({ booking_status: BOOKING_STATUSES.ACCEPTED }) })
  );

  await assert.rejects(
    () => service.accept({ _id: USER_ID }, BOOKING_ID),
    (error) => error instanceof ProviderBookingError && error.statusCode === 409
  );
});

test("provider booking service requires a provider profile", async () => {
  const service = createProviderBookingService(fakeAdapter());

  await assert.rejects(
    () => service.list({ _id: "660c1234567890abcdef4444" }),
    (error) => error instanceof ProviderBookingError && error.statusCode === 404
  );
});
