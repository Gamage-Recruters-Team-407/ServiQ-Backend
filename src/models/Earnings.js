const mongoose = require("mongoose");
const { EARNINGS_STATUSES } = require("../constants/enums");

const earningsSchema = new mongoose.Schema(
  {
    provider_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Provider",
      required: true,
      index: true
    },
    booking_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
      index: true
    },
    payment_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
      required: true,
      unique: true,
      index: true
    },
    commission_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Commission",
      required: true,
      unique: true,
      index: true
    },
    payout_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payout",
      default: null,
      index: true
    },
    transaction_amount: {
      type: Number,
      required: true,
      min: 0
    },
    commission_amount: {
      type: Number,
      required: true,
      min: 0
    },
    earnings_amount: {
      type: Number,
      required: true
    },
    currency: {
      type: String,
      default: "LKR",
      uppercase: true,
      trim: true
    },
    adjustment_amount: {
      type: Number,
      default: 0
    },
    adjustment_reason: {
      type: String,
      trim: true,
      default: null
    },
    earnings_status: {
      type: String,
      enum: Object.values(EARNINGS_STATUSES),
      default: EARNINGS_STATUSES.PENDING,
      index: true
    },
    calculated_at: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" }
  }
);

earningsSchema.index({ provider_id: 1, earnings_status: 1 });

module.exports = mongoose.model("Earnings", earningsSchema);
