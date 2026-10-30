const Conversation = require("../models/Conversation");

// Use the existing project's JWT verification logic here.
function registerChatSockets(io, authenticateSocket) {
  io.use(authenticateSocket);

  io.on("connection", (socket) => {
    socket.on("conversation:join", async ({ conversationId } = {}) => {
      try {
        if (typeof conversationId !== "string") return;

        const conversation = await Conversation.findById(
          conversationId
        );

        if (!conversation) return;

        const userId = String(socket.user.id);

        const allowed =
          String(conversation.customerId) === userId ||
          String(conversation.providerId) === userId;

        if (!allowed) {
          socket.emit("chat:error", {
            message: "Access denied",
          });
          return;
        }

        socket.join(`conversation:${conversationId}`);
      } catch {
        socket.emit("chat:error", {
          message: "Unable to join conversation",
        });
      }
    });

    socket.on("typing:start", ({ conversationId } = {}) => {
      if (
        typeof conversationId === "string" &&
        socket.rooms.has(`conversation:${conversationId}`)
      ) {
        socket.to(`conversation:${conversationId}`).emit(
          "typing:update",
          { userId: String(socket.user.id), isTyping: true }
        );
      }
    });

    socket.on("typing:stop", ({ conversationId } = {}) => {
      if (
        typeof conversationId === "string" &&
        socket.rooms.has(`conversation:${conversationId}`)
      ) {
        socket.to(`conversation:${conversationId}`).emit(
          "typing:update",
          { userId: String(socket.user.id), isTyping: false }
        );
      }
    });
  });
}

module.exports = { registerChatSockets };