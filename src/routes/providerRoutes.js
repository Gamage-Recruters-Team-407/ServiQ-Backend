
const express = require("express");

const {
  authenticate,
  authorizeRoles
} = require("../middlewares/auth");

const { USER_ROLES } = require("../constants/enums");

const controller = require("../controllers/providerController");

const router = express.Router();

// Public provider profiles
router.get("/", controller.list);

// Create a provider profile
router.post(
  "/",
  authenticate,
  authorizeRoles(USER_ROLES.PROVIDER),
  controller.create
);

// Get the logged-in provider's profile
router.get(
  "/me",
  authenticate,
  authorizeRoles(USER_ROLES.PROVIDER),
  controller.getMine
);

// Update the logged-in provider's profile
router.patch(
  "/me",
  authenticate,
  authorizeRoles(USER_ROLES.PROVIDER),
  controller.updateMine
);

// Get a public provider profile by ID
// Keep this AFTER the /me routes.
router.get("/:id", controller.getById);

module.exports = router;
