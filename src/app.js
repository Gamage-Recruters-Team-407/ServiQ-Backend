
const path = require("path");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

// Admin and Authentication Routes
const adminRoutes = require("./routes/admin.routes");
const authRoutes = require("./routes/authRoutes");

// Provider Routes
const providerServicesRoutes = require("./routes/providerServicesRoutes");
const providerBookingRoutes = require("./routes/providerBookingRoutes");

// Service Discovery Routes
const discoveryRoutes = require("./routes/discoveryRoutes");

// Audit Logging Middleware
const auditLogging = require("./middlewares/auditLogging");

// Ratings & Reviews Routes
const reviewRoutes = require("./routes/reviewRoutes");

// Dispute Management Routes (Developer 17)
const { createDisputeRoutes, createAdminDisputeRoutes } = require("./routes/disputeRoutes");
const { authenticate, authorizeRoles } = require("./middlewares/auth");

const app = express();

// Global Middleware
app.use(helmet({ contentSecurityPolicy: false }));

app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000"
}));

app.use(express.json());
app.use(morgan("dev"));
app.use(auditLogging);

// Static Files (Interactive API Portal)
app.use(express.static(path.join(__dirname, "../public")));

// Health Check
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

// Authentication Routes
app.use("/api/auth", authRoutes);

// Provider Services Routes
app.use("/api/providers/me/services", providerServicesRoutes);

// Provider Booking Routes (Developer 09)
app.use("/api/provider/bookings", providerBookingRoutes);

// Audit Log Routes
app.use("/api/admin/audit-logs", require("./routes/auditLogRoutes"));

// Admin Routes
app.use("/api/admin", adminRoutes);

// Ratings & Reviews Routes 
app.use("/api/reviews", reviewRoutes);

// Dispute Management Routes (Developer 17)
app.use("/api/disputes", createDisputeRoutes({ authenticate, authorizeRole: authorizeRoles }));
app.use("/api/admin/disputes", createAdminDisputeRoutes({ authenticate, authorizeRole: authorizeRoles }));

// Root Route (Interactive API Portal)
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

// Provider Profiles Routes (Developer 04)
app.use("/api/providers", require("./routes/providerRoutes"));

module.exports = app;
