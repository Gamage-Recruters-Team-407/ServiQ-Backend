const mongoose = require("mongoose");
const crypto = require("crypto");
const { BOOKING_STATUSES } = require("../constants/enums");

const bookingSchema = new mongoose.Schema(
  {
    booking_reference: {
      type: String,
      default: function () {
        const randomHex = crypto.randomBytes(3).toString("hex").toUpperCase();
        const datePrefix = new Date().toISOString().slice(0, 10).replace(/-/g, "");
        return `BKG-${datePrefix}-${randomHex}`;
      },
      unique: true,
      index: true,
      uppercase: true,
      trim: true
    },
    customer_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      index: true
    },
    provider_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Provider",
      required: true,
      index: true
    },
    service_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service",
      required: true,
      index: true
    },
    booking_status: {
      type: String,
      enum: Object.values(BOOKING_STATUSES),
      default: BOOKING_STATUSES.REQUESTED,
      index: true
    },
    service_location: {
      address: { type: String, trim: true },
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      postal_code: { type: String, trim: true },
      notes: { type: String, trim: true },
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
    service_requirements: {
      type: String,
      trim: true
    },
    total_amount: {
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
    requested_at: {
      type: Date,
      default: Date.now,
      index: true
    },
    rejection_reason: {
      type: String,
      trim: true,
      default: null
    },
    cancellation_reason: {
      type: String,
      trim: true,
      default: null
    },
    cancelled_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    }
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" }
  }
);

bookingSchema.index({ customer_id: 1, booking_status: 1 });
bookingSchema.index({ provider_id: 1, booking_status: 1 });

module.exports = mongoose.model("Booking", bookingSchema);
