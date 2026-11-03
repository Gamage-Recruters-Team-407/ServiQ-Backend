const mongoose = require("mongoose");
const Service = require("../models/Service");
const ServiceCategory = require("../models/ServiceCategory");
const { SERVICE_STATUSES: S, CATEGORY_STATUSES, PRICING_TYPES, USER_ROLES } = require("../constants/enums");

const httpError = (statusCode, message, details) =>
  Object.assign(new Error(message), { statusCode, details });
const isId = (v) => mongoose.isValidObjectId(v);
const escapeRegex = (s = "") => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const toList = (v) =>
  (Array.isArray(v) ? v : String(v ?? "").split(",")).map((s) => String(s).trim()).filter(Boolean);
const ALL_STATUSES = Object.values(S);

// Allowed status changes (final rules pending client confirmation)
const STATUS_TRANSITIONS = {
  [S.ACTIVE]: [S.INACTIVE, S.TEMPORARILY_UNAVAILABLE, S.ARCHIVED],
  [S.INACTIVE]: [S.ACTIVE, S.ARCHIVED],
  [S.TEMPORARILY_UNAVAILABLE]: [S.ACTIVE, S.INACTIVE, S.ARCHIVED],
  [S.ARCHIVED]: [S.INACTIVE],
};
const PROVIDER_ALLOWED_STATUSES = [S.ACTIVE, S.INACTIVE, S.TEMPORARILY_UNAVAILABLE];

// actor = { role, providerId }
function assertCanModify(service, actor) {
  if (!actor) throw httpError(401, "Authentication required");
  if (actor.role === USER_ROLES.ADMIN) return;
  if (
    actor.role === USER_ROLES.PROVIDER &&
    actor.providerId &&
    String(service.provider_id) === String(actor.providerId)
  ) return;
  throw httpError(403, "You can only change your own services");
}

// ---- cleaners -------------------------------------------------------------
function cleanPrice(input, existing = {}) {
  const merged = { ...existing, ...input };
  const amount = Number(merged.amount);
  if (merged.amount === undefined || merged.amount === "" || !Number.isFinite(amount) || amount < 0) {
    throw httpError(400, "Price must be a number of 0 or more", { "price.amount": "Price must be a number of 0 or more" });
  }
  const pricing_type = merged.pricing_type || PRICING_TYPES.FIXED;
  if (!Object.values(PRICING_TYPES).includes(pricing_type)) {
    throw httpError(400, "Invalid pricing type", { "price.pricing_type": "Invalid pricing type" });
  }
  return { amount, currency: String(merged.currency || "LKR").toUpperCase(), pricing_type };
}

function cleanCoverage(input, existing = {}) {
  const merged = { ...existing, ...input };
  return {
    coverage_area: merged.coverage_area ? String(merged.coverage_area).trim() : undefined,
    supported_locations: toList(merged.supported_locations),
    radius_km: Number(merged.radius_km) >= 0 ? Number(merged.radius_km) : 0,
  };
}

async function assertCategoryUsable(categoryId) {
  if (!isId(categoryId)) throw httpError(400, "Select a valid category", { category_id: "Select a valid category" });
  const cat = await ServiceCategory.findById(categoryId).lean();
  if (!cat) throw httpError(404, "Category not found");
  if (cat.status !== CATEGORY_STATUSES.ACTIVE) throw httpError(400, "This category is inactive");
}

// Provider model belongs to another developer; verify only if it is registered.
async function assertProviderExists(providerId) {
  if (!isId(providerId)) throw httpError(400, "Select a valid provider", { provider_id: "Select a valid provider" });
  const Provider = mongoose.models.Provider;
  if (Provider && !(await Provider.exists({ _id: providerId }))) throw httpError(404, "Provider not found");
}

function validateStatusChange(svc, status, actor) {
  if (!ALL_STATUSES.includes(status)) throw httpError(400, "Invalid status");
  if (svc.status === status) return;
  if (!STATUS_TRANSITIONS[svc.status]?.includes(status)) {
    throw httpError(409, `Cannot change status from "${svc.status}" to "${status}"`);
  }
  if (actor.role === USER_ROLES.PROVIDER && !PROVIDER_ALLOWED_STATUSES.includes(status)) {
    throw httpError(403, "Only administrators can archive or restore services");
  }
}

// ---- queries --------------------------------------------------------------
async function getService(id, { publicOnly = false } = {}) {
  if (!isId(id)) return null;
  const svc = await Service.findById(id).populate("category_id", "name slug status icon_url").lean();
  if (!svc) return null;
  if (publicOnly && (svc.status !== S.ACTIVE || svc.category_id?.status !== CATEGORY_STATUSES.ACTIVE)) return null;
  return svc;
}

