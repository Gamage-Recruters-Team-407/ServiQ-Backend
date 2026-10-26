const mongoose = require("mongoose");
const { CATEGORY_STATUSES } = require("../constants/enums");

const serviceCategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true
    },
    slug: {
      type: String,
      trim: true,
      lowercase: true,
      unique: true,
      index: true
    },
    description: {
      type: String,
      trim: true
    },
    parent_category_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ServiceCategory",
      default: null,
      index: true
    },
    status: {
      type: String,
      enum: Object.values(CATEGORY_STATUSES),
      default: CATEGORY_STATUSES.ACTIVE,
      index: true
    },
    icon_url: {
      type: String,
      trim: true,
      default: null
    },
    image_url: {
      type: String,
      trim: true,
      default: null
    }
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" }
  }
);

serviceCategorySchema.pre("validate", function () {
  if (this.name && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");
  }
});

module.exports = mongoose.model("ServiceCategory", serviceCategorySchema);
