const mongoose = require("mongoose");
const {
  NOTIFICATION_EVENT_TYPES,
  NOTIFICATION_CHANNELS,
  NOTIFICATION_STATUSES
} = require("../constants/enums");

const notificationSchema = new mongoose.Schema(
  {
    recipient_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    event_type: {
      type: String,
      enum: Object.values(NOTIFICATION_EVENT_TYPES),
      required: true,
      index: true
    },
    related_record_id: {
      type: String,
      trim: true,
      default: null,
      index: true
    },
    channel: {
      type: String,
      enum: Object.values(NOTIFICATION_CHANNELS),
      required: true,
      default: NOTIFICATION_CHANNELS.IN_APP
    },
    title: {
      type: String,
      trim: true,
      default: null
    },
    message: {
      type: String,
      required: true,
      trim: true
    },
    message_reference: {
      type: String,
      trim: true,
      default: null
    },
    notification_status: {
      type: String,
      enum: Object.values(NOTIFICATION_STATUSES),
      default: NOTIFICATION_STATUSES.SUBMITTED,
      index: true
    },
    delivered_at: {
      type: Date,
      default: null
    },
    read_at: {
      type: Date,
      default: null
    },
    retry_count: {
      type: Number,
      default: 0
    },
    failure_reference: {
      type: String,
      trim: true,
      default: null
    }
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" }
  }
);

notificationSchema.index({ recipient_id: 1, notification_status: 1, created_at: -1 });

module.exports = mongoose.model("Notification", notificationSchema);
