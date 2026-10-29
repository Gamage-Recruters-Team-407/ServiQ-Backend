const express = require("express");
const { USER_ROLES } = require("../constants/enums");
const { mockAuth, requireRole } = require("../middlewares/mockAuth");
const controller = require("../controllers/payout.controller");

const router = express.Router();

// Apply the middleware to each route, not router.use("/provider").
// Otherwise, it will also affect other developers' /api/provider/... routes.
const providerOnly = [mockAuth, requireRole(USER_ROLES.PROVIDER)];
const adminOnly = [mockAuth, requireRole(USER_ROLES.ADMIN)];

router.post("/provider/payouts", ...providerOnly, controller.createPayout);
router.get("/provider/payouts", ...providerOnly, controller.getMyPayouts);
router.get("/provider/payouts/eligibility", ...providerOnly, controller.getEligibility);
router.get("/admin/payouts", ...adminOnly, controller.getAdminPayouts);
router.patch("/admin/payouts/:id/status", ...adminOnly, controller.updateStatus);

module.exports = router;