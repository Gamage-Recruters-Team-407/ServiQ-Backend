const Review = require("../models/Review");
const ServiceCompletion = require("../models/ServiceCompletion");
const mongoose = require("mongoose");
const { REVIEW_STATUSES, REVIEW_MODERATION_STATUSES } = require("../constants/enums");

class ReviewService {
  /**
   * Create a new review (No Backend Auth Check - Uses body data directly)
   */
  async createReview(data) {
    // 1. Check if Service is Completed and Eligible for Review
    const completion = await ServiceCompletion.findOne({ booking_id: data.booking_id });
    if (!completion) {
      const error = new Error("Service completion record not found.");
      error.statusCode = 404;
      throw error;
    }
    if (completion.current_status !== "Completed" || !completion.review_eligibility) {
      const error = new Error("Review not allowed: Service is not completed or not eligible yet.");
      error.statusCode = 400;
      throw error;
    }

    // 2. Check if a review already exists for this booking
    const existingReview = await Review.findOne({ booking_id: data.booking_id });
    if (existingReview) {
      const error = new Error("A review for this booking already exists.");
      error.statusCode = 409;
      throw error;
    }

    // 3. Create the Review using data from the request body directly
    const newReview = await Review.create({
      ...data,
      review_status: REVIEW_STATUSES.SUBMITTED,
      moderation_status: REVIEW_MODERATION_STATUSES.PENDING
    });

    return newReview;
  }

  /**
   * Update an existing review (No Auth Check)
   */
  async updateReview(reviewId, updateData) {
    const review = await Review.findById(reviewId);
    if (!review) {
      const error = new Error("Review not found.");
      error.statusCode = 404;
      throw error;
    }

    if (review.review_status === REVIEW_STATUSES.REMOVED) {
      const error = new Error("Cannot update a review that has been removed.");
      error.statusCode = 400;
      throw error;
    }

    if (updateData.rating_value !== undefined) review.rating_value = updateData.rating_value;
    if (updateData.review_text !== undefined) review.review_text = updateData.review_text;
    
    review.moderation_status = REVIEW_MODERATION_STATUSES.PENDING;
    review.review_status = REVIEW_STATUSES.SUBMITTED;

    await review.save();
    return review;
  }

  /**
   * Delete a review (No Auth Check)
   */
  async deleteReview(reviewId) {
    const review = await Review.findById(reviewId);
    if (!review) {
      const error = new Error("Review not found.");
      error.statusCode = 404;
      throw error;
    }

    await Review.findByIdAndDelete(reviewId);
    return { message: "Review deleted successfully." };
  }

  /**
   * Get a single review by ID
   */
  async getReviewById(reviewId) {
    const review = await Review.findById(reviewId)
      .populate("customer_id", "first_name last_name profile_image")
      .populate("provider_id", "business_information")
      .populate("service_id", "name");

    if (!review) {
      const error = new Error("Review not found.");
      error.statusCode = 404;
      throw error;
    }
    return review;
  }

  /**
   * Get reviews by Provider ID
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
   * Get reviews by Customer ID
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
   * Admin Moderation (Still keeps basic admin check if needed, or can be removed)
   */
  async moderateReview(reviewId, moderationData) {
    const review = await Review.findById(reviewId);
    if (!review) {
      const error = new Error("Review not found.");
      error.statusCode = 404;
      throw error;
    }

    review.review_status = moderationData.review_status || review.review_status;
    review.moderation_status = moderationData.moderation_status || review.moderation_status;
    review.moderation_reason = moderationData.moderation_reason || null;
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
      .sort({ submitted_at: -1 });
  }
}

module.exports = new ReviewService();