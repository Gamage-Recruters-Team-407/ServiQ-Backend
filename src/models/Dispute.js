const mongoose = require("mongoose");
const crypto = require("crypto");
const {
  DISPUTE_CATEGORIES,
  DISPUTE_STATUSES,
  DISPUTE_RESOLUTION_OUTCOMES
} = require("../constants/enums");

const disputeSchema = new mongoose.Schema(
  {
    dispute_reference: {
      type: String,
      default: function () {
        const randomHex = crypto.randomBytes(3).toString("hex").toUpperCase();
        const datePrefix = new Date().toISOString().slice(0, 10).replace(/-/g, "");
        return `DSP-${datePrefix}-${randomHex}`;
      },
      unique: true,
      index: true,
      uppercase: true,
      trim: true
    },
    booking_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
      index: true
    },
    raised_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    assigned_reviewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true
    },
    payment_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
      default: null,
      index: true
    },
    earnings_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Earnings",
      default: null,
      index: true
    },
    dispute_category: {
      type: String,
      enum: Object.values(DISPUTE_CATEGORIES),
      required: true,
      index: true
    },
    description: {
      type: String,
      required: true,
      trim: true
    },
    dispute_status: {
      type: String,
      enum: Object.values(DISPUTE_STATUSES),
      default: DISPUTE_STATUSES.SUBMITTED,
      index: true
    },
    resolution_outcome: {
      type: String,
      enum: [...Object.values(DISPUTE_RESOLUTION_OUTCOMES), null],
      default: null
    },
    resolution_notes: {
      type: String,
      trim: true,
      default: null
    },
    resolved_at: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" }
  }
);

module.exports = mongoose.model("Dispute", disputeSchema);
