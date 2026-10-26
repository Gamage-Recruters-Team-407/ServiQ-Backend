const mongoose = require("mongoose");
const { COMMUNICATION_STATUSES } = require("../constants/enums");

const communicationSchema = new mongoose.Schema(
  {
    sender_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    recipient_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    booking_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      default: null,
      index: true
    },
    service_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service",
      default: null,
      index: true
    },
    content: {
      type: String,
      required: true,
      trim: true
    },
    communication_status: {
      type: String,
      enum: Object.values(COMMUNICATION_STATUSES),
      default: COMMUNICATION_STATUSES.SENT,
      index: true
    },
    sent_at: {
      type: Date,
      default: Date.now,
      index: true
    },
    read_at: {
      type: Date,
      default: null
    },
    attachments: [
      {
        file_name: { type: String, trim: true },
        file_url: { type: String, trim: true },
        file_type: { type: String, trim: true },
        file_size: { type: Number }
      }
    ]
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" }
  }
);

communicationSchema.index({ sender_id: 1, recipient_id: 1, sent_at: -1 });

module.exports = mongoose.model("Communication", communicationSchema);
