const mongoose = require("mongoose");
const { SERVICE_STATUSES, PRICING_TYPES } = require("../constants/enums");

const serviceSchema = new mongoose.Schema(
  {
    provider_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Provider",
      required: true,
      index: true
    },
    category_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ServiceCategory",
      required: true,
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    description: {
      type: String,
      required: true,
      trim: true
    },
    price: {
      amount: {
        type: Number,
        required: true,
        min: 0
      },
      currency: {
        type: String,
        default: "LKR",
        uppercase: true,
        trim: true
      },
      pricing_type: {
        type: String,
        enum: Object.values(PRICING_TYPES),
        default: PRICING_TYPES.FIXED
      }
    },
    coverage: {
      coverage_area: { type: String, trim: true },
      supported_locations: [{ type: String, trim: true }],
      radius_km: { type: Number, default: 0 }
    },
    status: {
      type: String,
      enum: Object.values(SERVICE_STATUSES),
      default: SERVICE_STATUSES.ACTIVE,
      index: true
    },
    duration_minutes: {
      type: Number,
      default: 60
    },
    images: [
      {
        type: String,
        trim: true
      }
    ],
    availability_info: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" }
  }
);

serviceSchema.index({ provider_id: 1, category_id: 1 });
serviceSchema.index({ name: "text", description: "text" });

module.exports = mongoose.model("Service", serviceSchema);
