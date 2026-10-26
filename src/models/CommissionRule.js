const mongoose = require("mongoose");
const { COMMISSION_TYPES, COMMISSION_RULE_STATUSES } = require("../constants/enums");

const commissionRuleSchema = new mongoose.Schema(
  {
    rule_name: {
      type: String,
      required: true,
      trim: true
    },
    category_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ServiceCategory",
      default: null,
      index: true
    },
    commission_type: {
      type: String,
      enum: Object.values(COMMISSION_TYPES),
      required: true,
      default: COMMISSION_TYPES.PERCENTAGE
    },
    rate_or_fixed_amount: {
      type: Number,
      required: true,
      min: 0
    },
    effective_start: {
      type: Date,
      required: true,
      index: true
    },
    effective_end: {
      type: Date,
      default: null
    },
    rule_status: {
      type: String,
      enum: Object.values(COMMISSION_RULE_STATUSES),
      default: COMMISSION_RULE_STATUSES.ACTIVE,
      index: true
    },
    description: {
      type: String,
      trim: true
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    }
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" }
  }
);

commissionRuleSchema.index({ category_id: 1, rule_status: 1, effective_start: 1 });

module.exports = mongoose.model("CommissionRule", commissionRuleSchema);
