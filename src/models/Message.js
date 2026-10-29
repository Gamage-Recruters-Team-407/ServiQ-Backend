
const mongoose = require("mongoose");

const attachmentSchema = new mongoose.Schema(
  {
    publicId: { type: String, required: true },
    resourceType: {
      type: String,
      enum: ["image", "video", "raw"],
      required: true,
    },
    format: String,
    originalName: String,
    mimeType: String,
    bytes: Number,
    duration: Number,
    secureUrl: String,
  },
  { _id: false }
);

const locationSchema = new mongoose.Schema(
  {
    latitude: { type: Number, required: true, min: -90, max: 90 },
    longitude: { type: Number, required: true, min: -180, max: 180 },
  },
  { _id: false }
);

const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },

    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: ["text", "image", "video", "audio", "file", "location"],
      required: true,
    },

    content: {
      text: { type: String, maxlength: 5000, default: "" },
      attachment: { type: attachmentSchema, default: undefined },
      location: { type: locationSchema, default: undefined },
    },

    status: {
      type: String,
      enum: ["sent", "delivered", "read"],
      default: "sent",
      index: true,
    },

    deliveredAt: { type: Date, default: null },
    readAt: { type: Date, default: null },
    editedAt: { type: Date, default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

messageSchema.index({ conversationId: 1, createdAt: -1 });

module.exports =
  mongoose.models.Message ||
  mongoose.model("Message", messageSchema);
