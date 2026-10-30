const mongoose = require("mongoose");
const { EARNINGS_STATUSES, EARNINGS_HISTORY_ENTRY_TYPES } = require("../constants/enums");

// Append-only ledger of calculations, status changes, adjustments, reversals and payout links.
const earningsHistorySchema = new mongoose.Schema(
  {
    earnings_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Earnings",
      required: true,
      index: true
    },
    provider_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Provider",
      required: true,
      index: true
    },
    entry_type: {
      type: String,
      enum: Object.values(EARNINGS_HISTORY_ENTRY_TYPES),
      required: true,
      index: true
    },
    amount: {
      type: Number,
      default: 0
    },
    currency: {
      type: String,
      uppercase: true,
      trim: true,
      match: [/^[A-Z]{3}$/, "Currency must be a 3-letter ISO code"]
    },
    previous_status: {
      type: String,
      enum: [...Object.values(EARNINGS_STATUSES), null],
      default: null
    },
    new_status: {
      type: String,
      enum: [...Object.values(EARNINGS_STATUSES), null],
      default: null
    },
    reason: {
      type: String,
      trim: true,
      default: null
    },
    // Originating event, e.g. { type: "Dispute", id: ObjectId } or { type: "Payout", id }.
    source_ref: {
      type: { type: String, trim: true, default: null },
      id: { type: mongoose.Schema.Types.ObjectId, default: null }
    },
    // Unique per originating event so retried deliveries cannot append duplicates.
    idempotency_key: {
      type: String,
      trim: true,
      default: undefined
    },
    actor_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    approval_ref: {
      type: String,
      trim: true,
      default: null
    }
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: false }
  }
);

earningsHistorySchema.index({ earnings_id: 1, created_at: 1 });
earningsHistorySchema.index({ idempotency_key: 1 }, { unique: true, sparse: true });

const IMMUTABLE_MESSAGE = "Earnings history is append-only";

["updateOne", "updateMany", "findOneAndUpdate", "findOneAndReplace", "replaceOne",
  "deleteOne", "deleteMany", "findOneAndDelete"].forEach((op) => {
  earningsHistorySchema.pre(op, { document: false, query: true }, function () {
    throw new Error(IMMUTABLE_MESSAGE);
  });
});

earningsHistorySchema.pre("deleteOne", { document: true, query: false }, function () {
  throw new Error(IMMUTABLE_MESSAGE);
});

earningsHistorySchema.pre("save", function () {
  if (!this.isNew) throw new Error(IMMUTABLE_MESSAGE);
});

module.exports = mongoose.model("EarningsHistory", earningsHistorySchema);
