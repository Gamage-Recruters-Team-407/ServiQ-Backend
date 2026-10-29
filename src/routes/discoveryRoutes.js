const express = require("express");
const discoveryController = require("../controllers/discoveryController");

const router = express.Router();

/**
 * Service Discovery Routes (Developer 06)
 * Base Path: /api/discovery
 */

// Search and filter services
router.get("/search", (req, res) => discoveryController.search(req, res));

// Discover providers
router.get("/providers", (req, res) => discoveryController.getProviders(req, res));

// Featured services and categories for Homepage
router.get("/featured", (req, res) => discoveryController.getFeatured(req, res));

module.exports = router;
