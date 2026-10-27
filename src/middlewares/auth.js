const User = require("../models/User");
const { verifyToken } = require("../utils/jwt");
const { USER_STATUSES } = require("../constants/enums");

/**
 * Authentication Middleware
 * Protects routes by requiring a valid JWT Bearer token
 * Also validates user account status (active/suspended)
 */
async function authenticate(req, res, next) {
  try {
    let token = null;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication required. No token provided."
      });
    }

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (jwtErr) {
      if (jwtErr.name === "TokenExpiredError") {
        return res.status(401).json({
          success: false,
          code: "TOKEN_EXPIRED",
          message: "Session has expired. Please log in again."
        });
      }
      return res.status(401).json({
        success: false,
        message: "Invalid authentication token."
      });
    }

    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Account not found or no longer exists."
      });
    }

    // Check account status
    if (user.account_status === USER_STATUSES.SUSPENDED) {
      return res.status(403).json({
        success: false,
        code: "ACCOUNT_SUSPENDED",
        message: "Your account has been suspended. Please contact customer support."
      });
    }

    if (user.account_status === USER_STATUSES.INACTIVE) {
      return res.status(403).json({
        success: false,
        code: "ACCOUNT_INACTIVE",
        message: "Your account is currently inactive."
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error during authentication."
    });
  }
}

/**
 * Role Guard Middleware
 * Restricts access to specific user roles
 * @param  {...string} allowedRoles
 */
function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required."
      });
    }

    if (!allowedRoles.includes(req.user.user_role)) {
      return res.status(403).json({
        success: false,
        code: "ROLE_UNAUTHORIZED",
        message: `Access denied. Requires one of the following roles: [${allowedRoles.join(", ")}]. Your role: ${req.user.user_role}`
      });
    }

    next();
  };
}

module.exports = {
  authenticate,
  protect: authenticate,
  authorizeRoles
};
