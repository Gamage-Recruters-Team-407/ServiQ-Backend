
const mongoose = require("mongoose");
const Conversation = require("../models/Conversation");

async function authorizeConversation(req, res, next) {
  try {
    const { conversationId } = req.params;
    const userId = req.user?._id;

    if (!mongoose.isValidObjectId(conversationId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid conversation ID",
      });
    }

    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
    }

    const isParticipant =
      String(conversation.customerId) === String(userId) ||
      String(conversation.providerId) === String(userId);

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    if (conversation.status !== "active") {
      return res.status(403).json({
        success: false,
        message: "Conversation is not active",
      });
    }

    req.conversation = conversation;
    next();
  } catch (error) {
    next(error);
  }
}

module.exports = authorizeConversation;
