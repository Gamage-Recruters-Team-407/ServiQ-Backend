const authService = require("../services/authService");
const { registerSchema, loginSchema } = require("../validations/authValidation");

/**
 * Register a new User
 * Delegates business logic to AuthService
 * Route: POST /api/auth/register
 */
async function register(req, res) {
  try {
    const parseResult = registerSchema.safeParse(req.body);
    if (!parseResult.success) {
      const errorMessage = parseResult.error.issues
        ? parseResult.error.issues[0].message
        : "Validation failed";
      return res.status(400).json({
        success: false,
        message: errorMessage,
        errors: parseResult.error.issues
      });
    }

    const { user, token } = await authService.registerUser(parseResult.data);

    return res.status(201).json({
      success: true,
      message: "Account created successfully.",
      token,
      user
    });
  } catch (error) {
    console.error("Register Error:", error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to create account. Please try again later."
    });
  }
}

/**
 * Login user with email/phone & password
 * Delegates business logic to AuthService
 * Route: POST /api/auth/login
 */
async function login(req, res) {
  try {
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      const errorMessage = parseResult.error.issues
        ? parseResult.error.issues[0].message
        : "Validation failed";
      return res.status(400).json({
        success: false,
        message: errorMessage
      });
    }

    const { user, token } = await authService.loginUser(parseResult.data);

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      token,
      user
    });
  } catch (error) {
    console.error("Login Error:", error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      code: error.code,
      message: error.message || "An unexpected error occurred during login. Please try again."
    });
  }
}

/**
 * Logout user
 * Route: POST /api/auth/logout
 */
async function logout(req, res) {
  return res.status(200).json({
    success: true,
    message: "Logged out successfully."
  });
}

/**
 * Get current authenticated user details
 * Route: GET /api/auth/me
 */
async function getMe(req, res) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated"
      });
    }

    const userProfile = await authService.getUserProfile(req.user._id || req.user.id);

    return res.status(200).json({
      success: true,
      user: userProfile
    });
  } catch (error) {
    console.error("GetMe Error:", error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to retrieve user profile."
    });
  }
}

/**
 * Request OTP for password reset
 * Route: POST /api/auth/forgot-password
 */
async function forgotPassword(req, res) {
  try {
    const { identifier } = req.body;
    if (!identifier) {
      return res.status(400).json({
        success: false,
        message: "Email address or phone number is required."
      });
    }

    const result = await authService.requestPasswordReset(identifier);
    return res.status(200).json(result);
  } catch (error) {
    console.error("Forgot Password Error:", error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to process password reset request."
    });
  }
}

/**
 * Reset password using OTP
 * Route: POST /api/auth/reset-password
 */
async function resetPassword(req, res) {
  try {
    const { identifier, otp, newPassword } = req.body;
    const result = await authService.resetPassword({ identifier, otp, newPassword });
    return res.status(200).json(result);
  } catch (error) {
    console.error("Reset Password Error:", error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to reset password."
    });
  }
}

module.exports = {
  register,
  login,
  logout,
  getMe,
  forgotPassword,
  resetPassword
};

