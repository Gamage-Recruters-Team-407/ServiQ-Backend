const path = require("path");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const adminRoutes = require("./routes/admin.routes");
const authRoutes = require("./routes/authRoutes");
const providerServicesRoutes = require("./routes/providerServicesRoutes");
const discoveryRoutes = require("./routes/discoveryRoutes");
const auditLogging = require("./middlewares/auditLogging");
const conversationRoutes = require("./routes/conversationRoutes");
const messageRoutes = require("./routes/messageRoutes");
const uploadRoutes = require("./routes/uploadRoutes");


const app = express();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000"
}));
app.use(express.json());
app.use(morgan("dev"));
app.use(auditLogging);

// Static files (Interactive API Portal)
app.use(express.static(path.join(__dirname, "../public")));

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "serviQ backend is running"
  });
});

// Service Discovery Routes (Developer 06)
app.use("/api/discovery", discoveryRoutes);

// Category & Service Catalogue Routes
app.use("/api/categories", require("./routes/categoryRoutes"));
app.use("/api/services", require("./routes/serviceRoutes"));

// Auth & Provider Routes
app.use("/api/auth", authRoutes);
app.use("/api/providers/me/services", providerServicesRoutes);
app.use("/api/admin/audit-logs", require("./routes/auditLogRoutes"));

// Conversation & Message Routes
app.use("/api/conversations", conversationRoutes);
app.use("/api/conversations", messageRoutes);
app.use("/api/uploads", uploadRoutes);


// Admin Routes
app.use("/api/admin", adminRoutes);



// Root route serves the interactive API Portal
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);

  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({ message: "File exceeds the 25 MB limit" });
  }

  if (err.code === "LIMIT_UNEXPECTED_FILE") {
    return res.status(400).json({ message: "Unexpected file field" });
  }

  if (err.name === "MulterError") {
    return res.status(400).json({ message: err.message });
  }

  if (err.message === "File type is not supported") {
    return res.status(415).json({ message: err.message });
  }

  console.error(err);
  res.status(500).json({ message: "Internal server error" });
});


module.exports = app;
