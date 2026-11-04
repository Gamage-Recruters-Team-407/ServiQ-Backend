const express = require("express");
const { USER_ROLES } = require("../constants/enums");
const { requireAuth, requireRole } = require("../middlewares/auth.middleware");
const controller = require("../controllers/payment.controller");

const customerRouter = express.Router();
const adminRouter = express.Router();

// /api/payments
customerRouter.get("/", requireAuth, requireRole(USER_ROLES.CUSTOMER), controller.getMyPayments);

// /api/admin/payments
adminRouter.use(requireAuth, requireRole(USER_ROLES.ADMIN));
adminRouter.get("/", controller.getAllPayments);
adminRouter.get("/:id", controller.getPaymentDetails);

module.exports = { customerRouter, adminRouter };