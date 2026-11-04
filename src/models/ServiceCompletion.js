const mongoose = require("mongoose");
const { SERVICE_COMPLETION_STATUSES } = require("../constants/enums");

const serviceCompletionSchema = new mongoose.Schema(
  {
    booking_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
      unique: true,
      index: true
    },
    provider_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Provider",
      index: true
    },
    customer_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      index: true
    },
    start_datetime: {
      type: Date,
      default: null
    },
    completion_datetime: {
      type: Date,
      default: null
    },
    completion_confirmation: {
      type: Boolean,
      default: false
    },
    confirmed_by_customer_at: {
      type: Date,
      default: null
    },
    completion_notes: {
      type: String,
      trim: true,
      default: null
    },
    current_status: {
      type: String,
      enum: Object.values(SERVICE_COMPLETION_STATUSES),
      default: SERVICE_COMPLETION_STATUSES.IN_PROGRESS,
      index: true
    },
    review_eligibility: {
      type: Boolean,
      default: false,
      index: true
    },
    evidence_urls: [
      {
        type: String,
        trim: true
      }
    ],
    status_history: [
      {
        _id: false,
        status: { type: String, enum: Object.values(SERVICE_COMPLETION_STATUSES), required: true },
        changed_by: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
        changed_by_role: { type: String, trim: true, default: null },
    note: { type: String, trim: true, default: null },
    changed_at: { type: Date, default: Date.now }
  }
]
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" }
  }
);

module.exports = mongoose.model("ServiceCompletion", serviceCompletionSchema);


