// Shared auth contract (owned by the Authentication developer).
// Working placeholder so modules like Notifications run end-to-end today. Replace the internals
// freely as long as `authenticate` / `authorize(...roles)` keep working and set
// `req.user = { id, role, account_status }`.
const jwt = require("jsonwebtoken");
const AppError = require("../utils/AppError");
const { USER_STATUSES } = require("../constants/enums");
const User = require("../models/User");

const authenticate = async (req, res, next) => {
  const [scheme, token] = (req.headers.authorization || "").split(" ");
  if (scheme !== "Bearer" || !token) throw new AppError("Authentication required", 401, "UNAUTHENTICATED");
  if (!process.env.JWT_SECRET) throw new AppError("Server authentication is not configured", 500, "AUTH_NOT_CONFIGURED");

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    if (err.name === "TokenExpiredError") throw new AppError("Session expired", 401, "TOKEN_EXPIRED");
    throw new AppError("Invalid token", 401, "INVALID_TOKEN");
  }

  const user = await User.findById(payload.id || payload.sub).select("user_role account_status");
  if (!user) throw new AppError("Account not found", 401, "UNAUTHENTICATED");
  if (user.account_status !== USER_STATUSES.ACTIVE) throw new AppError("Account is not active", 403, "ACCOUNT_NOT_ACTIVE");

  req.user = { id: String(user._id), role: user.user_role, account_status: user.account_status };
  next();
};

const authorize = (...roles) => (req, res, next) => {
  if (!req.user) throw new AppError("Authentication required", 401, "UNAUTHENTICATED");
  if (roles.length && !roles.includes(req.user.role)) {
    throw new AppError("You do not have permission to perform this action", 403, "FORBIDDEN");
  }
  next();
};

module.exports = { authenticate, authorize };
