// MOCK AUTH: Replace this with Dev 01's real auth middleware (token verification) when ready.
// Development only. Returns 401 for all requests in production.
// Usage: Set header `x-mock-role: admin` or URL `?mock_role=admin`. Otherwise, use provider role.

const { USER_ROLES } = require("../constants/enums");
const { MOCK_PROVIDER_ID, MOCK_PROVIDER_USER_ID, MOCK_ADMIN_ID } = require("../config/payout.config");

function mockAuth(req, res, next) {
  if (process.env.NODE_ENV === "production") {
    return res.status(401).json({ success: false, message: "Authentication required" });
  }
  const role = String(req.headers["x-mock-role"] || req.query.mock_role || "provider").toLowerCase();
  req.user =
    role === "admin"
      ? { id: MOCK_ADMIN_ID, role: USER_ROLES.ADMIN }
      : { id: MOCK_PROVIDER_USER_ID, role: USER_ROLES.PROVIDER, provider_id: MOCK_PROVIDER_ID };
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (req.user && roles.includes(req.user.role)) return next();
    return res.status(403).json({ success: false, message: "Access denied" });
  };
}

module.exports = { mockAuth, requireRole };