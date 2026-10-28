const { USER_ROLES } = require("../constants/enums");

// TEMPORARY dev-only stub. Developer 01 will replace this with real JWT auth.
// Keep the export names (authenticate, authorize) so routes don't change.
function authenticate(req, res, next) {
  if (process.env.NODE_ENV !== "development") {
    return res.status(501).json({
      success: false,
      message: "Authentication not implemented yet"
    });
  }

  const role = req.header("x-dev-role");
  if (!Object.values(USER_ROLES).includes(role)) {
    return res.status(401).json({ success: false, message: "Unauthenticated" });
  }

  req.user = {
    id: req.header("x-dev-user-id") || null,
    role,
    customerId: req.header("x-dev-customer-id") || null
  };
  next();
}

function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }
    next();
  };
}

module.exports = { authenticate, authorize };