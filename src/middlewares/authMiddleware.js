const User = require("../models/User");
const { USER_STATUSES } = require("../constants/enums");
const { AppError, verifyAccessToken } = require("../utils/authUtils");

// In-memory token revocation set keyed by raw JWT until its expiry timestamp
const revokedTokens = new Map();

function pruneRevokedTokens() {
  const now = Date.now();
  for (const [token, expiresAt] of revokedTokens.entries()) {
    if (expiresAt <= now) {
      revokedTokens.delete(token);
    }
  }
}

function revokeToken(token, expSeconds) {
  pruneRevokedTokens();
  const expiresAt = expSeconds ? expSeconds * 1000 : Date.now() + 24 * 60 * 60 * 1000;
  revokedTokens.set(token, expiresAt);
}

function isTokenRevoked(token) {
  pruneRevokedTokens();
  const expiresAt = revokedTokens.get(token);
  return Boolean(expiresAt && expiresAt > Date.now());
}

function extractBearerToken(req) {
  const authHeader = req.headers.authorization || "";
  if (!authHeader.startsWith("Bearer ")) {
    return null;
  }
  const token = authHeader.slice(7).trim();
  return token || null;
}

function validateBody(schema) {
  return (req, res, next) => {
    const parsed = schema.safeParse(req.body || {});
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      return res.status(400).json({
        success: false,
        code: "VALIDATION_ERROR",
        message: firstIssue?.message || "Invalid request input",
        errors: parsed.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message
        }))
      });
    }
    req.validatedBody = parsed.data;
    return next();
  };
}

function createAuthenticateMiddleware({ userModel = User } = {}) {
  return async (req, res, next) => {
    try {
      const token = extractBearerToken(req);
      if (!token) {
        return next(new AppError("Authentication required", 401, "AUTH_REQUIRED"));
      }

      if (isTokenRevoked(token)) {
        return next(
          new AppError("Session has been logged out. Please sign in again.", 401, "SESSION_REVOKED")
        );
      }

      let decoded;
      try {
        decoded = verifyAccessToken(token);
      } catch (err) {
        const message =
          err.name === "TokenExpiredError"
            ? "Session expired. Please sign in again."
            : "Invalid authentication token.";
        return next(new AppError(message, 401, "INVALID_TOKEN"));
      }

      const user = await userModel.findById(decoded.sub);
      if (!user) {
        return next(new AppError("Authenticated account not found", 401, "USER_NOT_FOUND"));
      }

      if (user.account_status !== USER_STATUSES.ACTIVE) {
        return next(
          new AppError(
            `Access denied: account status is ${user.account_status}.`,
            403,
            "ACCOUNT_RESTRICTED"
          )
        );
      }

      req.user = user;
      req.authToken = token;
      req.authClaims = decoded;
      return next();
    } catch (error) {
      return next(error);
    }
  };
}

function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError("Authentication required", 401, "AUTH_REQUIRED"));
    }
    if (!allowedRoles.includes(req.user.user_role)) {
      return next(
        new AppError("You do not have permission to perform this action.", 403, "FORBIDDEN")
      );
    }
    return next();
  };
}

const authenticate = createAuthenticateMiddleware();

module.exports = {
  authenticate,
  createAuthenticateMiddleware,
  authorizeRoles,
  validateBody,
  extractBearerToken,
  revokeToken,
  isTokenRevoked
};
