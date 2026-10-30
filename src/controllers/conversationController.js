const mongoose = require("mongoose");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");

async function createConversation(req, res, next) {
  try {
    const { providerId, bookingId } = req.body;
   const customerId = req.user._id;

    if (!mongoose.isValidObjectId(providerId)) {
      return res.status(400).json({ message: "Invalid provider ID" });
    }

    if (String(customerId) === String(providerId)) {
      return res.status(400).json({
        message: "You cannot start a conversation with yourself",
      });
    }

    if (bookingId && !mongoose.isValidObjectId(bookingId)) {
      return res.status(400).json({ message: "Invalid booking ID" });
    }

    // TODO: Verify provider role and, if applicable, that this booking
    // belongs to this customer and provider using your team's models.
    const filter = {
      customerId,
      providerId,
      bookingId: bookingId || null,
    };

    let conversation = await Conversation.findOne(filter);

    if (!conversation) {
      try {
        conversation = await Conversation.create(filter);
      } catch (error) {
        // Handle a simultaneous request that creates the same conversation.
        if (error.code !== 11000) throw error;
        conversation = await Conversation.findOne(filter);
      }
    }

    return res.status(200).json({ conversation });
  } catch (error) {
    next(error);
  }
}

async function listConversations(req, res, next) {
  try {
    const userId = req.user.id;

    const conversations = await Conversation.find({
      $or: [{ customerId: userId }, { providerId: userId }],
    })
      .sort({ lastMessageAt: -1 })
      .limit(100)
      .lean();

    return res.json({ conversations });
  } catch (error) {
    next(error);
  }
}

async function getMessages(req, res, next) {
  try {
    const { conversationId } = req.params;
    const limit = Math.min(
      Math.max(Number.parseInt(req.query.limit, 10) || 30, 1),
      100
    );

    const before = req.query.before
      ? new Date(req.query.before)
      : null;

    if (before && Number.isNaN(before.getTime())) {
      return res.status(400).json({ message: "Invalid before timestamp" });
    }

    const filter = { conversationId: req.conversation._id };

    if (before) filter.createdAt = { $lt: before };

    const messages = await Message.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    messages.reverse();

    return res.json({ messages });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createConversation,
  listConversations,
  getMessages,
};