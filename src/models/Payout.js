const mongoose = require("mongoose");
const crypto = require("crypto");
const { PAYOUT_METHODS, PAYOUT_STATUSES } = require("../constants/enums");

const payoutSchema = new mongoose.Schema(
  {
    payout_reference: {
      type: String,
      default: function () {
        const randomHex = crypto.randomBytes(3).toString("hex").toUpperCase();
        const datePrefix = new Date().toISOString().slice(0, 10).replace(/-/g, "");
        return `POUT-${datePrefix}-${randomHex}`;
      },
      unique: true,
      index: true,
      uppercase: true,
      trim: true
    },
    provider_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Provider",
      required: true,
      index: true
    },
    payout_amount: {
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
    payout_method: {
      type: String,
      enum: Object.values(PAYOUT_METHODS),
      required: true
    },
    destination_ref: {
      type: String,
      required: true,
      trim: true
    },
    payout_status: {
      type: String,
      enum: Object.values(PAYOUT_STATUSES),
      default: PAYOUT_STATUSES.PENDING,
      index: true
    },
    external_txn_ref: {
      type: String,
      trim: true,
      default: null
    },
    failure_reason: {
      type: String,
      trim: true,
      default: null
    },
    approved_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    approval_ref: {
      type: String,
      trim: true,
      default: null
    },
    initiated_at: {
      type: Date,
      default: null
    },
    completed_at: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" }
  }
);

module.exports = mongoose.model("Payout", payoutSchema);
