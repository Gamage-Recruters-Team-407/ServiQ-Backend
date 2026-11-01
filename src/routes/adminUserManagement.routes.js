const express = require("express");
const { authenticate, authorizeRoles } = require("../middlewares/auth");
const { USER_ROLES } = require("../constants/enums");
const ctrl = require("../controllers/adminCustomer.controller");

const router = express.Router();

router.use(authenticate, authorizeRoles(USER_ROLES.ADMIN));

router.get("/customers", ctrl.list);
router.get("/customers/:id", ctrl.getOne);
router.patch("/customers/:id/status", ctrl.updateStatus);

module.exports = router;