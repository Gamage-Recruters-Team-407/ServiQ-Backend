// Temporary Dev 03/04/08 integration for local testing.
// Replace direct model access with owner-approved interfaces
// before team merge.

const mongoose = require("mongoose");

const Provider = require("../models/Provider");
const Service = require("../models/Service");
const ServiceCategory = require("../models/ServiceCategory");

const {
  CATEGORY_STATUSES,
  SERVICE_STATUSES
} = require("../constants/enums");

const dependentCollections = [
  "bookings",
  "communications",
  "reviews",
  "provideravailabilities"
];

module.exports = {
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
    return Service.find({
      provider_id: providerId,
      status: { $ne: SERVICE_STATUSES.ARCHIVED }
    })
      .sort({ created_at: -1 })
      .lean();
  },

  getProviderService(providerId, serviceId) {
    return Service.findOne({
      _id: serviceId,
      provider_id: providerId
    }).lean();
  },

  createProviderService(providerId, data) {
    return Service.create({
      ...data,
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
      {
        new: true,
        runValidators: true
      }
    ).lean();
  },

  restoreArchivedService(providerId, serviceId) {
    return Service.findOneAndUpdate(
      {
        _id: serviceId,
        provider_id: providerId,
        status: SERVICE_STATUSES.ARCHIVED
      },
      {
        $set: {
          status: SERVICE_STATUSES.INACTIVE
        }
      },
      {
        new: true,
        runValidators: true
      }
    ).lean();
  },

  async findServiceDependency(serviceId) {
    // Read-only dependency check against current MongoDB schema.
    // Replace with owner-approved interfaces for final integration.

    const database = Service.db.db;
    const id = new mongoose.Types.ObjectId(String(serviceId));

    for (const collection of dependentCollections) {
      const reference = await database.collection(collection).findOne(
        { service_id: id },
        { projection: { _id: 1 } }
      );

      if (reference) {
        return collection;
      }
    }

    return null;
  },

  permanentlyDeleteProviderService(providerId, serviceId) {
    return Service.findOneAndDelete({
      _id: serviceId,
      provider_id: providerId
    }).lean();
  }
};