const mongoose = require("mongoose");
const { EARNINGS_STATUSES } = require("../constants/enums");
const { isValidEarningsTransition } = require("../constants/earningsTransitions");

const earningsSchema = new mongoose.Schema(
  {
    provider_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Provider",
      required: true,
      immutable: true,
      index: true
    },
    booking_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
      immutable: true,
      index: true
    },
    service_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service",
      default: null,
      immutable: true,
      index: true
    },
    payment_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
      required: true,
      immutable: true,
      unique: true,
      index: true
    },
    commission_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Commission",
      required: true,
      immutable: true,
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
      immutable: true,
      min: 0
    },
    commission_amount: {
      type: Number,
      required: true,
      immutable: true,
      min: 0
    },
    earnings_amount: {
      type: Number,
      required: true,
      immutable: true,
      min: 0
    },
    currency: {
      type: String,
      default: "LKR",
      immutable: true,
      uppercase: true,
      trim: true,
      match: [/^[A-Z]{3}$/, "Currency must be a 3-letter ISO code"]
    },
    // Latest approved adjustment summary; the full trail lives in EarningsHistory.
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
    status_changed_at: {
      type: Date,
      default: Date.now
    },
    // Inputs and policy version used for the calculation, for reproducibility.
    calculation_snapshot: {
      policy_version: { type: String, trim: true, default: null },
      inputs: { type: mongoose.Schema.Types.Mixed, default: null }
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
earningsSchema.index({ provider_id: 1, created_at: -1 });

earningsSchema.pre("validate", function () {
  if (this.commission_amount > this.transaction_amount) {
    this.invalidate("commission_amount", "Commission amount cannot exceed the transaction amount");
  }
});

earningsSchema.post("init", function () {
  this.$locals.originalStatus = this.earnings_status;
});

earningsSchema.pre("save", function () {
  if (this.isNew || !this.isModified("earnings_status")) return;

  const from = this.$locals.originalStatus;
  if (!isValidEarningsTransition(from, this.earnings_status)) {
    throw new Error(`Invalid earnings status transition: ${from} -> ${this.earnings_status}`);
  }
  this.status_changed_at = new Date();
});

earningsSchema.post("save", function () {
  this.$locals.originalStatus = this.earnings_status;
});

// Status changes must go through save() so transitions are validated.
function blockDirectStatusUpdate() {
  const update = this.getUpdate() || {};
  const touched = [update, update.$set, update.$setOnInsert].some(
    (part) => part && Object.prototype.hasOwnProperty.call(part, "earnings_status")
  );
  if (touched) {
    throw new Error("earnings_status cannot be changed through query updates; use document save()");
  }
}

["updateOne", "updateMany", "findOneAndUpdate"].forEach((op) => {
  earningsSchema.pre(op, blockDirectStatusUpdate);
});

["deleteOne", "deleteMany", "findOneAndDelete"].forEach((op) => {
  earningsSchema.pre(op, { document: false, query: true }, function () {
    throw new Error("Earnings records cannot be deleted");
  });
});

earningsSchema.pre("deleteOne", { document: true, query: false }, function () {
  throw new Error("Earnings records cannot be deleted");
});

module.exports = mongoose.model("Earnings", earningsSchema);
