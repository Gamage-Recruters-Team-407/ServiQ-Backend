const discoveryService = require("../services/discoveryService");
const {
  searchServicesQuerySchema,
  providerDiscoveryQuerySchema,
  featuredQuerySchema
} = require("../validations/discoveryValidation");

/**
 * Controller for Service Discovery Module (Developer 06)
 */
class DiscoveryController {
  /**
   * Search and filter services
   * GET /api/discovery/search
   */
  async search(req, res) {
    try {
      const validation = searchServicesQuerySchema.safeParse(req.query);

      if (!validation.success) {
        return res.status(400).json({
          success: false,
          message: "Invalid search query parameters",
          errors: validation.error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message
          }))
        });
      }

      const results = await discoveryService.searchServices(validation.data);

      return res.status(200).json({
        success: true,
        message: "Services retrieved successfully",
        data: results.items,
        pagination: results.pagination,
        filtersApplied: validation.data,
        isMockData: results.isMock
      });
    } catch (error) {
      console.error("Discovery search error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to search services",
        error: error.message
      });
    }
  }

  /**
   * Discover and filter Providers
   * GET /api/discovery/providers
   */
  async getProviders(req, res) {
    try {
      const validation = providerDiscoveryQuerySchema.safeParse(req.query);

      if (!validation.success) {
        return res.status(400).json({
          success: false,
          message: "Invalid provider query parameters",
          errors: validation.error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message
          }))
        });
      }

      const results = await discoveryService.getProviders(validation.data);

      return res.status(200).json({
        success: true,
        message: "Providers retrieved successfully",
        data: results.items,
        pagination: results.pagination,
        filtersApplied: validation.data,
        isMockData: results.isMock
      });
    } catch (error) {
      console.error("Discovery getProviders error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to retrieve providers",
        error: error.message
      });
    }
  }

  /**
   * Get featured services, categories, and top providers
   * GET /api/discovery/featured
   */
  async getFeatured(req, res) {
    try {
      const validation = featuredQuerySchema.safeParse(req.query);

      if (!validation.success) {
        return res.status(400).json({
          success: false,
          message: "Invalid featured query parameters",
          errors: validation.error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message
          }))
        });
      }

      const results = await discoveryService.getFeatured(validation.data);

      return res.status(200).json({
        success: true,
        message: "Featured discovery data retrieved successfully",
        data: results,
        isMockData: results.isMock
      });
    } catch (error) {
      console.error("Discovery getFeatured error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to retrieve featured discovery data",
        error: error.message
      });
    }
  }
}

module.exports = new DiscoveryController();
