
const mongoose = require("mongoose");

const connectDB = async () => {
  if (!process.env.MONGO_URI) {
    console.warn("⚠️ MONGO_URI is not configured. Running in mock/offline development mode.");
    return false;
  }

  await mongoose.connect(process.env.MONGO_URI);

  console.log("MongoDB connected successfully");
  return true;
};

module.exports = connectDB;
