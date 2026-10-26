const mongoose = require("mongoose");
const {
  PROVIDER_TYPES,
  PROVIDER_VERIFICATION_STATUSES,
  PROVIDER_ACCOUNT_STATUSES
} = require("../constants/enums");

const providerSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true
    },
    provider_type: {
      type: String,
      enum: Object.values(PROVIDER_TYPES),
      default: PROVIDER_TYPES.INDIVIDUAL,
      required: true
    },
    business_information: {
      business_name: { type: String, trim: true },
      registration_number: { type: String, trim: true },
      tax_id: { type: String, trim: true },
      contact_email: { type: String, trim: true, lowercase: true },
      contact_phone: { type: String, trim: true },
      business_address: { type: String, trim: true },
      website: { type: String, trim: true },
      description: { type: String, trim: true }
    },
    experience: {
      years_of_experience: { type: Number, default: 0, min: 0 },
      qualifications: [{ type: String, trim: true }],
      skills: [{ type: String, trim: true }],
      bio: { type: String, trim: true }
    },
    coverage_area: {
      cities: [{ type: String, trim: true }],
      regions: [{ type: String, trim: true }],
      radius_km: { type: Number, default: 25 },
      location: {
        type: {
          type: String,
          enum: ["Point"],
          default: "Point"
        },
        coordinates: {
          type: [Number], // [longitude, latitude]
          default: [0, 0]
        }
      }
    },
    verification_status: {
      type: String,
      enum: Object.values(PROVIDER_VERIFICATION_STATUSES),
      default: PROVIDER_VERIFICATION_STATUSES.PENDING,
      index: true
    },
    verification_documents: [
      {
        document_type: { type: String, trim: true },
        document_url: { type: String, trim: true },
        uploaded_at: { type: Date, default: Date.now },
        verified_at: { type: Date, default: null },
        verified_by: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }
      }
    ],
    account_status: {
      type: String,
      enum: Object.values(PROVIDER_ACCOUNT_STATUSES),
      default: PROVIDER_ACCOUNT_STATUSES.PENDING,
      index: true
    },
    rating_average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    rating_count: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" }
  }
);

providerSchema.index({ "coverage_area.location": "2dsphere" });
providerSchema.index({ rating_average: -1 });

module.exports = mongoose.model("Provider", providerSchema);
