const mongoose = require("mongoose");

const mediaAssetSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
    },
    publicId: { type: String, required: true },
    resourceType: {
      type: String,
      enum: ["image", "video", "raw"],
      required: true,
    },
    secureUrl: { type: String, required: true },
    originalName: String,
    mimeType: String,
    format: String,
    bytes: Number,
    duration: Number,
    kind: {
      type: String,
      enum: ["image", "video", "audio", "file"],
      required: true,
    },
    used: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.MediaAsset ||
  mongoose.model("MediaAsset", mediaAssetSchema);