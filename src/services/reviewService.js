const Review = require("../models/Review");
const ServiceCompletion = require("../models/ServiceCompletion");
const Customer = require("../models/Customer");
const mongoose = require("mongoose");
const { REVIEW_STATUSES, REVIEW_MODERATION_STATUSES, USER_ROLES } = require("../constants/enums");

class ReviewService {
  /**
   * Create a new review (Customer)
   */
  async createReview(data, userId) {
    const customerProfile = await Customer.findOne({ user_id: userId });
    if (!customerProfile || customerProfile._id.toString() !== data.customer_id) {
      const error = new Error("Unauthorized: You can only review your own bookings.");
      error.statusCode = 403;
      throw error;
    }

    const completion = await ServiceCompletion.findOne({ booking_id: data.booking_id });
    if (!completion || completion.current_status !== "Completed" || !completion.review_eligibility) {
      const error = new Error("Review not allowed: Service is not completed or not eligible yet.");
      error.statusCode = 400;
      throw error;
    }

    const existingReview = await Review.findOne({ booking_id: data.booking_id });
    if (existingReview) {
      const error = new Error("A review for this booking already exists.");
      error.statusCode = 409;
      throw error;
    }

    const newReview = await Review.create({
      ...data,
      review_status: REVIEW_STATUSES.SUBMITTED,
      moderation_status: REVIEW_MODERATION_STATUSES.PENDING
    });

    return newReview;
  }

  /**
   * Get a single review by ID (With visibility check)
   */
  async getReviewById(reviewId, userId, userRole) {
    const review = await Review.findById(reviewId)
      .populate("customer_id", "first_name last_name profile_image")
      .populate("provider_id", "business_information")
      .populate("service_id", "name");

    if (!review) {
      const error = new Error("Review not found.");
      error.statusCode = 404;
      throw error;
    }

    // Visibility Check: If not PUBLISHED, only the owner or Admin can view it
    const isOwner = review.customer_id._id.toString() === userId;
    const isAdmin = userRole === USER_ROLES.ADMIN;

    if (review.review_status !== REVIEW_STATUSES.PUBLISHED && !isOwner && !isAdmin) {
      const error = new Error("This review is not publicly available.");
      error.statusCode = 403;
      throw error;
    }

    return review;
  }

  /**
   * Update an existing review (Customer can only update their own)
   */
  async updateReview(reviewId, updateData, userId) {
    const review = await Review.findById(reviewId);
    if (!review) {
      const error = new Error("Review not found.");
      error.statusCode = 404;
      throw error;
    }

    // Ownership Check
    const customerProfile = await Customer.findOne({ user_id: userId });
    if (!customerProfile || review.customer_id.toString() !== customerProfile._id.toString()) {
      const error = new Error("Unauthorized: You can only update your own reviews.");
      error.statusCode = 403;
      throw error;
    }

    // Prevent updating if already removed by admin
    if (review.review_status === REVIEW_STATUSES.REMOVED) {
      const error = new Error("Cannot update a review that has been removed.");
      error.statusCode = 400;
      throw error;
    }

    // Update fields
    if (updateData.rating_value !== undefined) review.rating_value = updateData.rating_value;
    if (updateData.review_text !== undefined) review.review_text = updateData.review_text;
    
    // Reset moderation to pending if content changes (Optional, based on business rule)
    review.moderation_status = REVIEW_MODERATION_STATUSES.PENDING;
    review.review_status = REVIEW_STATUSES.SUBMITTED;

    await review.save();
    return review;
  }

  /**
   * Delete a review (Customer can only delete their own)
   */
  async deleteReview(reviewId, userId) {
    const review = await Review.findById(reviewId);
    if (!review) {
      const error = new Error("Review not found.");
      error.statusCode = 404;
      throw error;
    }

    // Ownership Check
    const customerProfile = await Customer.findOne({ user_id: userId });
    if (!customerProfile || review.customer_id.toString() !== customerProfile._id.toString()) {
      const error = new Error("Unauthorized: You can only delete your own reviews.");
      error.statusCode = 403;
      throw error;
    }

    await Review.findByIdAndDelete(reviewId);
    return { message: "Review deleted successfully." };
  }

  /**
   * Get reviews by Provider ID (For Provider Profile & Discovery)
   */
  async getReviewsByProvider(providerId, limit = 10, offset = 0) {
    return await Review.find({ 
      provider_id: providerId, 
      review_status: REVIEW_STATUSES.PUBLISHED 
    })
    .populate("customer_id", "first_name last_name profile_image")
    .populate("service_id", "name")
    .sort({ submitted_at: -1 })
    .limit(limit)
    .skip(offset);
  }

  /**
   * Get reviews by Customer ID (For Customer Dashboard)
   */
  async getReviewsByCustomer(customerId) {
    return await Review.find({ customer_id: customerId })
      .populate("provider_id", "business_information")
      .populate("service_id", "name")
      .sort({ submitted_at: -1 });
  }

  /**
   * Get Aggregate Rating Summary for a Provider
   */
  async getProviderRatingSummary(providerId) {
    const summary = await Review.aggregate([
      { 
        $match: { 
          provider_id: new mongoose.Types.ObjectId(providerId), 
          review_status: REVIEW_STATUSES.PUBLISHED 
        } 
      },
      { 
        $group: { 
          _id: "$provider_id", 
          average_rating: { $avg: "$rating_value" }, 
          total_reviews: { $sum: 1 } 
        } 
      }
    ]);

    if (summary.length === 0) {
      return { average_rating: 0, total_reviews: 0 };
    }

    return {
      average_rating: Math.round(summary[0].average_rating * 10) / 10,
      total_reviews: summary[0].total_reviews
    };
  }

  /**
   * Admin Moderation
   */
  async moderateReview(reviewId, moderationData, adminUserId) {
    const review = await Review.findById(reviewId);
    if (!review) {
      const error = new Error("Review not found.");
      error.statusCode = 404;
      throw error;
    }

    review.review_status = moderationData.review_status || review.review_status;
    review.moderation_status = moderationData.moderation_status || review.moderation_status;
    review.moderation_reason = moderationData.moderation_reason || null;
    review.moderated_by = adminUserId;
    review.moderated_at = new Date();

    await review.save();
    return review;
  }

  /**
   * Get all reviews for Admin Dashboard
   */
  async getAllReviewsForAdmin(filters = {}) {
    const query = {};
    if (filters.provider_id) query.provider_id = filters.provider_id;
    if (filters.moderation_status) query.moderation_status = filters.moderation_status;

    return await Review.find(query)
      .populate("customer_id", "first_name last_name email")
      .populate("provider_id", "business_information")
      .populate("moderated_by", "first_name last_name")
      .sort({ submitted_at: -1 });
  }
}

module.exports = new ReviewService();