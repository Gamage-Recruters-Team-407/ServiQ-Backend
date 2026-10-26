
require("dotenv").config();

const dns = require("node:dns");
const app = require("./app");
const connectDB = require("./config/db");

// Temporary DNS workaround for MongoDB Atlas
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(`serviQ backend running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Backend startup failed:", error.message);
    process.exit(1);
  }
}

startServer();
