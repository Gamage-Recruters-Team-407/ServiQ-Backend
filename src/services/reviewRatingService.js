
const mongoose = require("mongoose");

const {
  REVIEW_STATUSES,
  REVIEW_MODERATION_STATUSES
} = require("../constants/enums");

const OBJECT_ID_PATTERN = /^[0-9a-fA-F]{24}$/;
const MAX_PROVIDERS_PER_REQUEST = 50;

class ReviewRatingError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = "ReviewRatingError";
    this.status = status;
  }
}

function validateProviderIds(providerIds) {
  if (
    !Array.isArray(providerIds) ||
    providerIds.length === 0 ||
    providerIds.length > MAX_PROVIDERS_PER_REQUEST
  ) {
    throw new ReviewRatingError(
      "Provide between 1 and 50 provider IDs"
    );
  }

  const uniqueIds = new Set();

  for (const value of providerIds) {
    const id = typeof value === "string" ? value : "";

    if (!OBJECT_ID_PATTERN.test(id)) {
      throw new ReviewRatingError("Invalid provider ID");
    }

    uniqueIds.add(id.toLowerCase());
  }

  return [...uniqueIds];
}

function createReviewRatingService({ ReviewModel } = {}) {
  if (typeof ReviewModel?.aggregate !== "function") {
    throw new TypeError(
      "A Review model with aggregate() is required"
    );
  }

  async function getProviderRatingSummaries(providerIds) {
    const ids = validateProviderIds(providerIds);

    const rows = await ReviewModel.aggregate([
      {
        $match: {
          provider_id: {
            $in: ids.map(
              (id) => new mongoose.Types.ObjectId(id)
            )
          },
          review_status: REVIEW_STATUSES.PUBLISHED,
          moderation_status: REVIEW_MODERATION_STATUSES.APPROVED,
          rating_value: { $gte: 1, $lte: 5 }
        }
      },
      {
        $group: {
          _id: "$provider_id",
          averageRating: { $avg: "$rating_value" },
          reviewCount: { $sum: 1 }
        }
      }
    ]);

    const summariesById = new Map(
      rows.map((row) => [
        String(row._id).toLowerCase(),
        row
      ])
    );

    return ids.map((providerId) => {
      const summary = summariesById.get(providerId);

      return {
        providerId,
        averageRating: summary?.averageRating ?? 0,
        reviewCount: summary?.reviewCount ?? 0
      };
    });
  }

  async function getProviderRatingSummary(providerId) {
    const [summary] = await getProviderRatingSummaries([
      providerId
    ]);

    return summary;
  }

  return {
    getProviderRatingSummary,
    getProviderRatingSummaries
  };
}

module.exports = {
  ReviewRatingError,
  createReviewRatingService
};
