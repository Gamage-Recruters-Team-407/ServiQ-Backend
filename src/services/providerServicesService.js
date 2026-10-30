const adapter = require("../integrations/providerServicesOwnerAdapter");

const {
  PROVIDER_ACCOUNT_STATUSES,
  USER_STATUSES,
  SERVICE_STATUSES
} = require("../constants/enums");

class HttpError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

async function getProvider(user) {
  const provider = await adapter.getProviderByUserId(user._id);

  if (!provider) {
    throw new HttpError(404, "Provider profile not found");
  }

  return provider;
}

function ensureManageAccess(user, provider) {
  if (
    user.account_status !== USER_STATUSES.ACTIVE ||
    [
      PROVIDER_ACCOUNT_STATUSES.INACTIVE,
      PROVIDER_ACCOUNT_STATUSES.SUSPENDED,
      PROVIDER_ACCOUNT_STATUSES.RESTRICTED
    ].includes(provider.account_status)
  ) {
    throw new HttpError(
      403,
      "Provider account cannot manage services"
    );
  }

  // Pending provider profiles can manage test services.
  // Dev 04 must confirm final provider approval rules.
}

async function ensureCategory(categoryId) {
  const exists = await adapter.isActiveCategory(categoryId);

  if (!exists) {
    throw new HttpError(
      400,
      "Selected category is missing or inactive"
    );
  }
}

async function ownedService(providerId, serviceId) {
  const service = await adapter.getProviderService(
    providerId,
    serviceId
  );

  if (!service) {
    throw new HttpError(404, "Service not found");
  }

  return service;
}

function flattenChanges(changes) {
  const set = {};

  for (const [key, value] of Object.entries(changes)) {
    if (key === "price" || key === "coverage") {
      for (const [childKey, childValue] of Object.entries(value)) {
        set[`${key}.${childKey}`] = childValue;
      }
    } else {
      set[key] = value;
    }
  }

  return set;
}

// READ ALL
async function list(user) {
  const provider = await getProvider(user);

  return adapter.listProviderServices(provider._id);
}

// READ ONE
async function getById(user, serviceId) {
  const provider = await getProvider(user);

  const service = await ownedService(
    provider._id,
    serviceId
  );

  if (service.status === SERVICE_STATUSES.ARCHIVED) {
    throw new HttpError(404, "Service not found");
  }

  return service;
}

// CREATE
async function create(user, data) {
  const provider = await getProvider(user);

  ensureManageAccess(user, provider);
  await ensureCategory(data.category_id);

  return adapter.createProviderService(provider._id, data);
}

// UPDATE
async function update(user, serviceId, changes) {
  const provider = await getProvider(user);

  ensureManageAccess(user, provider);

  const current = await ownedService(
    provider._id,
    serviceId
  );

  if (current.status === SERVICE_STATUSES.ARCHIVED) {
    throw new HttpError(
      409,
      "Archived services cannot be edited"
    );
  }

  if (changes.category_id) {
    await ensureCategory(changes.category_id);
  }

  const updated = await adapter.updateProviderService(
    provider._id,
    serviceId,
    flattenChanges(changes)
  );

  if (!updated) {
    throw new HttpError(
      409,
      "Service is no longer editable"
    );
  }

  return updated;
}

// ACTIVATE / DEACTIVATE
async function changeStatus(user, serviceId, status) {
  const provider = await getProvider(user);

  ensureManageAccess(user, provider);

  const current = await ownedService(
    provider._id,
    serviceId
  );

  if (current.status === SERVICE_STATUSES.ARCHIVED) {
    throw new HttpError(
      409,
      "Archived services must be restored first"
    );
  }

  if (status === SERVICE_STATUSES.ACTIVE) {
    await ensureCategory(current.category_id);
  }

  const updated = await adapter.updateProviderService(
    provider._id,
    serviceId,
    { status }
  );

  if (!updated) {
    throw new HttpError(
      409,
      "Service is no longer editable"
    );
  }

  return updated;
}

// RESTORE ARCHIVED SERVICE
async function restore(user, serviceId) {
  const provider = await getProvider(user);

  ensureManageAccess(user, provider);

  const restored = await adapter.restoreArchivedService(
    provider._id,
    serviceId
  );

  if (!restored) {
    throw new HttpError(
      409,
      "Service not archived or not available for restore"
    );
  }

  return restored;
}

// PERMANENT DELETE
async function remove(user, serviceId) {
  const provider = await getProvider(user);

  ensureManageAccess(user, provider);

  // Ensure this service belongs to the logged-in provider.
  await ownedService(provider._id, serviceId);

  // Prevent deletion when the service is referenced elsewhere.
  const dependency = await adapter.findServiceDependency(
    serviceId
  );

  if (dependency) {
    throw new HttpError(
      409,
      "Cannot permanently delete a service with linked records"
    );
  }

  // Actually remove the document from MongoDB.
  const deleted = await adapter.permanentlyDeleteProviderService(
    provider._id,
    serviceId
  );

  if (!deleted) {
    throw new HttpError(404, "Service not found");
  }

  return deleted;
}

module.exports = {
  list,
  getById,
  create,
  update,
  changeStatus,
  restore,
  remove,
  HttpError
};