const Message = require("../models/Message");

async function sendMessage(req, res, next) {
  try {
    const { text, attachment, location } = req.body;

    const hasText =
      typeof text === "string" && text.trim().length > 0;

    const hasAttachment =
      attachment && typeof attachment.publicId === "string";

    const hasLocation =
      location &&
      Number.isFinite(location.latitude) &&
      Number.isFinite(location.longitude) &&
      Math.abs(location.latitude) <= 90 &&
      Math.abs(location.longitude) <= 180;

    if (!hasText && !hasAttachment && !hasLocation) {
      return res.status(400).json({
        message: "Message content is required",
      });
    }

    if (hasText && text.length > 5000) {
      return res.status(400).json({
        message: "Message is too long",
      });
    }

    // The attachment must come from a trusted server-side upload
    // record or an upload completed for this conversation.
    // Do not trust an arbitrary publicId or URL from the client.

    const conversation = req.conversation;
    const senderId = req.user._id;

    const recipientId =
      String(conversation.customerId) === senderId
        ? conversation.providerId
        : conversation.customerId;

    const message = await Message.create({
      conversationId: conversation._id,
      senderId,
      recipientId,
      type: hasAttachment
        ? attachment.kind
        : hasLocation
          ? "location"
          : "text",
      content: {
        text: hasText ? text.trim() : undefined,
        attachment: hasAttachment ? attachment : undefined,
        location: hasLocation ? location : undefined,
      },
      status: "sent",
      createdAt: new Date(),
    });

    const io = req.app.get("io");

    // Only deliver to authenticated conversation participants.
    io.to(`conversation:${conversation._id}`).emit(
      "message:new",
      message
    );

    return res.status(201).json({ message });
  } catch (error) {
    next(error);
  }
}

module.exports = { sendMessage };