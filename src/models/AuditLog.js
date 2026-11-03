const mongoose = require("mongoose");
const { AUDIT_EVENT_TYPES, AUDIT_OUTCOMES } = require("../constants/enums");

const auditLogSchema = new mongoose.Schema(
  {
    actor_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true
    },
    actor_role: {
      type: String,
      trim: true,
      default: null
    },
    event_type: {
      type: String,
      enum: Object.values(AUDIT_EVENT_TYPES),
      required: true,
      index: true
    },
    action: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    resource_type: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    resource_id: {
      type: String,
      trim: true,
      default: null,
      index: true
    },
    outcome: {
      type: String,
      enum: Object.values(AUDIT_OUTCOMES),
      required: true,
      index: true
    },
    previous_state: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    new_state: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    correlation_reference: {
      type: String,
      trim: true,
      default: null,
      index: true
    },
    error_reference: {
      type: String,
      trim: true,
      default: null
    },
    ip_address: {
      type: String,
      trim: true,
      default: null
    },
    user_agent: {
      type: String,
      trim: true,
      default: null
    },
    logged_at: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: false }
  }
);

auditLogSchema.index({ actor_id: 1, logged_at: -1 });
auditLogSchema.index({ resource_type: 1, resource_id: 1 });

const immutableOperation = function () {
  throw new Error("Audit records are append-only and cannot be changed or deleted.");
};

auditLogSchema.pre(
  ["updateOne", "updateMany", "findOneAndUpdate", "replaceOne", "deleteOne", "deleteMany", "findOneAndDelete"],
  immutableOperation
);
auditLogSchema.pre("save", function () {
  if (!this.isNew) {
    throw new Error("Audit records are append-only and cannot be changed or deleted.");
  }
});

module.exports = mongoose.model("AuditLog", auditLogSchema);
