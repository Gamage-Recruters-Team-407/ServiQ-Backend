const { describe, it, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const { PassThrough } = require("node:stream");
const http = require("node:http");
const express = require("express");
const mongoose = require("mongoose");

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = process.env.JWT_SECRET || "serviq-test-secret-key-2026";
process.env.JWT_EXPIRES_IN = "1d";

const { USER_ROLES, USER_STATUSES, PROVIDER_TYPES } = require("../src/constants/enums");
const { createAuthService } = require("../src/services/authService");
const { createPasswordResetStore } = require("../src/services/passwordResetStore");
const { isEmailConfigured, sendPasswordResetOtpEmail } = require("../src/integrations/emailService");
const { createAuthController } = require("../src/controllers/authController");
const { createAuthRouter } = require("../src/routes/authRoutes");
const {
  createAuthenticateMiddleware,
  authorizeRoles
} = require("../src/middlewares/authMiddleware");
const { errorHandler, notFoundHandler } = require("../src/middlewares/errorMiddleware");
const { registerSchema } = require("../src/validations/authValidation");

function createInMemoryModels() {
  const users = [];
  const customers = [];
  const providers = [];

  const wrapUserDoc = (doc) => ({
    ...doc,
    toObject() {
      return { ...this };
    },
    async save() {
      const idx = users.findIndex((u) => String(u._id) === String(this._id));
      if (idx >= 0) {
        users[idx] = { ...this };
      }
      return this;
    }
  });

  const UserModel = {
    findOne(query) {
      const found = users.find((u) =>
        Object.entries(query).every(([k, v]) => u[k] === v)
      );
      const result = found ? wrapUserDoc(found) : null;
      return {
        select() {
          return Promise.resolve(result);
        },
        then(resolve, reject) {
          return Promise.resolve(result).then(resolve, reject);
        }
      };
    },
    async findById(id) {
      const found = users.find((u) => String(u._id) === String(id));
      return found ? wrapUserDoc(found) : null;
    },
    async create(payload) {
      const doc = {
        _id: new mongoose.Types.ObjectId(),
        ...payload,
        is_email_verified: false,
        is_phone_verified: false,
        last_login_at: null,
        created_at: new Date(),
        updated_at: new Date()
      };
      users.push(doc);
      return wrapUserDoc(doc);
    }
  };

  const CustomerModel = {
    async findOne(query) {
      return customers.find((c) => String(c.user_id) === String(query.user_id)) || null;
    },
    async findOneAndUpdate(query, update) {
      let existing = customers.find((c) => String(c.user_id) === String(query.user_id));
      if (!existing) {
        existing = {
          _id: new mongoose.Types.ObjectId(),
          ...(update.$setOnInsert || {}),
          account_status: "Active"
        };
        customers.push(existing);
      }
      return existing;
    }
  };

  const ProviderModel = {
    async findOne(query) {
      return providers.find((p) => String(p.user_id) === String(query.user_id)) || null;
    },
    async findOneAndUpdate(query, update) {
      let existing = providers.find((p) => String(p.user_id) === String(query.user_id));
      if (!existing) {
        existing = {
          _id: new mongoose.Types.ObjectId(),
          ...(update.$setOnInsert || {}),
          verification_status: "Pending",
          account_status: "Pending"
        };
        providers.push(existing);
      }
      return existing;
    }
  };

  return { users, customers, providers, UserModel, CustomerModel, ProviderModel };
}

describe("ServiQ Auth Validation & Service", () => {
  let models;
  let issuedOtps;
  let sentEmails;
  let service;

  beforeEach(() => {
    models = createInMemoryModels();
    issuedOtps = [];
    sentEmails = [];
    const resetStore = createPasswordResetStore({ memoryOnly: true });
    service = createAuthService({
      UserModel: models.UserModel,
      CustomerModel: models.CustomerModel,
      ProviderModel: models.ProviderModel,
      resetStore,
      generateOtp: () => {
        const otp = "482910";
        issuedOtps.push(otp);
        return otp;
      },
      sendResetOtpEmail: async (payload) => {
        sentEmails.push(payload);
        return { delivered: true };
      }
    });
  });

  it("rejects self-registration as Administrator via schema validation", () => {
    const parsed = registerSchema.safeParse({
      first_name: "Malicious",
      last_name: "User",
      email: "admin-try@example.com",
      password: "Password123!",
      user_role: USER_ROLES.ADMIN
    });
    assert.equal(parsed.success, false);
  });

  it("registers Customer and Provider accounts with linked profiles and hashed passwords", async () => {
    const customerRes = await service.registerUser({
      first_name: "Ayesh",
      last_name: "Dilshan",
      email: "ayesh@example.com",
      phone_number: "+94771234567",
      password: "Password123!",
      user_role: USER_ROLES.CUSTOMER
    });

    assert.ok(customerRes.token);
    assert.equal(customerRes.user.user_role, USER_ROLES.CUSTOMER);
    assert.equal(customerRes.user.password, undefined);
    assert.equal(models.customers.length, 1);

    const providerRes = await service.registerUser({
      first_name: "Nimal",
      last_name: "Silva",
      email: "nimal@example.com",
      phone_number: "+94779876543",
      password: "Password123!",
      user_role: USER_ROLES.PROVIDER,
      provider_type: PROVIDER_TYPES.BUSINESS
    });

    assert.equal(providerRes.user.user_role, USER_ROLES.PROVIDER);
    assert.equal(models.providers.length, 1);
    assert.equal(models.providers[0].provider_type, PROVIDER_TYPES.BUSINESS);

    await assert.rejects(
      () =>
        service.registerUser({
          first_name: "Dup",
          last_name: "User",
          email: "AYESH@example.com",
          password: "Password123!",
          user_role: USER_ROLES.CUSTOMER
        }),
      (err) => err.statusCode === 409 && err.code === "DUPLICATE_EMAIL"
    );
  });

  it("authenticates by email or phone and enforces account status restrictions", async () => {
    await service.registerUser({
      first_name: "Kamal",
      last_name: "Perera",
      email: "kamal@example.com",
      phone_number: "+94771112233",
      password: "Password123!",
      user_role: USER_ROLES.CUSTOMER
    });

    const emailLogin = await service.loginUser({
      identifier: "kamal@example.com",
      password: "Password123!"
    });
    assert.ok(emailLogin.token);

    const phoneLogin = await service.loginUser({
      identifier: "+94771112233",
      password: "Password123!",
      remember_me: true
    });
    assert.ok(phoneLogin.token);

    await assert.rejects(
      () => service.loginUser({ identifier: "kamal@example.com", password: "WrongPassword" }),
      (err) => err.statusCode === 401
    );

    models.users[0].account_status = USER_STATUSES.SUSPENDED;
    await assert.rejects(
      () => service.loginUser({ identifier: "kamal@example.com", password: "Password123!" }),
      (err) => err.statusCode === 403 && err.code === "ACCOUNT_RESTRICTED"
    );
  });

  it("completes OTP forgot-password and reset-password flow safely", async () => {
    await service.registerUser({
      first_name: "Saman",
      last_name: "Kumara",
      email: "saman@example.com",
      password: "OldPassword123",
      user_role: USER_ROLES.CUSTOMER
    });

    await service.requestPasswordReset({ identifier: "saman@example.com" });
    assert.equal(issuedOtps.length, 1);
    assert.equal(sentEmails.length, 1);
    assert.deepEqual(sentEmails[0], {
      to: "saman@example.com",
      firstName: "Saman",
      otp: "482910"
    });

    await assert.rejects(
      () => service.verifyResetOtp({ identifier: "saman@example.com", otp: "000000" }),
      (err) => err.statusCode === 400
    );

    const verified = await service.verifyResetOtp({
      identifier: "saman@example.com",
      otp: "482910"
    });
    assert.equal(verified.verified, true);

    await service.resetPassword({
      identifier: "saman@example.com",
      otp: "482910",
      new_password: "NewPassword456"
    });

    // Old password rejected, new password accepted, OTP consumed
    await assert.rejects(
      () => service.loginUser({ identifier: "saman@example.com", password: "OldPassword123" }),
      (err) => err.statusCode === 401
    );

    const loginNew = await service.loginUser({
      identifier: "saman@example.com",
      password: "NewPassword456"
    });
    assert.ok(loginNew.token);

    await assert.rejects(
      () =>
        service.resetPassword({
          identifier: "saman@example.com",
          otp: "482910",
          new_password: "AnotherPassword"
        }),
      (err) => err.statusCode === 400
    );
  });
});

async function invokeExpress(app, { method = "GET", url = "/", headers = {}, body = null }) {
  const payload = body !== null ? JSON.stringify(body) : null;
  const socket = new PassThrough();
  socket.remoteAddress = "127.0.0.1";

  const req = new http.IncomingMessage(socket);
  req.method = method;
  req.url = url;
  req.originalUrl = url;
  req.headers = {
    ...(payload
      ? { "content-type": "application/json", "content-length": String(Buffer.byteLength(payload)) }
      : {}),
    ...Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]))
  };

  return new Promise((resolve, reject) => {
    const res = new http.ServerResponse(req);
    const chunks = [];

    res.assignSocket(socket);
    res.write = (chunk) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
      return true;
    };
    const origEnd = res.end.bind(res);
    res.end = (chunk) => {
      if (chunk) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
      }
      const raw = Buffer.concat(chunks).toString("utf8");
      let parsed = raw;
      try {
        parsed = raw ? JSON.parse(raw) : {};
      } catch {
        // keep raw text
      }
      const result = {
        status: res.statusCode,
        headers: res.getHeaders(),
        body: parsed
      };
      res.detachSocket(socket);
      socket.end();
      origEnd();
      resolve(result);
      return res;
    };

    app.handle(req, res, (err) => {
      if (err) return reject(err);
      if (!res.writableEnded) {
        res.end();
      }
    });

    if (payload) {
      req.push(payload);
    }
    req.push(null);
  });
}

