const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { USER_ROLES, USER_STATUSES } = require("../constants/enums");

const userSchema = new mongoose.Schema(
  {
    first_name: {
      type: String,
      required: true,
      trim: true
    },
    last_name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },
    phone_number: {
      type: String,
      trim: true
    },
    password: {
      type: String,
      required: true,
      select: false
    },
    user_role: {
      type: String,
      enum: Object.values(USER_ROLES),
      default: USER_ROLES.CUSTOMER,
      required: true,
      index: true
    },
    account_status: {
      type: String,
      enum: Object.values(USER_STATUSES),
      default: USER_STATUSES.ACTIVE,
      index: true
    },
    profile_image: {
      type: String,
      default: null
    },
    is_email_verified: {
      type: Boolean,
      default: false
    },
    is_phone_verified: {
      type: Boolean,
      default: false
    },
    last_login_at: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        delete ret.password;
        return ret;
      }
    },
    toObject: { virtuals: true }
  }
);

userSchema.virtual("full_name").get(function () {
  return `${this.first_name || ""} ${this.last_name || ""}`.trim();
});

// Pre-save hook to hash password if modified
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Instance method to compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model("User", userSchema);

