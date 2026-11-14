
"use strict";

const mongoose = require("mongoose");
const User = require("../models/User");
const Provider = require("../models/Provider");
const Visibility = require("../models/ProviderProfileVisibility");
const {
  USER_ROLES,
  USER_STATUSES,
  PROVIDER_TYPES,
  PROVIDER_ACCOUNT_STATUSES,
  PROVIDER_VERIFICATION_STATUSES
} = require("../constants/enums");
const {
  providerProfileUpdateSchema,
  providerVisibilitySchema,
  toMongoSet
} = require("../validations/providerProfile.validation");

class ProfileError extends Error {
  constructor(status, message, errors) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

const PROVIDER_FIELDS = [
  "_id", "user_id", "provider_type", "business_information",
  "experience", "coverage_area", "account_status",
  "verification_status", "rating_average", "rating_count",
  "created_at", "updated_at"
].join(" ");
const USER_FIELDS = [
  "_id", "first_name", "last_name", "email", "phone_number",
  "profile_image", "user_role", "account_status"
].join(" ");
const VISIBILITY_KEYS = [
  "is_public", "show_contact_email", "show_contact_phone",
  "show_business_address", "show_website", "show_experience",
  "show_coverage_area"
];

function validate(schema, body) {
  const result = schema.safeParse(body);
  if (result.success) return result.data;
  throw new ProfileError(400, "Invalid request data", result.error.issues.map(i => ({
    field: i.path.join("."), message: i.message
  })));
}

function validateId(providerId) {
  if (!mongoose.isObjectIdOrHexString(providerId)) {
    throw new ProfileError(400, "Invalid provider ID");
  }
}

async function findProvider(providerId) {
  validateId(providerId);
  const provider = await Provider.findById(providerId)
    .select(PROVIDER_FIELDS).lean();
  if (!provider) throw new ProfileError(404, "Provider profile not found");

  const user = await User.findById(provider.user_id)
    .select(USER_FIELDS).lean();
  if (!user || user.user_role !== USER_ROLES.PROVIDER) {
    throw new ProfileError(409, "Provider's linked user is missing or invalid");
  }
  return { provider, user };
}

function ownerView(provider, user) {
  return {
    provider_id: String(provider._id),
    user_id: String(provider.user_id),
    name: [user.first_name, user.last_name].filter(Boolean).join(" "),
    email: user.email,
    phone_number: user.phone_number ?? null,
    profile_image: user.profile_image ?? null,
    provider_type: provider.provider_type,
    business_information: provider.business_information || {},
    experience: provider.experience || {},
    coverage_area: provider.coverage_area || {},
    account_status: provider.account_status,
    verification_status: provider.verification_status,
    rating_average: provider.rating_average ?? 0,
    rating_count: provider.rating_count ?? 0,
    updated_at: provider.updated_at ?? null
  };
}

function visibilitySettings(record) {
  return Object.fromEntries(VISIBILITY_KEYS.map(
    key => [key, record?.[key] === true]
  ));
}

function canPublish(provider, user) {
  return user.account_status === USER_STATUSES.ACTIVE &&
    provider.account_status === PROVIDER_ACCOUNT_STATUSES.ACTIVE &&
    provider.verification_status === PROVIDER_VERIFICATION_STATUSES.VERIFIED;
}

function toPublicProfile(provider, user, visibility) {
  const v = visibilitySettings(visibility);
  const b = provider.business_information || {};
  const name = provider.provider_type === PROVIDER_TYPES.BUSINESS && b.business_name
    ? b.business_name
    : [user.first_name, user.last_name].filter(Boolean).join(" ");
  const result = {
    provider_id: String(provider._id),
    provider_type: provider.provider_type,
    display_name: name,
    profile_image: user.profile_image ?? null,
    business_name: b.business_name ?? null,
    description: b.description ?? null,
    rating_average: provider.rating_average ?? 0,
    rating_count: provider.rating_count ?? 0
  };
  if (v.show_contact_email) result.contact_email = b.contact_email ?? null;
  if (v.show_contact_phone) result.contact_phone = b.contact_phone ?? null;
  if (v.show_business_address) result.business_address = b.business_address ?? null;
  if (v.show_website) result.website = b.website ?? null;
  if (v.show_experience) result.experience = provider.experience || {};
  if (v.show_coverage_area) {
    const c = provider.coverage_area || {};
    result.coverage_area = {
      cities: c.cities || [],
      regions: c.regions || [],
      radius_km: c.radius_km ?? null
    }; // Do not expose exact coordinates.
  }
  return result;
}

// GET /:providerId: full profile in local testing only.
async function getProfile(providerId) {
  const { provider, user } = await findProvider(providerId);
  return ownerView(provider, user);
}

// PATCH /:providerId: update only approved profile fields.
async function updateProfile(providerId, body) {
  const parsed = validate(providerProfileUpdateSchema, body);
  const { provider } = await findProvider(providerId);
  const editable = [
    PROVIDER_ACCOUNT_STATUSES.ACTIVE,
    PROVIDER_ACCOUNT_STATUSES.PENDING
  ];
  if (!editable.includes(provider.account_status)) {
    throw new ProfileError(403, "Provider profile editing is restricted");
  }

  const updated = await Provider.findOneAndUpdate(
    { _id: provider._id, account_status: { $in: editable } },
    { $set: toMongoSet(parsed) },
    { new: true, runValidators: true }
  );
  if (!updated) throw new ProfileError(409, "Provider status changed; retry");
  return getProfile(providerId);
}

// DELETE /:providerId: hard-delete test Provider only, never linked User.
async function deleteProfile(providerId) {
  const { provider } = await findProvider(providerId);

  // Avoid breaking data owned by other developers.
  const dependentModels = [
    require("../models/Service"),
    require("../models/ProviderAvailability"),
    require("../models/Booking"),
    require("../models/Payment"),
    require("../models/Commission"),
    require("../models/Earnings"),
    require("../models/Payout"),
    require("../models/ServiceCompletion"),
    require("../models/Review")
  ];

  const dependencies = await Promise.all(
    dependentModels.map(Model => Model.exists({ provider_id: provider._id }))
  );
  if (dependencies.some(Boolean)) {
    throw new ProfileError(
      409,
      "Cannot delete a provider referenced by other marketplace records"
    );
  }

  const removed = await Provider.deleteOne({ _id: provider._id });
  if (removed.deletedCount !== 1) {
    throw new ProfileError(404, "Provider profile not found");
  }
  await Visibility.deleteOne({ provider_id: provider._id });
  return { deleted: true, provider_id: String(provider._id), user_deleted: false };
}

async function getVisibility(providerId) {
  const { provider } = await findProvider(providerId);
  const record = await Visibility.findOne({ provider_id: provider._id }).lean();
  return visibilitySettings(record);
}

async function updateVisibility(providerId, body) {
  const parsed = validate(providerVisibilitySchema, body);
  const { provider, user } = await findProvider(providerId);
  if (parsed.is_public === true && !canPublish(provider, user)) {
    throw new ProfileError(409, "Only active, verified providers can publish");
  }
  const record = await Visibility.findOneAndUpdate(
    { provider_id: provider._id },
    { $set: parsed, $setOnInsert: { provider_id: provider._id } },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  ).lean();
  return visibilitySettings(record);
}

async function getPreview(providerId) {
  const { provider, user } = await findProvider(providerId);
  const record = await Visibility.findOne({ provider_id: provider._id }).lean();
  return {
    published: Boolean(record?.is_public && canPublish(provider, user)),
    eligible_to_publish: canPublish(provider, user),
    visibility: visibilitySettings(record),
    profile: toPublicProfile(provider, user, record)
  };
}

async function getPublicProfile(providerId) {
  const { provider, user } = await findProvider(providerId);
  const record = await Visibility.findOne({ provider_id: provider._id }).lean();
  if (!record?.is_public || !canPublish(provider, user)) {
    throw new ProfileError(404, "Public profile unavailable");
  }
  return toPublicProfile(provider, user, record);
}

module.exports = {
  ProfileError,
  getProfile,
  updateProfile,
  deleteProfile,
  getVisibility,
  updateVisibility,
  getPreview,
  getPublicProfile,
  toPublicProfile,
  canPublish
};