describe("ServiQ Auth HTTP Endpoints & RBAC", () => {
  it("supports register, login, /me, logout revocation, RBAC, and password reset over HTTP", async () => {
    const models = createInMemoryModels();
    const resetStore = createPasswordResetStore({ memoryOnly: true });
    const service = createAuthService({
      UserModel: models.UserModel,
      CustomerModel: models.CustomerModel,
      ProviderModel: models.ProviderModel,
      resetStore,
      generateOtp: () => "654321",
      sendResetOtpEmail: async () => ({ delivered: true })
    });

    const controller = createAuthController(service);
    const authMiddleware = createAuthenticateMiddleware({ userModel: models.UserModel });
    const router = createAuthRouter({ controller, authMiddleware });

    const testApp = express();
    testApp.use(express.json());
    testApp.use("/api/auth", router);
    testApp.get(
      "/api/admin-only",
      authMiddleware,
      authorizeRoles(USER_ROLES.ADMIN),
      (req, res) => res.json({ success: true })
    );
    testApp.use(notFoundHandler);
    testApp.use(errorHandler);

    // 1. Register Customer
    const regRes = await invokeExpress(testApp, {
      method: "POST",
      url: "/api/auth/register",
      body: {
        first_name: "Ayesh",
        last_name: "Dilshan",
        email: "ayesh.http@example.com",
        phone_number: "+94771234567",
        password: "Password123!",
        user_role: USER_ROLES.CUSTOMER
      }
    });
    assert.equal(regRes.status, 201);
    assert.equal(regRes.body.success, true);
    assert.ok(regRes.body.token);
    assert.equal(regRes.body.user.password, undefined);

    // 2. Reject Admin self-registration
    const adminRegRes = await invokeExpress(testApp, {
      method: "POST",
      url: "/api/auth/register",
      body: {
        first_name: "Bad",
        last_name: "Actor",
        email: "bad@example.com",
        password: "Password123!",
        user_role: USER_ROLES.ADMIN
      }
    });
    assert.equal(adminRegRes.status, 400);

    // 3. Unauthenticated /me rejected
    const unauthMe = await invokeExpress(testApp, {
      method: "GET",
      url: "/api/auth/me"
    });
    assert.equal(unauthMe.status, 401);

    // 4. Authenticated /me succeeds
    const meRes = await invokeExpress(testApp, {
      method: "GET",
      url: "/api/auth/me",
      headers: { Authorization: `Bearer ${regRes.body.token}` }
    });
    assert.equal(meRes.status, 200);
    assert.equal(meRes.body.user.email, "ayesh.http@example.com");

    // 5. RBAC denies Customer on Admin route
    const rbacRes = await invokeExpress(testApp, {
      method: "GET",
      url: "/api/admin-only",
      headers: { Authorization: `Bearer ${regRes.body.token}` }
    });
    assert.equal(rbacRes.status, 403);

    // 6. Logout revokes token
    const logoutRes = await invokeExpress(testApp, {
      method: "POST",
      url: "/api/auth/logout",
      headers: { Authorization: `Bearer ${regRes.body.token}` }
    });
    assert.equal(logoutRes.status, 200);

    const revokedMe = await invokeExpress(testApp, {
      method: "GET",
      url: "/api/auth/me",
      headers: { Authorization: `Bearer ${regRes.body.token}` }
    });
    assert.equal(revokedMe.status, 401);

    // 7. Forgot password + Reset + Login
    const forgotRes = await invokeExpress(testApp, {
      method: "POST",
      url: "/api/auth/forgot-password",
      body: { identifier: "ayesh.http@example.com" }
    });
    assert.equal(forgotRes.status, 200);

    const resetRes = await invokeExpress(testApp, {
      method: "POST",
      url: "/api/auth/reset-password",
      body: {
        identifier: "ayesh.http@example.com",
        otp: "654321",
        new_password: "NewSecurePassword789"
      }
    });
    assert.equal(resetRes.status, 200);

    const loginRes = await invokeExpress(testApp, {
      method: "POST",
      url: "/api/auth/login",
      body: {
        identifier: "ayesh.http@example.com",
        password: "NewSecurePassword789"
      }
    });
      assert.equal(loginRes.status, 200);
      assert.ok(loginRes.body.token);
  });

  it("detects placeholder vs configured Gmail SMTP credentials safely", async () => {
    const prevUser = process.env.SMTP_USER;
    const prevPass = process.env.SMTP_PASS;

    try {
      process.env.SMTP_USER = "your-gmail@gmail.com";
      process.env.SMTP_PASS = "your-16-char-app-password";
      assert.equal(isEmailConfigured(), false);

      const fallbackRes = await sendPasswordResetOtpEmail({
        to: "user@example.com",
        firstName: "Ayesh",
        otp: "123456"
      });
      assert.deepEqual(fallbackRes, { delivered: false, mode: "dev-console" });

      process.env.SMTP_USER = "serviq.app@gmail.com";
      process.env.SMTP_PASS = "abcd efgh ijkl mnop";
      assert.equal(isEmailConfigured(), true);
    } finally {
      if (prevUser === undefined) delete process.env.SMTP_USER;
      else process.env.SMTP_USER = prevUser;
      if (prevPass === undefined) delete process.env.SMTP_PASS;
      else process.env.SMTP_PASS = prevPass;
    }
  });
});
