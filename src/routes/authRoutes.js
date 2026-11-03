const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { authenticate } = require("../middlewares/auth");

// Public endpoints
router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/logout", authController.logout);
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password", authController.resetPassword);

// Protected endpoints
router.get("/me", authenticate, authController.getMe);


module.exports = router;
