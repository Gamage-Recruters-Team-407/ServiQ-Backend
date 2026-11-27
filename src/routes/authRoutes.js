const express = require("express");
const { authController } = require("../controllers/authController");
const { authenticate, validateBody } = require("../middlewares/authMiddleware");
const { createRateLimiter } = require("../middlewares/rateLimiter");
const {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  verifyOtpSchema,
  resetPasswordSchema
} = require("../validations/authValidation");

function createAuthRouter({
  controller = authController,
  authMiddleware = authenticate
} = {}) {
  const router = express.Router();

  const loginLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    maxRequests: 20,
    message: "Too many sign-in attempts. Please try again in a few minutes."
  });

  const otpLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    maxRequests: 10,
    message: "Too many password reset requests. Please wait before trying again."
  });

  router.post("/register", loginLimiter, validateBody(registerSchema), controller.register);
  router.post("/login", loginLimiter, validateBody(loginSchema), controller.login);
  router.post("/logout", controller.logout);
  router.get("/me", authMiddleware, controller.me);
  router.post(
    "/forgot-password",
    otpLimiter,
    validateBody(forgotPasswordSchema),
    controller.forgotPassword
  );
  router.post("/verify-otp", otpLimiter, validateBody(verifyOtpSchema), controller.verifyOtp);
  router.post(
    "/reset-password",
    otpLimiter,
    validateBody(resetPasswordSchema),
    controller.resetPassword
  );

  return router;
}

module.exports = createAuthRouter();
module.exports.createAuthRouter = createAuthRouter;
