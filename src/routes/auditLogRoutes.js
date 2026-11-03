const express = require("express");
const { authenticate, authorizeRoles } = require("../middlewares/auth");
const { USER_ROLES } = require("../constants/enums");
const auditLogController = require("../controllers/auditLogController");

const router = express.Router();

router.use(authenticate, authorizeRoles(USER_ROLES.ADMIN));
router.get("/", auditLogController.list);

module.exports = router;
