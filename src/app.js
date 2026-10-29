
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const authRoutes = require("./routes/authRoutes");
const providerServicesRoutes = require("./routes/providerServicesRoutes");
const providerBookingRoutes = require("./routes/providerBookingRoutes");

const app = express();

app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000"
}));
app.use(express.json());
app.use(morgan("dev"));

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "serviQ backend is running"
  });
});

app.use("/api/categories", require("./routes/categoryRoutes"));
app.use("/api/services", require("./routes/serviceRoutes"));

// Authentication routes (Developer 01)
app.use("/api/auth", authRoutes);
app.use("/api/providers/me/services", providerServicesRoutes);
app.use("/api/provider/bookings", providerBookingRoutes);

module.exports = app;

