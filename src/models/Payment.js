const mongoose = require("mongoose");
const crypto = require("crypto");
const { PAYMENT_METHODS, PAYMENT_STATUSES } = require("../constants/enums");

const paymentSchema = new mongoose.Schema(
  {
    payment_reference: {
      type: String,
      default: function () {
        const randomHex = crypto.randomBytes(3).toString("hex").toUpperCase();
        const datePrefix = new Date().toISOString().slice(0, 10).replace(/-/g, "");
        return `PAY-${datePrefix}-${randomHex}`;
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
    customer_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      index: true
    },
    provider_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Provider",
      index: true
    },
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
    payment_method: {
      type: String,
      enum: Object.values(PAYMENT_METHODS),
      required: true
    },
    payment_status: {
      type: String,
      enum: Object.values(PAYMENT_STATUSES),
      default: PAYMENT_STATUSES.PENDING,
      index: true
    },
    external_txn_ref: {
      type: String,
      trim: true,
      default: null
    },
    payment_datetime: {
      type: Date,
      default: Date.now
    },
    failure_info: {
      code: { type: String, default: null },
      message: { type: String, default: null },
      timestamp: { type: Date, default: null }
    },
    refund_info: {
      refund_amount: { type: Number, default: 0, min: 0 },
      refund_reason: { type: String, default: null },
      refund_status: { type: String, default: null },
      refunded_at: { type: Date, default: null },
      refund_reference: { type: String, default: null }
    }
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" }
  }
);

module.exports = mongoose.model("Payment", paymentSchema);
