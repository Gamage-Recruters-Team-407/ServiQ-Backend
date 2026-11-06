const mongoose = require("mongoose");
const { REVIEW_STATUSES, REVIEW_MODERATION_STATUSES } = require("../constants/enums");

const reviewSchema = new mongoose.Schema(
  {
    booking_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
      unique: true,
      index: true
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
    rating_value: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
      index: true
    },
    review_text: {
      type: String,
      trim: true,
      default: null
    },
    review_status: {
      type: String,
      enum: Object.values(REVIEW_STATUSES),
      default: REVIEW_STATUSES.SUBMITTED,
      index: true
    },
    moderation_status: {
      type: String,
      enum: Object.values(REVIEW_MODERATION_STATUSES),
      default: REVIEW_MODERATION_STATUSES.PENDING,
      index: true
    },
    moderation_reason: {
      type: String,
      trim: true,
      default: null
    },
    moderated_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    moderated_at: {
      type: Date,
      default: null
    },
    submitted_at: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" }
  }
);

reviewSchema.index({ provider_id: 1, review_status: 1 });
reviewSchema.index({ service_id: 1, review_status: 1 });

module.exports = mongoose.model("Review", reviewSchema);
