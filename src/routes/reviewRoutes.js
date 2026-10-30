const express = require("express");
const router = express.Router();
const reviewController = require("../controllers/reviewController");
const { authenticate } = require("../middlewares/auth");

// Public / Semi-Public Routes
router.get("/summary", reviewController.getProviderRatingSummary);
router.get("/", reviewController.getReviewsByProvider); 

// Protected Customer Routes (Requires Authentication)
router.post("/", authenticate, reviewController.createReview);
router.get("/my-reviews", authenticate, reviewController.getMyReviews);

// Protected Single Review Routes (Owner can Update/Delete, Anyone can View if Published)
router.get("/:id", authenticate, reviewController.getReviewById); // Auth required for visibility check
router.patch("/:id", authenticate, reviewController.updateReview);
router.delete("/:id", authenticate, reviewController.deleteReview);

// Protected Admin Routes
router.get("/admin/all", authenticate, reviewController.getAllReviewsForAdmin);
router.patch("/admin/:id/moderate", authenticate, reviewController.moderateReview);

module.exports = router;