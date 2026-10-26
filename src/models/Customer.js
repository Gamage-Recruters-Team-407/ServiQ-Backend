const mongoose = require("mongoose");
const { CUSTOMER_STATUSES, NOTIFICATION_CHANNELS } = require("../constants/enums");

const customerSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true
    },
    profile_details: {
      first_name: { type: String, trim: true },
      last_name: { type: String, trim: true },
      phone_number: { type: String, trim: true },
      bio: { type: String, trim: true },
      avatar_url: { type: String, trim: true },
      address: {
        street: { type: String, trim: true },
        city: { type: String, trim: true },
        state: { type: String, trim: true },
        postal_code: { type: String, trim: true },
        country: { type: String, trim: true, default: "Sri Lanka" },
        location: {
          type: {
            type: String,
            enum: ["Point"],
            default: "Point"
          },
          coordinates: {
            type: [Number], // [longitude, latitude]
            default: [0, 0]
          }
        }
      }
    },
    preferences: {
      preferred_categories: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "ServiceCategory"
        }
      ],
      notification_channels: [
        {
          type: String,
          enum: Object.values(NOTIFICATION_CHANNELS),
          default: NOTIFICATION_CHANNELS.IN_APP
        }
      ],
      language: {
        type: String,
        default: "en"
      }
    },
    account_status: {
      type: String,
      enum: Object.values(CUSTOMER_STATUSES),
      default: CUSTOMER_STATUSES.ACTIVE,
      index: true
    }
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" }
  }
);

customerSchema.index({ "profile_details.address.location": "2dsphere" });

module.exports = mongoose.model("Customer", customerSchema);
