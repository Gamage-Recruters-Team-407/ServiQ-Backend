const express = require("express");

const { authenticate, authorizeRoles } = require("../middlewares/auth");
const { USER_ROLES } = require("../constants/enums");
const controller = require("../controllers/providerBookingController");

const router = express.Router();

router.use(authenticate, authorizeRoles(USER_ROLES.PROVIDER));

router.get("/", controller.list);
router.get("/:id", controller.getById);
router.patch("/:id/accept", controller.accept);
router.patch("/:id/reject", controller.reject);

module.exports = router;
