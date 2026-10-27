
const express = require("express");

const createComparisonController = require("../controllers/comparisonController");
const createComparisonOwnerSource = require("../integrations/comparisonOwnerSource");
const createComparisonDataSource = require("../integrations/comparisonDataSource");

function createComparisonRoutes({
  authenticate,
  authorizeComparison,
  getPublicComparisonData,
  getProvidersByIds,
  getServicesByProviderIds,
  getRatingSummariesByProviderIds,
  getAvailabilitySummariesByProviderIds,
  maxProviders = 3
} = {}) {
  if (
    typeof authenticate !== "function" ||
    typeof authorizeComparison !== "function"
  ) {
    throw new TypeError(
      "Authentication and comparison authorization middleware are required"
    );
  }

  const router = express.Router();

  const comparisonDataSource =
    typeof getPublicComparisonData === "function"
      ? getPublicComparisonData
      : createComparisonDataSource({
          getProvidersByIds,
          getServicesByProviderIds,
          getRatingSummariesByProviderIds,
          getAvailabilitySummariesByProviderIds
        });

  const ownerDataSource = createComparisonOwnerSource({
    getPublicComparisonData: comparisonDataSource
  });

  const compareProviders = createComparisonController({
    ownerDataSource,
    maxProviders
  });

  router.get(
    "/",
    authenticate,
    authorizeComparison,
    compareProviders
  );

  return router;
}

module.exports = createComparisonRoutes;
