const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      default: null,
    },
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },
    lastMessagePreview: { type: String, default: "", maxlength: 200 },
    lastMessageAt: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ["active", "closed", "blocked"],
      default: "active",
    },
  },
  { timestamps: true }
);

conversationSchema.index({
  customerId: 1,
  providerId: 1,
  lastMessageAt: -1,
});

module.exports =
  mongoose.models.Conversation ||
  mongoose.model("Conversation", conversationSchema);