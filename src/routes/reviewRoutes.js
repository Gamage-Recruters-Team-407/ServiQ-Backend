const express = require("express");
const router = express.Router();
const reviewController = require("../controllers/reviewController");

// Public / Open Routes (No Authentication Required)
router.post("/", reviewController.createReview);
router.get("/", reviewController.getReviewsByProvider);
router.get("/summary", reviewController.getProviderRatingSummary);
router.get("/my-reviews", reviewController.getMyReviews); // Uses query param customer_id
router.get("/:id", reviewController.getReviewById);
router.patch("/:id", reviewController.updateReview);
router.delete("/:id", reviewController.deleteReview);

// Admin Routes (Open for now as per your request, can add simple check later if needed)
router.get("/admin/all", reviewController.getAllReviewsForAdmin);
router.patch("/admin/:id/moderate", reviewController.moderateReview);

module.exports = router;