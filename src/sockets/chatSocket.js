
const { verifyToken } = require("../utils/jwt");
const User = require("../models/User");
const { USER_STATUSES } = require("../constants/enums");
const Conversation = require("../models/Conversation");

async function authenticateSocket(socket, next) {
  try {
    const token = socket.handshake.auth?.token;

    if (!token) {
      return next(new Error("Authentication required"));
    }

    const decoded = verifyToken(token);
    const user = await User.findById(decoded.id);

    if (!user) {
      return next(new Error("Account not found"));
    }

    if (
      user.account_status === USER_STATUSES.SUSPENDED ||
      user.account_status === USER_STATUSES.INACTIVE
    ) {
      return next(new Error("Account is not active"));
    }

    socket.user = { id: String(user._id) };
    next();
  } catch {
    next(new Error("Invalid or expired token"));
  }
}

function registerChatSockets(io) {
  io.use(authenticateSocket);

  io.on("connection", (socket) => {
    console.log("Authenticated chat client connected:", socket.user.id);

    // Join a conversation only if the authenticated user is a participant.
    socket.on("conversation:join", async (conversationId, callback) => {
      try {
        if (
          typeof conversationId !== "string" ||
          !/^[a-fA-F0-9]{24}$/.test(conversationId)
        ) {
          return callback?.({ success: false, message: "Invalid conversation ID" });
        }

        const conversation = await Conversation.findById(conversationId);

        if (!conversation) {
          return callback?.({ success: false, message: "Conversation not found" });
        }

        const userId = socket.user.id;
        const isParticipant =
          String(conversation.customerId) === userId ||
          String(conversation.providerId) === userId;

        if (!isParticipant) {
          return callback?.({ success: false, message: "Access denied" });
        }

        if (conversation.status !== "active") {
          return callback?.({ success: false, message: "Conversation is not active" });
        }

        socket.join(`conversation:${conversationId}`);
        callback?.({ success: true });
      } catch (error) {
        console.error("Conversation join failed:", error.message);
        callback?.({ success: false, message: "Unable to join conversation" });
      }
    });

    socket.on("typing:start", (conversationId) => {
      if (typeof conversationId !== "string") return;

      const room = `conversation:${conversationId}`;
      if (socket.rooms.has(room)) {
        socket.to(room).emit("typing:start", {
          conversationId,
          userId: socket.user.id,
        });
      }
    });

    socket.on("typing:stop", (conversationId) => {
      if (typeof conversationId !== "string") return;

      const room = `conversation:${conversationId}`;
      if (socket.rooms.has(room)) {
        socket.to(room).emit("typing:stop", {
          conversationId,
          userId: socket.user.id,
        });
      }
    });

    socket.on("disconnect", () => {
      console.log("Chat client disconnected:", socket.user.id);
    });
  });
}

module.exports = { registerChatSockets };
