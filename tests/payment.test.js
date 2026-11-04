// Automated tests for Dev 13 (Payment Administration).
// Uses a fake in-memory database. Does not load app.js, init or .env.
process.env.NODE_ENV = "development";

const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const { Payment, Customer, Provider } = require("../src/models");
const { PAYMENT_STATUSES, PAYMENT_METHODS } = require("../src/constants/enums");
const { customerRouter, adminRouter } = require("../src/routes/payment.routes");

let mongod, server, base, cust1, cust2, user1, user2;

const ADMIN = { "x-test-role": "Administrator" };
const asCustomer = (userId) => ({
  "x-test-role": "Customer",
  "x-test-user-id": String(userId)
});

async function get(path, headers = {}) {
  const res = await fetch(base + path, { headers });
  return { status: res.status, body: await res.json() };
}

before(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());

  user1 = new mongoose.Types.ObjectId();
  user2 = new mongoose.Types.ObjectId();
  [cust1, cust2] = await Customer.insertMany([
    { user_id: user1, profile_details: { first_name: "Nimal", last_name: "Perera" } },
    { user_id: user2, profile_details: { first_name: "Kamala", last_name: "Silva" } }
  ]);

  const [prov1, prov2] = await Provider.insertMany([
    {
      user_id: new mongoose.Types.ObjectId(),
      business_information: {
        business_name: "Quick Fix Plumbing",
        contact_phone: "0711234567",
        tax_id: "SECRET-TAX-1",
        registration_number: "SECRET-REG-1",
        business_address: "SECRET ADDRESS 1"
      }
    },
    {
      user_id: new mongoose.Types.ObjectId(),
      business_information: {
        business_name: "Bright Electricals",
        contact_phone: "0777654321",
        tax_id: "SECRET-TAX-2",
        registration_number: "SECRET-REG-2",
        business_address: "SECRET ADDRESS 2"
      }
    }
  ]);

  const day = 24 * 60 * 60 * 1000;
  const mk = (customer, provider, amount, status, method, daysAgo) => ({
    booking_id: new mongoose.Types.ObjectId(),
    customer_id: customer._id,
    provider_id: provider._id,
    amount,
    payment_method: method,
    payment_status: status,
    payment_datetime: new Date(Date.now() - daysAgo * day)
  });

  await Payment.insertMany([
    mk(cust1, prov1, 5000, PAYMENT_STATUSES.SUCCESSFUL, PAYMENT_METHODS.CARD, 1),
    mk(cust1, prov1, 2500, PAYMENT_STATUSES.PENDING, PAYMENT_METHODS.CASH, 2),
    mk(cust1, prov2, 7500, PAYMENT_STATUSES.FAILED, PAYMENT_METHODS.WALLET, 5),
    mk(cust2, prov2, 3000, PAYMENT_STATUSES.SUCCESSFUL, PAYMENT_METHODS.BANK_TRANSFER, 3),
    mk(cust2, prov1, 4200, PAYMENT_STATUSES.REFUNDED, PAYMENT_METHODS.CARD, 10),
    mk(cust2, prov2, 1800, PAYMENT_STATUSES.SUCCESSFUL, PAYMENT_METHODS.CARD, 0)
  ]);

  const app = express();
  app.use(express.json());
  app.use("/api/payments", customerRouter);
  app.use("/api/admin/payments", adminRouter);

  await new Promise((resolve) => {
    server = app.listen(0, resolve);
  });
  base = `http://localhost:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await mongoose.disconnect();
  await mongod.stop();
});

test("admin sees all payments", async () => {
  const { status, body } = await get("/api/admin/payments", ADMIN);
  assert.equal(status, 200);
  assert.equal(body.pagination.total, 6);
});

test("admin can filter by status", async () => {
  const { status, body } = await get("/api/admin/payments?status=Successful", ADMIN);
  assert.equal(status, 200);
  assert.equal(body.data.length, 3);
  assert.ok(body.data.every((p) => p.payment_status === "Successful"));
});

test("pagination works", async () => {
  const { body } = await get("/api/admin/payments?limit=2&page=1", ADMIN);
  assert.equal(body.data.length, 2);
  assert.equal(body.pagination.totalPages, 3);
});

test("invalid status gives 400", async () => {
  const { status } = await get("/api/admin/payments?status=Wrong", ADMIN);
  assert.equal(status, 400);
});

test("customer sees only own payments", async () => {
  const { status, body } = await get("/api/payments", asCustomer(user1));
  assert.equal(status, 200);
  assert.equal(body.data.length, 3);
  assert.ok(body.data.every((p) => String(p.customer_id) === String(cust1._id)));
});

test("other customer sees only their own payments", async () => {
  const { body } = await get("/api/payments", asCustomer(user2));
  assert.equal(body.data.length, 3);
  assert.ok(body.data.every((p) => String(p.customer_id) === String(cust2._id)));
});

test("unknown user gives 404", async () => {
  const { status } = await get("/api/payments", asCustomer(new mongoose.Types.ObjectId()));
  assert.equal(status, 404);
});

test("customer cannot use admin endpoint", async () => {
  const { status } = await get("/api/admin/payments", asCustomer(user1));
  assert.equal(status, 403);
});

test("no role gives 403", async () => {
  const { status } = await get("/api/admin/payments");
  assert.equal(status, 403);
});

test("detail shows safe fields only", async () => {
  const list = await get("/api/admin/payments", ADMIN);
  const id = list.body.data[0]._id;
  const { status, body } = await get(`/api/admin/payments/${id}`, ADMIN);
  assert.equal(status, 200);
  assert.ok(body.data.customer_id.profile_details.first_name);
  assert.ok(body.data.provider_id.business_information.business_name);
  assert.ok(!JSON.stringify(body).includes("SECRET"));
});

test("bad id gives 400", async () => {
  const { status } = await get("/api/admin/payments/abc", ADMIN);
  assert.equal(status, 400);
});

test("valid but missing id gives 404", async () => {
  const fakeId = new mongoose.Types.ObjectId();
  const { status } = await get(`/api/admin/payments/${fakeId}`, ADMIN);
  assert.equal(status, 404);
});