const express = require("express");

const {
  authenticate,
  authorizeRoles
} = require("../middlewares/auth");

const { USER_ROLES } = require("../constants/enums");

const controller = require("../controllers/providerServicesController");

const router = express.Router();

router.use(
  authenticate,
  authorizeRoles(USER_ROLES.PROVIDER)
);

router.get("/", controller.list);

router.post("/", controller.create);

router.get("/:id", controller.getById);

router.patch("/:id/status", controller.changeStatus);

router.patch("/:id/restore", controller.restore);

router.patch("/:id", controller.update);

router.delete("/:id", controller.remove);

module.exports = router;