
const {
  ComparisonError,
  getProviderComparison
} = require("../services/comparisonService");

function createComparisonController({ ownerDataSource, maxProviders = 3 }) {
  if (typeof ownerDataSource !== "function") {
    throw new TypeError("A valid comparison data source is required");
  }

  return async function compareProviders(req, res) {
    try {
      const result = await getProviderComparison(
        req.query,
        ownerDataSource,
        maxProviders
      );

      return res.status(200).json(result);
    } catch (error) {
      if (error instanceof ComparisonError) {
        return res.status(error.status).json({
          success: false,
          message: error.message
        });
      }

      console.error("Provider comparison failed:", error);

      return res.status(500).json({
        success: false,
        message: "Internal server error"
      });
    }
  };
}

module.exports = createComparisonController;
