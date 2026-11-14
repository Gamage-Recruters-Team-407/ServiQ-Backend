
"use strict";

const mongoose = require("mongoose");

// Own collection; existing Provider.js remains unchanged.
const schema = new mongoose.Schema({
  provider_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Provider",
    required: true,
    unique: true,
    index: true
  },
  is_public: { type: Boolean, default: false },
  show_contact_email: { type: Boolean, default: false },
  show_contact_phone: { type: Boolean, default: false },
  show_business_address: { type: Boolean, default: false },
  show_website: { type: Boolean, default: false },
  show_experience: { type: Boolean, default: false },
  show_coverage_area: { type: Boolean, default: false }
}, {
  timestamps: { createdAt: "created_at", updatedAt: "updated_at" }
});

module.exports = mongoose.models.ProviderProfileVisibility ||
  mongoose.model("ProviderProfileVisibility", schema);
