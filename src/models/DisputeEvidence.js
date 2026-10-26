const mongoose = require("mongoose");
const { DISPUTE_EVIDENCE_TYPES } = require("../constants/enums");

const disputeEvidenceSchema = new mongoose.Schema(
  {
    dispute_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Dispute",
      required: true,
      index: true
    },
    uploaded_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true
    },
    evidence_type: {
      type: String,
      enum: Object.values(DISPUTE_EVIDENCE_TYPES),
      required: true
    },
    evidence_reference: {
      type: String,
      required: true,
      trim: true
    },
    file_name: {
      type: String,
      trim: true,
      default: null
    },
    file_size: {
      type: Number,
      default: null
    },
    mime_type: {
      type: String,
      trim: true,
      default: null
    },
    uploaded_at: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" }
  }
);

module.exports = mongoose.model("DisputeEvidence", disputeEvidenceSchema);