async function listServices({ q, category_id, provider_id, status, page = 1, limit = 12, publicOnly = true } = {}) {
  const filter = {};
  const empty = { items: [], total: 0, page, limit, pages: 0 };

  if (publicOnly) {
    // Inactive / unavailable / archived services, and services of inactive categories, are hidden
    filter.status = S.ACTIVE;
    const activeIds = await ServiceCategory.find({ status: CATEGORY_STATUSES.ACTIVE }).distinct("_id");
    if (category_id) {
      if (!isId(category_id)) throw httpError(400, "Invalid category id");
      if (!activeIds.map(String).includes(String(category_id))) return empty;
      filter.category_id = category_id;
    } else {
      filter.category_id = { $in: activeIds };
    }
  } else {
    if (status && status !== "all") {
      if (!ALL_STATUSES.includes(status)) throw httpError(400, "Invalid status filter");
      filter.status = status;
    }
    if (category_id) {
      if (!isId(category_id)) throw httpError(400, "Invalid category id");
      filter.category_id = category_id;
    }
  }
  if (provider_id) {
    if (!isId(provider_id)) throw httpError(400, "Invalid provider id");
    filter.provider_id = provider_id;
  }
  if (q) {
    const rx = { $regex: escapeRegex(q), $options: "i" };
    filter.$or = [{ name: rx }, { description: rx }];
  }

  const [items, total] = await Promise.all([
    Service.find(filter)
      .populate("category_id", "name slug icon_url")
      .sort({ created_at: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Service.countDocuments(filter),
  ]);
  return { items, total, page, limit, pages: Math.ceil(total / limit) };
}

// For the provider-management module: always scoped to one provider
function listServicesForProvider(providerId, opts = {}) {
  if (!providerId) throw httpError(400, "Provider required");
  return listServices({ ...opts, provider_id: providerId, publicOnly: false });
}

// ---- commands -------------------------------------------------------------
async function createService(body = {}, actor) {
  if (!actor) throw httpError(401, "Authentication required");
  if (!body.name || !String(body.name).trim()) {
    throw httpError(400, "Service name is required", { name: "Service name is required" });
  }
  await assertCategoryUsable(body.category_id);

  // Providers create only for themselves; admins must choose a provider
  const provider_id = actor.role === USER_ROLES.PROVIDER ? actor.providerId : body.provider_id;
  if (!provider_id) throw httpError(400, "Provider is required", { provider_id: "Provider is required" });
  await assertProviderExists(provider_id);

  const status = actor.role === USER_ROLES.PROVIDER ? S.ACTIVE : body.status || S.ACTIVE;
  if (!ALL_STATUSES.includes(status)) throw httpError(400, "Invalid status");

  const doc = await Service.create({
    provider_id,
    category_id: body.category_id,
    name: body.name,
    description: body.description,
    price: cleanPrice(body.price || {}),
    coverage: cleanCoverage(body.coverage || {}),
    status,
    duration_minutes: body.duration_minutes !== undefined ? Number(body.duration_minutes) : undefined,
    images: body.images !== undefined ? toList(body.images) : undefined,
    availability_info: body.availability_info,
  });
  return doc.toObject();
}

async function updateService(id, body = {}, actor) {
  if (!isId(id)) throw httpError(400, "Invalid service id");
  const svc = await Service.findById(id);
  if (!svc) throw httpError(404, "Service not found");
  assertCanModify(svc, actor);

  const update = {};
  for (const k of ["name", "description", "availability_info"]) {
    if (body[k] !== undefined) update[k] = body[k];
  }
  if (body.duration_minutes !== undefined) update.duration_minutes = Number(body.duration_minutes);
  if (body.images !== undefined) update.images = toList(body.images);
  if (body.category_id !== undefined) {
    await assertCategoryUsable(body.category_id);
    update.category_id = body.category_id;
  }
  if (body.price !== undefined) update.price = cleanPrice(body.price, svc.price?.toObject?.() || {});
  if (body.coverage !== undefined) update.coverage = cleanCoverage(body.coverage, svc.coverage?.toObject?.() || {});
  if (body.provider_id !== undefined && actor.role === USER_ROLES.ADMIN) {
    await assertProviderExists(body.provider_id);
    update.provider_id = body.provider_id;
  }
  if (body.status !== undefined && body.status !== svc.status) {
    validateStatusChange(svc, body.status, actor);
    update.status = body.status;
  }

  svc.set(update);
  await svc.save();
  return svc.toObject();
}

async function changeServiceStatus(id, status, actor) {
  if (!isId(id)) throw httpError(400, "Invalid service id");
  const svc = await Service.findById(id);
  if (!svc) throw httpError(404, "Service not found");
  assertCanModify(svc, actor);
  validateStatusChange(svc, status, actor);
  svc.status = status;
  await svc.save();
  return svc.toObject();
}

module.exports = {
  STATUS_TRANSITIONS,
  assertCanModify,
  getService,
  listServices,
  listServicesForProvider,
  createService,
  updateService,
  changeServiceStatus,
};