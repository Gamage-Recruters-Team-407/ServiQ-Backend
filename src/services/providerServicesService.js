const adapter = require("../integrations/providerServicesOwnerAdapter");

const {
  PROVIDER_ACCOUNT_STATUSES,
  SERVICE_STATUSES,
  USER_STATUSES
} = require("../constants/enums");

class HttpError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

async function providerForUser(user) {
  const provider = await adapter.getProviderByUserId(user._id);

  if (!provider) {
    throw new HttpError(404, "Provider profile not found");
  }

  return provider;
}

function requireManageAccess(user, provider) {
  const unavailable = [
    PROVIDER_ACCOUNT_STATUSES.INACTIVE,
    PROVIDER_ACCOUNT_STATUSES.SUSPENDED,
    PROVIDER_ACCOUNT_STATUSES.RESTRICTED
  ];

  if (
    user.account_status === USER_STATUSES.RESTRICTED ||
    unavailable.includes(provider.account_status)
  ) {
    throw new HttpError(
      403,
      "This provider account cannot manage services"
    );
  }

  // Pending providers may prepare their service listings.
  // Final publishing rules require Developer 04 approval.
}

async function requireActiveCategory(categoryId) {
  const exists = await adapter.isActiveCategory(categoryId);

  if (!exists) {
    throw new HttpError(
      400,
      "Selected service category is not active or does not exist"
    );
  }
}

async function getOwnedService(providerId, id) {
  const service = await adapter.getProviderService(providerId, id);

  if (!service) {
    throw new HttpError(404, "Service not found");
  }

  return service;
}

function flattenChanges(changes) {
  const set = {};

  for (const [key, value] of Object.entries(changes)) {
    if ((key === "price" || key === "coverage") && value) {
      for (const [childKey, childValue] of Object.entries(value)) {
        set[`${key}.${childKey}`] = childValue;
      }
    } else {
      set[key] = value;
    }
  }

  return set;
}

async function list(user) {
  const provider = await providerForUser(user);

  return adapter.listProviderServices(provider._id);
}

async function create(user, data) {
  const provider = await providerForUser(user);

  requireManageAccess(user, provider);
  await requireActiveCategory(data.category_id);

  return adapter.createProviderService(provider._id, data);
}

async function update(user, serviceId, changes) {
  const provider = await providerForUser(user);

  requireManageAccess(user, provider);

  const current = await getOwnedService(provider._id, serviceId);

  if (current.status === SERVICE_STATUSES.ARCHIVED) {
    throw new HttpError(
      409,
      "Archived services cannot be edited"
    );
  }

  if (changes.category_id) {
    await requireActiveCategory(changes.category_id);
  }

  const updated = await adapter.updateProviderService(
    provider._id,
    serviceId,
    flattenChanges(changes)
  );

  if (!updated) {
    throw new HttpError(404, "Service not found");
  }

  return updated;
}

async function changeStatus(user, serviceId, status) {
  const provider = await providerForUser(user);

  requireManageAccess(user, provider);

  const current = await getOwnedService(provider._id, serviceId);

  if (current.status === SERVICE_STATUSES.ARCHIVED) {
    throw new HttpError(
      409,
      "Archived services cannot be reactivated"
    );
  }

  if (status === SERVICE_STATUSES.ACTIVE) {
    await requireActiveCategory(current.category_id);
  }

  const updated = await adapter.updateProviderService(
    provider._id,
    serviceId,
    { status }
  );

  if (!updated) {
    throw new HttpError(404, "Service not found");
  }

  return updated;
}

module.exports = {
  list,
  create,
  update,
  changeStatus,
  HttpError
};