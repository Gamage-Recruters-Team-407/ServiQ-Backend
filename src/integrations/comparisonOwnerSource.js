
const { ComparisonError } = require("../services/comparisonService");

function createComparisonOwnerSource({ getPublicComparisonData } = {}) {
  return async function comparisonOwnerSource(filters) {
    if (typeof getPublicComparisonData !== "function") {
      throw new ComparisonError(
        "Comparison data is temporarily unavailable",
        503
      );
    }

    const providers = await getPublicComparisonData(filters);

    if (!Array.isArray(providers)) {
      throw new ComparisonError(
        "Comparison data is temporarily unavailable",
        503
      );
    }

    return providers;
  };
}

module.exports = createComparisonOwnerSource;
