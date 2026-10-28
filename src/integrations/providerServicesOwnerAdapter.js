// Provisional bridge for Developer 03/04 integration.
// Must be approved by the model owners before shared merge.

const Provider = require("../models/Provider");
const Service = require("../models/Service");
const ServiceCategory = require("../models/ServiceCategory");

const {
  CATEGORY_STATUSES,
  SERVICE_STATUSES
} = require("../constants/enums");

const ownerAdapter = {
  getProviderByUserId(userId) {
    return Provider.findOne({ user_id: userId }).lean();
  },

  async isActiveCategory(categoryId) {
    return Boolean(await ServiceCategory.exists({
      _id: categoryId,
      status: CATEGORY_STATUSES.ACTIVE
    }));
  },

  listProviderServices(providerId) {
    return Service.find({ provider_id: providerId })
      .sort({ created_at: -1 })
      .lean();
  },

  getProviderService(providerId, serviceId) {
    return Service.findOne({
      _id: serviceId,
      provider_id: providerId
    }).lean();
  },

  createProviderService(providerId, fields) {
    return Service.create({
      ...fields,
      provider_id: providerId
    });
  },

  updateProviderService(providerId, serviceId, fields) {
    return Service.findOneAndUpdate(
      {
        _id: serviceId,
        provider_id: providerId,
        status: { $ne: SERVICE_STATUSES.ARCHIVED }
      },
      { $set: fields },
      { new: true, runValidators: true }
    ).lean();
  }
};

module.exports = ownerAdapter;