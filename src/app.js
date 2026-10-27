
const path = require("path");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const app = express();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000"
}));
app.use(express.json());
app.use(morgan("dev"));

// Static files (Interactive API Portal)
app.use(express.static(path.join(__dirname, "../public")));

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "serviQ backend is running"
  });
});

// Service Discovery Routes (Developer 06)
const discoveryRoutes = require("./routes/discoveryRoutes");
app.use("/api/discovery", discoveryRoutes);

// Root route serves the interactive API Portal
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

module.exports = app;
