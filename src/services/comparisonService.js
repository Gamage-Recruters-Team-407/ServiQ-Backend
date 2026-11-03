
const OBJECT_ID_PATTERN = /^[0-9a-f]{24}$/i;
const DEFAULT_MAX_PROVIDERS = 3;

class ComparisonError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = "ComparisonError";
    this.status = status;
  }
}

function normalizeServiceName(value) {
  return value
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function parseComparisonQuery(query, maxProviders = DEFAULT_MAX_PROVIDERS) {
  if (
    !Number.isInteger(maxProviders) ||
    maxProviders < 2 ||
    maxProviders > 20
  ) {
    throw new Error(
      "Comparison limit configuration must be an integer between 2 and 20"
    );
  }

  if (!query || typeof query.ids !== "string") {
    throw new ComparisonError(
      "ids must be a comma-separated list of provider IDs"
    );
  }

  const providerIds = query.ids
    .split(",")
    .map((id) => id.trim().toLowerCase());

  if (providerIds.some((id) => !OBJECT_ID_PATTERN.test(id))) {
    throw new ComparisonError(
      "Every provider ID must be a valid MongoDB ObjectId"
    );
  }

  if (
    providerIds.length < 2 ||
    providerIds.length > maxProviders
  ) {
    throw new ComparisonError(
      `Select between 2 and ${maxProviders} providers`
    );
  }

  if (new Set(providerIds).size !== providerIds.length) {
    throw new ComparisonError("Duplicate providers are not allowed");
  }

  const categoryId = query.categoryId ?? null;

  if (
    categoryId !== null &&
    (
      typeof categoryId !== "string" ||
      !OBJECT_ID_PATTERN.test(categoryId)
    )
  ) {
    throw new ComparisonError(
      "categoryId must be a valid MongoDB ObjectId"
    );
  }

  const serviceNameInput = query.serviceName ?? null;
  let serviceName = null;

  if (serviceNameInput !== null) {
    if (typeof serviceNameInput !== "string") {
      throw new ComparisonError("serviceName must be a string");
    }

    serviceName = normalizeServiceName(serviceNameInput);

    if (serviceName.length < 2 || serviceName.length > 100) {
      throw new ComparisonError(
        "serviceName must contain 2 to 100 characters"
      );
    }

    if (categoryId === null) {
      throw new ComparisonError(
        "categoryId is required when serviceName is provided"
      );
    }
  }

  const date = query.date ?? null;

  if (date !== null) {
    if (
      typeof date !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(date)
    ) {
      throw new ComparisonError(
        "date must have YYYY-MM-DD format"
      );
    }

    const parsed = new Date(`${date}T00:00:00.000Z`);

    if (
      !Number.isFinite(parsed.getTime()) ||
      parsed.toISOString().slice(0, 10) !== date
    ) {
      throw new ComparisonError(
        "date must be a valid calendar date"
      );
    }
  }

  return {
    providerIds,
    categoryId: categoryId
      ? categoryId.toLowerCase()
      : null,
    serviceName,
    date
  };
}

function safeText(value) {
  return typeof value === "string" ? value : null;
}

function safeNumber(value) {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : null;
}

function safeStringArray(value) {
  return Array.isArray(value)
    ? value.filter((item) => typeof item === "string")
    : [];
}

function publicProviderResponse(provider) {
  const availability = provider.availability;

  return {
    id: String(provider.id),
    displayName: safeText(provider.displayName),
    providerType: safeText(provider.providerType),
    verified:
      typeof provider.verified === "boolean"
        ? provider.verified
        : null,
    experienceYears: safeNumber(provider.experienceYears),
    rating: {
      average: safeNumber(provider.rating?.average),
      count: safeNumber(provider.rating?.count)
    },
    services: Array.isArray(provider.services)
      ? provider.services.map((service) => ({
          id: service.id == null
            ? null
            : String(service.id),
          name: safeText(service.name),
          price: {
            amount: safeNumber(service.price?.amount),
            currency: safeText(service.price?.currency),
            pricingType: safeText(service.price?.pricingType)
          }
        }))
      : [],
    availability:
      availability && typeof availability === "object"
        ? {
            date: safeText(availability.date),
            status: safeText(availability.status),
            isAvailable:
              typeof availability.isAvailable === "boolean"
                ? availability.isAvailable
                : null
          }
        : null,
    coverage: {
      cities: safeStringArray(provider.coverage?.cities),
      regions: safeStringArray(provider.coverage?.regions)
    }
  };
}

async function getProviderComparison(
  query,
  ownerDataSource,
  maxProviders = DEFAULT_MAX_PROVIDERS
) {
  if (typeof ownerDataSource !== "function") {
    throw new Error(
      "ownerDataSource must be an approved function"
    );
  }

  const filters = parseComparisonQuery(query, maxProviders);
  const ownerRecords = await ownerDataSource(filters);

  if (!Array.isArray(ownerRecords)) {
    throw new ComparisonError(
      "Comparison data temporarily unavailable",
      503
    );
  }

  const byId = new Map(
    ownerRecords.map((provider) => [
      String(provider.id).toLowerCase(),
      provider
    ])
  );

  if (filters.providerIds.some((id) => !byId.has(id))) {
    throw new ComparisonError(
      "One or more selected providers are unavailable",
      404
    );
  }

  const providers = filters.providerIds.map((id) => {
    const record = byId.get(id);

    if (!filters.serviceName) {
      return publicProviderResponse(record);
    }

    const matchingServices = Array.isArray(record.services)
      ? record.services.filter(
          (service) =>
            typeof service.name === "string" &&
            normalizeServiceName(service.name) ===
              filters.serviceName
        )
      : [];

    if (matchingServices.length === 0) {
      throw new ComparisonError(
        "One or more selected providers do not offer the requested service",
        404
      );
    }

    return publicProviderResponse({
      ...record,
      services: matchingServices
    });
  });

  return {
    success: true,
    data: {
      count: providers.length,
      categoryId: filters.categoryId,
      serviceName: filters.serviceName,
      date: filters.date,
      providers
    }
  };
}

module.exports = {
  ComparisonError,
  parseComparisonQuery,
  getProviderComparison
};
