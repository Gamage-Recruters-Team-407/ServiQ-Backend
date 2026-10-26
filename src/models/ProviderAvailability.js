const mongoose = require("mongoose");
const { AVAILABILITY_STATUSES } = require("../constants/enums");

const providerAvailabilitySchema = new mongoose.Schema(
  {
    provider_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Provider",
      required: true,
      index: true
    },
    service_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service",
      default: null,
      index: true
    },
    available_date: {
      type: Date,
      required: true,
      index: true
    },
    start_time: {
      type: String,
      required: true,
      trim: true // e.g., "09:00"
    },
    end_time: {
      type: String,
      required: true,
      trim: true // e.g., "17:00"
    },
    is_available: {
      type: Boolean,
      default: true
    },
    status: {
      type: String,
      enum: Object.values(AVAILABILITY_STATUSES),
      default: AVAILABILITY_STATUSES.AVAILABLE,
      index: true
    }
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" }
  }
);

providerAvailabilitySchema.index({ provider_id: 1, available_date: 1 });
providerAvailabilitySchema.index({ provider_id: 1, service_id: 1, available_date: 1 });

module.exports = mongoose.model("ProviderAvailability", providerAvailabilitySchema);
