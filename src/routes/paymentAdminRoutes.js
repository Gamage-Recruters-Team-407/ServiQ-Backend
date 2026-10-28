const express = require("express");
const { authenticate, authorize } = require("../middlewares/auth");
const { USER_ROLES } = require("../constants/enums");
const controller = require("../controllers/paymentAdminController");

const router = express.Router();

router.get(
  "/payments",
  authenticate,
  authorize(USER_ROLES.CUSTOMER, USER_ROLES.ADMIN),
  controller.listMyPayments
);

router.get(
  "/admin/payments",
  authenticate,
  authorize(USER_ROLES.ADMIN),
  controller.adminListPayments
);

router.get(
  "/admin/payments/:id",
  authenticate,
  authorize(USER_ROLES.ADMIN),
  controller.adminGetPayment
);

module.exports = router;