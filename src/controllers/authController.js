const { authService } = require("../services/authService");
const { extractBearerToken, revokeToken } = require("../middlewares/authMiddleware");
const { verifyAccessToken } = require("../utils/authUtils");

function createAuthController(service = authService) {
  return {
    register: async (req, res, next) => {
      try {
        const result = await service.registerUser(req.validatedBody);
        return res.status(201).json({
          success: true,
          message: "Account registered successfully.",
          ...result
        });
      } catch (error) {
        return next(error);
      }
    },

    login: async (req, res, next) => {
      try {
        const result = await service.loginUser(req.validatedBody);
        return res.status(200).json({
          success: true,
          message: "Signed in successfully.",
          ...result
        });
      } catch (error) {
        return next(error);
      }
    },

    logout: async (req, res, next) => {
      try {
        const token = extractBearerToken(req);
        if (token) {
          try {
            const decoded = verifyAccessToken(token);
            revokeToken(token, decoded?.exp);
          } catch {
            // Invalid or already-expired token still completes logout cleanly
          }
        }
        return res.status(200).json({
          success: true,
          message: "Logged out successfully."
        });
      } catch (error) {
        return next(error);
      }
    },

    me: async (req, res, next) => {
      try {
        const result = await service.getCurrentUserProfile(req.user);
        return res.status(200).json({
          success: true,
          ...result
        });
      } catch (error) {
        return next(error);
      }
    },

    forgotPassword: async (req, res, next) => {
      try {
        const result = await service.requestPasswordReset(req.validatedBody);
        return res.status(200).json({
          success: true,
          ...result
        });
      } catch (error) {
        return next(error);
      }
    },

    verifyOtp: async (req, res, next) => {
      try {
        const result = await service.verifyResetOtp(req.validatedBody);
        return res.status(200).json({
          success: true,
          ...result
        });
      } catch (error) {
        return next(error);
      }
    },

    resetPassword: async (req, res, next) => {
      try {
        const result = await service.resetPassword(req.validatedBody);
        return res.status(200).json({
          success: true,
          ...result
        });
      } catch (error) {
        return next(error);
      }
    }
  };
}

const authController = createAuthController();

module.exports = {
  createAuthController,
  authController
};
