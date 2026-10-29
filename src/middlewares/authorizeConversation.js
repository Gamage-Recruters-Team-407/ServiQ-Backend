const Conversation = require("../models/Conversation");

async function authorizeConversation(req, res, next) {
  try {
    const userId = String(req.user.id);
    const conversation = await Conversation.findById(
      req.params.conversationId
    );

    if (!conversation) {
      return res.status(404).json({
        message: "Conversation not found",
      });
    }

    const isCustomer =
      String(conversation.customerId) === userId;

    const isProvider =
      String(conversation.providerId) === userId;

    if (!isCustomer && !isProvider) {
      return res.status(403).json({
        message: "Access denied",
      });
    }

    req.conversation = conversation;
    next();
  } catch (error) {
    next(error);
  }
}

module.exports = authorizeConversation;