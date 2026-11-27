const express = require("express");
const { customerController } = require("../controllers/customerController");
const { authenticate, authorizeRoles, validateBody } = require("../middlewares/authMiddleware");
const { updateCustomerProfileSchema } = require("../validations/customerValidation");
const { USER_ROLES } = require("../constants/enums");

function createCustomerRouter({
  controller = customerController,
  authMiddleware = authenticate
} = {}) {
  const router = express.Router();

  // All routes are protected and restricted to CUSTOMER role only
  router.use(authMiddleware);
  router.use(authorizeRoles(USER_ROLES.CUSTOMER));

  router.get("/", controller.getProfile);
  router.put("/", validateBody(updateCustomerProfileSchema), controller.updateProfile);
  router.delete("/", controller.deleteAccount);

  return router;
}

module.exports = createCustomerRouter();
module.exports.createCustomerRouter = createCustomerRouter;