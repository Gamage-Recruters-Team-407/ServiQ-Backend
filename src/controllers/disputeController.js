const defaultDisputeService = require("../services/disputeService");
const { DisputeError } = require("../services/disputeService");

/**
 * Centralized error handler for dispute controller operations
 */
function handleControllerError(res, error, defaultMessage) {
  if (error instanceof DisputeError) {
    return res.status(error.status).json({
      success: false,
      message: error.message
    });
  }

  console.error(`${defaultMessage}:`, error);
  return res.status(500).json({
    success: false,
    message: "Internal server error"
  });
}

/**
 * Creates Dispute Controller handlers with optional service injection for testing
 */
function createDisputeController(disputeService = defaultDisputeService) {
  return {
    /**
     * POST /api/disputes - Create a dispute for a booking
     */
    async createDispute(req, res) {
      try {
        const { booking_id, dispute_category, description, initial_evidence } = req.body;
        const result = await disputeService.createDispute({
          bookingId: booking_id,
          user: req.user,
          category: dispute_category,
          description,
          initialEvidence: initial_evidence
        });

        return res.status(201).json({
          success: true,
          message: "Dispute submitted successfully",
          data: result
        });
      } catch (error) {
        return handleControllerError(res, error, "Failed to create dispute");
      }
    },

    /**
     * GET /api/disputes - List authenticated user's disputes
     */
    async getUserDisputes(req, res) {
      try {
        const result = await disputeService.getDisputes({
          user: req.user,
          filters: req.query,
          isAdmin: false
        });

        return res.status(200).json({
          success: true,
          message: "User disputes retrieved successfully",
          data: result
        });
      } catch (error) {
        return handleControllerError(res, error, "Failed to retrieve user disputes");
      }
    },

    /**
     * GET /api/disputes/:id - Get dispute details and attached evidence
     */
    async getDisputeDetails(req, res) {
      try {
        const result = await disputeService.getDisputeById({
          disputeId: req.params.id,
          user: req.user
        });

        return res.status(200).json({
          success: true,
          message: "Dispute details retrieved successfully",
          data: result
        });
      } catch (error) {
        return handleControllerError(res, error, "Failed to retrieve dispute details");
      }
    },

    /**
     * POST /api/disputes/:id/evidence - Attach evidence to an open dispute
     */
    async addEvidence(req, res) {
      try {
        const result = await disputeService.addEvidence({
          disputeId: req.params.id,
          user: req.user,
          evidenceData: req.body
        });

        return res.status(201).json({
          success: true,
          message: "Evidence attached successfully",
          data: result
        });
      } catch (error) {
        return handleControllerError(res, error, "Failed to add evidence");
      }
    },

    /**
     * GET /api/admin/disputes - Admin list all disputes
     */
    async getAdminDisputes(req, res) {
      try {
        const result = await disputeService.getDisputes({
          user: req.user,
          filters: req.query,
          isAdmin: true
        });

        return res.status(200).json({
          success: true,
          message: "All disputes retrieved successfully for admin",
          data: result
        });
      } catch (error) {
        return handleControllerError(res, error, "Failed to retrieve admin disputes");
      }
    },

    /**
     * PATCH /api/admin/disputes/:id/status - Update investigation status
     */
    async updateDisputeStatus(req, res) {
      try {
        const { dispute_status, assigned_reviewer } = req.body;
        const result = await disputeService.updateDisputeStatus({
          disputeId: req.params.id,
          adminUser: req.user,
          newStatus: dispute_status,
          assignedReviewer: assigned_reviewer
        });

        return res.status(200).json({
          success: true,
          message: `Dispute status updated to ${dispute_status}`,
          data: result
        });
      } catch (error) {
        return handleControllerError(res, error, "Failed to update dispute status");
      }
    },

    /**
     * PATCH /api/admin/disputes/:id/resolve - Finalize dispute resolution
     */
    async resolveDispute(req, res) {
      try {
        const { resolution_outcome, resolution_notes } = req.body;
        const result = await disputeService.resolveDispute({
          disputeId: req.params.id,
          adminUser: req.user,
          outcome: resolution_outcome,
          notes: resolution_notes
        });

        return res.status(200).json({
          success: true,
          message: "Dispute resolved successfully",
          data: result
        });
      } catch (error) {
        return handleControllerError(res, error, "Failed to resolve dispute");
      }
    }
  };
}

const defaultController = createDisputeController(defaultDisputeService);

module.exports = {
  createDisputeController,
  ...defaultController
};
