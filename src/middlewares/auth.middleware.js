// TEMPORARY. Replace with Dev 01's real auth middleware.
// Works only in development, and only for local testing.
const requireAuth = (req, res, next) => {
  if (process.env.NODE_ENV !== "development") {
    return res.status(401).json({ success: false, message: "Auth not implemented" });
  }
  req.user = {
    role: req.header("x-test-role"),
    id: req.header("x-test-user-id")
  };
  next();
};

const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }
  next();
};

module.exports = { requireAuth, requireRole };