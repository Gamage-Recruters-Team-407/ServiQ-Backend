const reviewService = require("../services/reviewService");
const { createReviewSchema, updateReviewSchema, moderateReviewSchema } = require("../validations/reviewValidation");
const { USER_ROLES } = require("../constants/enums");

class ReviewController {
  async createReview(req, res) {
    try {
      const parseResult = createReviewSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          success: false,
          message: parseResult.error.issues[0].message,
          errors: parseResult.error.issues
        });
      }

      const newReview = await reviewService.createReview(parseResult.data, req.user._id);

      return res.status(201).json({
        success: true,
        message: "Review submitted successfully.",
        data: newReview
      });
    } catch (error) {
      console.error("Create Review Error:", error);
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Failed to submit review."
      });
    }
  }

  async getReviewById(req, res) {
    try {
      const { id } = req.params;
      // Pass userId and userRole for visibility check
      const review = await reviewService.getReviewById(id, req.user._id, req.user.user_role);
      return res.status(200).json({ success: true, data: review });
    } catch (error) {
      return res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
  }

  async updateReview(req, res) {
    try {
      const parseResult = updateReviewSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          success: false,
          message: parseResult.error.issues[0].message,
          errors: parseResult.error.issues
        });
      }

      const { id } = req.params;
      const updatedReview = await reviewService.updateReview(id, parseResult.data, req.user._id);

      return res.status(200).json({
        success: true,
        message: "Review updated successfully.",
        data: updatedReview
      });
    } catch (error) {
      console.error("Update Review Error:", error);
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Failed to update review."
      });
    }
  }

  async deleteReview(req, res) {
    try {
      const { id } = req.params;
      await reviewService.deleteReview(id, req.user._id);

      return res.status(200).json({
        success: true,
        message: "Review deleted successfully."
      });
    } catch (error) {
      console.error("Delete Review Error:", error);
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Failed to delete review."
      });
    }
  }

  async getReviewsByProvider(req, res) {
    try {
      const { provider_id } = req.query;
      if (!provider_id) {
        return res.status(400).json({ success: false, message: "provider_id is required" });
      }
      const limit = parseInt(req.query.limit) || 10;
      const offset = parseInt(req.query.offset) || 0;

      const reviews = await reviewService.getReviewsByProvider(provider_id, limit, offset);
      return res.status(200).json({ success: true, data: reviews });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  async getMyReviews(req, res) {
    try {
      const Customer = require("../models/Customer");
      const customerProfile = await Customer.findOne({ user_id: req.user._id });
      
      if (!customerProfile) {
        return res.status(404).json({ success: false, message: "Customer profile not found" });
      }

      const reviews = await reviewService.getReviewsByCustomer(customerProfile._id);
      return res.status(200).json({ success: true, data: reviews });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  async getProviderRatingSummary(req, res) {
    try {
      const { provider_id } = req.query;
      if (!provider_id) {
        return res.status(400).json({ success: false, message: "provider_id is required" });
      }
      const summary = await reviewService.getProviderRatingSummary(provider_id);
      return res.status(200).json({ success: true, data: summary });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  async moderateReview(req, res) {
    try {
      if (req.user.user_role !== USER_ROLES.ADMIN) {
        return res.status(403).json({ success: false, message: "Forbidden: Admin access required" });
      }

      const parseResult = moderateReviewSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ success: false, message: parseResult.error.issues[0].message });
      }

      const { id } = req.params;
      const updatedReview = await reviewService.moderateReview(id, parseResult.data, req.user._id);

      return res.status(200).json({
        success: true,
        message: "Review moderated successfully.",
        data: updatedReview
      });
    } catch (error) {
      console.error("Moderate Review Error:", error);
      return res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
  }

  async getAllReviewsForAdmin(req, res) {
    try {
      if (req.user.user_role !== USER_ROLES.ADMIN) {
        return res.status(403).json({ success: false, message: "Forbidden: Admin access required" });
      }
      const reviews = await reviewService.getAllReviewsForAdmin(req.query);
      return res.status(200).json({ success: true, data: reviews });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }
}

module.exports = new ReviewController();