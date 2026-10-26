const mongoose = require("mongoose");
const { COMMISSION_STATUSES } = require("../constants/enums");

const commissionSchema = new mongoose.Schema(
  {
    payment_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
      required: true,
      unique: true,
      index: true
    },
    rule_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CommissionRule",
      required: true,
      index: true
    },
    booking_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      index: true
    },
    provider_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Provider",
      index: true
    },
    gross_amount: {
      type: Number,
      required: true,
      min: 0
    },
    commission_rate: {
      type: Number,
      default: 0,
      min: 0
    },
    commission_amount: {
      type: Number,
      required: true,
      min: 0
    },
    commission_status: {
      type: String,
      enum: Object.values(COMMISSION_STATUSES),
      default: COMMISSION_STATUSES.PENDING,
      index: true
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
    calculated_at: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" }
  }
);

module.exports = mongoose.model("Commission", commissionSchema);
