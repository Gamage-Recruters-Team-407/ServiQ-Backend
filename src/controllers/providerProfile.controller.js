
"use strict";

const mongoose = require("mongoose");
const service = require("../services/providerProfile.service");

function respond(action) {
  return async (req, res) => {
    try {
      const data = await action(req);
      return res.status(200).json({ success: true, data });
    } catch (error) {
      if (error instanceof service.ProfileError) {
        return res.status(error.status).json({
          success: false,
          message: error.message,
          ...(error.errors ? { errors: error.errors } : {})
        });
      }
      if (error instanceof mongoose.Error.ValidationError ||
          error instanceof mongoose.Error.CastError) {
        return res.status(400).json({
          success: false,
          message: "Invalid provider profile data"
        });
      }
      console.error("Provider profile request failed:", error);
      return res.status(500).json({
        success: false,
        message: "Provider profile request failed"
      });
    }
  };
}

module.exports = {
  getProfile: respond(req => service.getProfile(req.params.providerId)),
  updateProfile: respond(req => service.updateProfile(req.params.providerId, req.body)),
  deleteProfile: respond(req => service.deleteProfile(req.params.providerId)),
  getVisibility: respond(req => service.getVisibility(req.params.providerId)),
  updateVisibility: respond(req => service.updateVisibility(req.params.providerId, req.body)),
  getPreview: respond(req => service.getPreview(req.params.providerId)),
  getPublic: respond(req => service.getPublicProfile(req.params.providerId))
};
