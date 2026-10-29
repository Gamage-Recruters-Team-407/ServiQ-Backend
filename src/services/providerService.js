
const mongoose = require("mongoose");

const Provider = require("../models/Provider");
const {
  PROVIDER_TYPES,
  PROVIDER_ACCOUNT_STATUSES
} = require("../constants/enums");

const {
  createProviderSchema,
  updateProviderSchema
} = require("../validations/providerValidation");

// Create an error carrying an HTTP status.
const httpError = (status, message) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

// Public responses must never expose private documents.
const publicFields = [
  "user_id",
  "provider_type",
  "business_information.business_name",
  "business_information.description",
  "business_information.website",
  "experience",
  "rating_average",
  "rating_count",
  "created_at"
].join(" ");


const privateFields = [
  "user_id",
  "provider_type",
  "business_information",
  "experience",
  "coverage_area",
  "verification_status",
  "account_status",
  "rating_average",
  "rating_count",
  "created_at",
  "updated_at"
].join(" ");


const publicUserFields =
  "first_name last_name profile_image";

const assertBusinessRequirements = (profile) => {
  if (profile.provider_type !== PROVIDER_TYPES.BUSINESS) {
    return;
  }

  const info = profile.business_information || {};

  if (!info.business_name?.trim()) {
    throw httpError(400, "Business name is required.");
  }

  if (!info.business_address?.trim()) {
    throw httpError(400, "Business address is required.");
  }
};

// POST /api/providers
async function createProfile(userId, input) {
  const data = createProviderSchema.parse(input);

  const existing = await Provider.findOne({
    user_id: userId
  });

  if (existing) {
    throw httpError(409, "Provider profile already exists.");
  }

  const profile = await Provider.create({
    user_id: userId,
    provider_type: data.provider_type,
    business_information: data.business_information,
    experience: data.experience
  });

  return getMyProfile(userId);
}

// GET /api/providers/me

async function getMyProfile(userId) {
  const profile = await Provider.findOne({
    user_id: userId
  })
    .select(privateFields)
    .populate(
      "user_id",
      "first_name last_name email phone_number profile_image"
    )
    .lean();

  if (!profile) {
    throw httpError(404, "Provider profile not found.");
  }

  return profile;
}


// PATCH /api/providers/me
async function updateMyProfile(userId, input) {
  const data = updateProviderSchema.parse(input);

  const profile = await Provider.findOne({
    user_id: userId
  });

  if (!profile) {
    throw httpError(404, "Provider profile not found.");
  }

  // Only apply approved, validated profile fields.
  if (data.provider_type !== undefined) {
    profile.provider_type = data.provider_type;
  }

  if (data.business_information !== undefined) {
    for (const [key, value] of Object.entries(
      data.business_information
    )) {
      profile.set(`business_information.${key}`, value);
    }
  }

  if (data.experience !== undefined) {
    for (const [key, value] of Object.entries(
      data.experience
    )) {
      profile.set(`experience.${key}`, value);
    }
  }

  // Validate the resulting state, including type changes.
  assertBusinessRequirements(profile);

  await profile.save();

  return getMyProfile(userId);
}

// GET /api/providers
async function listPublicProfiles() {
  return Provider.find({
    account_status: PROVIDER_ACCOUNT_STATUSES.ACTIVE
  })
    .select(publicFields)
    .populate("user_id", publicUserFields)
    .sort({ created_at: -1 })
    .limit(50)
    .lean();
}

// GET /api/providers/:id
async function getPublicProfile(providerId) {
  if (!mongoose.isValidObjectId(providerId)) {
    throw httpError(400, "Invalid provider ID.");
  }

  const profile = await Provider.findOne({
    _id: providerId,
    account_status: PROVIDER_ACCOUNT_STATUSES.ACTIVE
  })
    .select(publicFields)
    .populate("user_id", publicUserFields)
    .lean();

  if (!profile) {
    throw httpError(404, "Provider profile not found.");
  }

  return profile;
}

module.exports = {
  createProfile,
  getMyProfile,
  updateMyProfile,
  listPublicProfiles,
  getPublicProfile
};
