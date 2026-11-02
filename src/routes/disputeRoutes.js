const express = require("express");
const defaultDisputeController = require("../controllers/disputeController");
const {
  createDisputeSchema,
  addEvidenceSchema,
  updateDisputeStatusSchema,
  resolveDisputeSchema,
  getDisputesQuerySchema,
  disputeIdParamSchema,
  validate: defaultValidate
} = require("../validations/disputeValidation");
const { USER_ROLES } = require("../constants/enums");

/**
 * Creates Customer & Provider Dispute Routes (mounted at /api/disputes)
 * Supports dependency injection for authentication, authorization, validation and controller.
 */
function createDisputeRoutes({
  authenticate,
  authorizeRole,
  validate = defaultValidate,
  controller = defaultDisputeController
} = {}) {
  const router = express.Router();

  const authMiddleware =
    typeof authenticate === "function" ? authenticate : (req, res, next) => next();

  const adminOnly =
    typeof authorizeRole === "function"
      ? authorizeRole([USER_ROLES.ADMIN])
      : (req, res, next) => {
          if (req.user && req.user.user_role !== USER_ROLES.ADMIN) {
            return res.status(403).json({
              success: false,
              message: "Access denied. Administrator privileges required."
            });
          }
          next();
        };

  // ==========================================
  // CUSTOMER / PROVIDER DISPUTE ROUTES
  // ==========================================

  // POST /api/disputes - Create a dispute for an eligible booking
  router.post(
    "/",
    authMiddleware,
    validate(createDisputeSchema),
    controller.createDispute
  );

  // GET /api/disputes - List authenticated user's disputes
  router.get(
    "/",
    authMiddleware,
    validate(getDisputesQuerySchema),
    controller.getUserDisputes
  );

  // GET /api/disputes/admin (or /api/disputes/admin/all) - View all platform disputes
  router.get(
    "/admin",
    authMiddleware,
    adminOnly,
    validate(getDisputesQuerySchema),
    controller.getAdminDisputes
  );

  router.get(
    "/admin/all",
    authMiddleware,
    adminOnly,
    validate(getDisputesQuerySchema),
    controller.getAdminDisputes
  );

  // GET /api/disputes/:id - Get dispute details & attached evidence
  router.get(
    "/:id",
    authMiddleware,
    validate(disputeIdParamSchema),
    controller.getDisputeDetails
  );

  // POST /api/disputes/:id/evidence - Add evidence to an existing dispute
  router.post(
    "/:id/evidence",
    authMiddleware,
    validate(addEvidenceSchema),
    controller.addEvidence
  );

  // PATCH /api/disputes/admin/:id/status - Update investigation status
  router.patch(
    "/admin/:id/status",
    authMiddleware,
    adminOnly,
    validate(updateDisputeStatusSchema),
    controller.updateDisputeStatus
  );

  // PATCH /api/disputes/admin/:id/resolve - Finalize dispute resolution
  router.patch(
    "/admin/:id/resolve",
    authMiddleware,
    adminOnly,
    validate(resolveDisputeSchema),
    controller.resolveDispute
  );

  return router;
}

/**
 * Creates Dedicated Admin Dispute Routes (mounted at /api/admin/disputes)
 */
function createAdminDisputeRoutes({
  authenticate,
  authorizeRole,
  validate = defaultValidate,
  controller = defaultDisputeController
} = {}) {
  const router = express.Router();

  const authMiddleware =
    typeof authenticate === "function" ? authenticate : (req, res, next) => next();

  const adminOnly =
    typeof authorizeRole === "function"
      ? authorizeRole([USER_ROLES.ADMIN])
      : (req, res, next) => {
          if (req.user && req.user.user_role !== USER_ROLES.ADMIN) {
            return res.status(403).json({
              success: false,
              message: "Access denied. Administrator privileges required."
            });
          }
          next();
        };

  // GET /api/admin/disputes
  router.get(
    "/",
    authMiddleware,
    adminOnly,
    validate(getDisputesQuerySchema),
    controller.getAdminDisputes
  );

  // PATCH /api/admin/disputes/:id/status
  router.patch(
    "/:id/status",
    authMiddleware,
    adminOnly,
    validate(updateDisputeStatusSchema),
    controller.updateDisputeStatus
  );

  // PATCH /api/admin/disputes/:id/resolve
  router.patch(
    "/:id/resolve",
    authMiddleware,
    adminOnly,
    validate(resolveDisputeSchema),
    controller.resolveDispute
  );

  return router;
}

module.exports = createDisputeRoutes;
module.exports.createDisputeRoutes = createDisputeRoutes;
module.exports.createAdminDisputeRoutes = createAdminDisputeRoutes;
