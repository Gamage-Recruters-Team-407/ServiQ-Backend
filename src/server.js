
require("dotenv").config();

const dns = require("node:dns");
const http = require("node:http");
const { Server } = require("socket.io");

const app = require("./app");
const connectDB = require("./config/db");
const { registerChatSockets } = require("./sockets/chatSocket");

// Temporary DNS workaround for MongoDB Atlas
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // Connect to the existing ServiQ database
    await connectDB();

    // Create HTTP server for Express and Socket.IO
    const server = http.createServer(app);

    const io = new Server(server, {
      cors: {
        origin: process.env.CLIENT_URL || "http://localhost:3000",
        credentials: true,
      },
    });

    // Make Socket.IO available to Express controllers
    app.set("io", io);

    // Register real-time chat handlers
    registerChatSockets(io);

    server.listen(PORT, () => {
      console.log(`ServiQ backend running on port ${PORT}`);
      console.log("Socket.IO chat server is ready");
    });
  } catch (error) {
    console.error("Backend startup failed:", error.message);
    process.exit(1);
  }
}

startServer();
