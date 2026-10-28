const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { generateToken, verifyToken } = require("../src/utils/jwt");
const { registerSchema, loginSchema } = require("../src/validations/authValidation");
const { authenticate, authorizeRoles } = require("../src/middlewares/auth");
const { USER_ROLES, USER_STATUSES } = require("../src/constants/enums");
const authController = require("../src/controllers/authController");

describe("Developer 01 - Authentication & User Accounts Verification", () => {
  describe("1. JWT Token Utility", () => {
    it("should correctly sign and verify a token with payload", () => {
      const mockUser = {
        _id: "660c1234567890abcdef1234",
        email: "test.customer@serviq.lk",
        user_role: USER_ROLES.CUSTOMER,
        account_status: USER_STATUSES.ACTIVE
      };

      const token = generateToken(mockUser);
      assert.ok(token, "Token should be generated");
      assert.equal(typeof token, "string");

      const decoded = verifyToken(token);
      assert.equal(decoded.id, mockUser._id);
      assert.equal(decoded.email, mockUser.email);
      assert.equal(decoded.role, USER_ROLES.CUSTOMER);
      assert.equal(decoded.status, USER_STATUSES.ACTIVE);
    });
  });

  describe("2. Auth Request Validation Schemas", () => {
    it("should accept valid registration data", () => {
      const validData = {
        first_name: "Ayesh",
        last_name: "Dilshan",
        email: "ayesh.dilshan@example.com",
        phone_number: "+94 77 123 4567",
        password: "securePassword123",
        user_role: USER_ROLES.CUSTOMER
      };

      const result = registerSchema.safeParse(validData);
      assert.equal(result.success, true);
      assert.equal(result.data.first_name, "Ayesh");
      assert.equal(result.data.email, "ayesh.dilshan@example.com");
    });

    it("should reject registration with invalid email", () => {
      const invalidData = {
        first_name: "Ayesh",
        last_name: "Dilshan",
        email: "not-an-email",
        password: "password123"
      };

      const result = registerSchema.safeParse(invalidData);
      assert.equal(result.success, false);
      assert.ok(result.error.issues.some((i) => i.path.includes("email")));
    });

    it("should reject registration with password under 6 characters", () => {
      const invalidData = {
        first_name: "Ayesh",
        last_name: "Dilshan",
        email: "ayesh@example.com",
        password: "123"
      };

      const result = registerSchema.safeParse(invalidData);
      assert.equal(result.success, false);
      assert.ok(result.error.issues.some((i) => i.path.includes("password")));
    });

    it("should accept valid login data", () => {
      const validLogin = {
        email: "ayesh.dilshan@example.com",
        password: "password123"
      };

      const result = loginSchema.safeParse(validLogin);
      assert.equal(result.success, true);
    });
  });

  describe("3. Middleware & Role Guards", () => {
    it("should deny access when no Authorization header is provided", async () => {
      const req = { headers: {} };
      let statusCode = null;
      let jsonPayload = null;

      const res = {
        status: (code) => {
          statusCode = code;
          return {
            json: (data) => {
              jsonPayload = data;
            }
          };
        }
      };

      await authenticate(req, res, () => {});
      assert.equal(statusCode, 401);
      assert.equal(jsonPayload.success, false);
    });

    it("authorizeRoles should allow authorized roles and reject unauthorized ones", () => {
      const middleware = authorizeRoles(USER_ROLES.PROVIDER, USER_ROLES.ADMIN);

      // Provider request -> Should proceed (next called)
      let nextCalled = false;
      const validReq = {
        user: { user_role: USER_ROLES.PROVIDER }
      };
      middleware(validReq, {}, () => {
        nextCalled = true;
      });
      assert.equal(nextCalled, true, "Provider should be authorized");

      // Customer request -> Should be rejected with 403
      let forbiddenStatus = null;
      let forbiddenPayload = null;
      const invalidReq = {
        user: { user_role: USER_ROLES.CUSTOMER }
      };
      const res = {
        status: (code) => {
          forbiddenStatus = code;
          return {
            json: (data) => {
              forbiddenPayload = data;
            }
          };
        }
      };

      middleware(invalidReq, res, () => {});
      assert.equal(forbiddenStatus, 403);
      assert.equal(forbiddenPayload.code, "ROLE_UNAUTHORIZED");
    });
  });

  describe("4. Required Endpoints Exists in Controller & Routes", () => {
    it("should expose register, login, logout, getMe handlers", () => {
      assert.equal(typeof authController.register, "function", "register handler must be defined");
      assert.equal(typeof authController.login, "function", "login handler must be defined");
      assert.equal(typeof authController.logout, "function", "logout handler must be defined");
      assert.equal(typeof authController.getMe, "function", "getMe handler must be defined");
    });

    it("logout handler should return 200 with success response", async () => {
      let statusCode = null;
      let jsonPayload = null;
      const res = {
        status: (code) => {
          statusCode = code;
          return {
            json: (data) => {
              jsonPayload = data;
            }
          };
        }
      };

      await authController.logout({}, res);
      assert.equal(statusCode, 200);
      assert.equal(jsonPayload.success, true);
    });
  });

  describe("5. AuthService Architecture (backend/src/services)", () => {
    it("should export authService with registerUser, loginUser, getUserProfile methods", () => {
      const { authService } = require("../src/services");
      assert.ok(authService, "authService must be exported from services");
      assert.equal(typeof authService.registerUser, "function");
      assert.equal(typeof authService.loginUser, "function");
      assert.equal(typeof authService.getUserProfile, "function");
    });
  });
});

