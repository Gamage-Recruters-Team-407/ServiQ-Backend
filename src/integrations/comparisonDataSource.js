
const {
  PROVIDER_ACCOUNT_STATUSES,
  PROVIDER_VERIFICATION_STATUSES,
  SERVICE_STATUSES
} = require("../constants/enums");

const {
  ComparisonError
} = require("../services/comparisonService");

const getId = (value) => {
  if (value == null) return null;
  return String(value._id ?? value.id ?? value).toLowerCase();
};

function ensureArray(value) {
  if (!Array.isArray(value)) {
    throw new ComparisonError(
      "Comparison data is temporarily unavailable",
      503
    );
  }

  return value;
}

function createComparisonDataSource({
  getProvidersByIds,
  getServicesByProviderIds,
  getRatingSummariesByProviderIds,
  getAvailabilitySummariesByProviderIds
} = {}) {
  return async function getPublicComparisonData({
    providerIds,
    categoryId,
    date
  }) {
    if (
      typeof getProvidersByIds !== "function" ||
      typeof getServicesByProviderIds !== "function"
    ) {
      throw new ComparisonError(
        "Comparison data is temporarily unavailable",
        503
      );
    }

    const [providers, services, ratings, availability] =
      await Promise.all([
        getProvidersByIds({ providerIds }),

        getServicesByProviderIds({ providerIds, categoryId }),

        typeof getRatingSummariesByProviderIds === "function"
          ? getRatingSummariesByProviderIds({ providerIds })
          : [],

        date &&
        typeof getAvailabilitySummariesByProviderIds === "function"
          ? getAvailabilitySummariesByProviderIds({
              providerIds,
              date
            })
          : []
      ]);

    ensureArray(providers);
    ensureArray(services);
    ensureArray(ratings);
    ensureArray(availability);

    const ratingByProvider = new Map(
      ratings.map((item) => [
        getId(item.providerId ?? item.provider_id),
        item
      ])
    );

    const availabilityByProvider = new Map(
      availability
        .filter((item) => item.date === date)
        .map((item) => [
          getId(item.providerId ?? item.provider_id),
          item
        ])
    );

    return providers
      .filter(
        (provider) =>
          provider.account_status ===
            PROVIDER_ACCOUNT_STATUSES.ACTIVE &&
          providerIds.includes(getId(provider))
      )
      .map((provider) => {
        const id = getId(provider);

        const offeredServices = services
          .filter(
            (service) =>
              getId(service.provider_id ?? service.providerId) === id &&
              service.status === SERVICE_STATUSES.ACTIVE &&
              (!categoryId ||
                getId(service.category_id ?? service.categoryId) ===
                  categoryId)
          )
          .map((service) => ({
            id: getId(service),
            name: service.name,
            price: {
              amount: service.price?.amount,
              currency: service.price?.currency,
              pricingType: service.price?.pricing_type
            }
          }));

        const rating = ratingByProvider.get(id);
        const schedule = date
          ? availabilityByProvider.get(id)
          : null;

        return {
          id,

          displayName:
            provider.publicDisplayName ??
            provider.business_information?.business_name ??
            null,

          providerType: provider.provider_type,

          verified:
            provider.verification_status ===
            PROVIDER_VERIFICATION_STATUSES.VERIFIED,

          experienceYears:
            provider.experience?.years_of_experience,

          rating: {
            average: rating?.average ?? null,
            count: rating?.count ?? null
          },

          services: offeredServices,

          availability: schedule
            ? {
                date,
                status: schedule.status,
                isAvailable: schedule.isAvailable
              }
            : null,

          coverage: {
            cities: provider.coverage_area?.cities ?? [],
            regions: provider.coverage_area?.regions ?? []
          }
        };
      })
      .filter((provider) => provider.services.length > 0);
  };
}

module.exports = createComparisonDataSource;
