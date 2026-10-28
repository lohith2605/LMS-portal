const reviewService = require('../services/reviewService');
const { logger } = require('../utils/logger');

/**
 * GET /api/courses/:idOrSlug/reviews
 * Public endpoint to fetch paginated reviews and aggregate rating summary
 */
const getCourseReviews = async (req, res) => {
  try {
    const { idOrSlug } = req.params;
    const { page, limit, sort } = req.query;
    const currentUser = req.user || null;

    const result = await reviewService.getCourseReviews({
      courseIdOrSlug: idOrSlug,
      page,
      limit,
      sort,
      currentUser,
    });

    return res.status(200).json(result);
  } catch (error) {
    logger.error(`getCourseReviews error: ${error.message}`);
    const status = error.status || 500;
    return res.status(status).json({
      error: error.message || 'Failed to retrieve course reviews.',
    });
  }
};

/**
 * GET /api/courses/:idOrSlug/reviews/my-review
 * Authenticated endpoint for a student to check eligibility and fetch their existing review
 */
const getMyReview = async (req, res) => {
  try {
    const { idOrSlug } = req.params;
    const course = await reviewService.resolveCourse(idOrSlug);
    if (!course) {
      return res.status(404).json({ error: 'Course not found.' });
    }

    const eligibility = await reviewService.checkReviewEligibility(req.user, course);
    return res.status(200).json(eligibility);
  } catch (error) {
    logger.error(`getMyReview error: ${error.message}`);
    const status = error.status || 500;
    return res.status(status).json({
      error: error.message || 'Failed to check review eligibility.',
    });
  }
};

/**
 * POST /api/courses/:idOrSlug/reviews
 * Authenticated student creates a review
 */
const createReview = async (req, res) => {
  try {
    const { idOrSlug } = req.params;
    const { rating, reviewText } = req.body;

    const result = await reviewService.createReview({
      user: req.user,
      courseIdOrSlug: idOrSlug,
      rating,
      reviewText,
    });

    return res.status(201).json({
      message: 'Review successfully submitted.',
      ...result,
    });
  } catch (error) {
    logger.error(`createReview error: ${error.message}`);
    const status = error.status || 500;
    return res.status(status).json({
      error: error.message || 'Failed to submit course review.',
    });
  }
};

/**
 * PATCH /api/courses/:idOrSlug/reviews/:reviewId
 * Authenticated student updates their own review
 */
const updateReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { rating, reviewText } = req.body;

    const result = await reviewService.updateReview({
      user: req.user,
      reviewId,
      rating,
      reviewText,
    });

    return res.status(200).json({
      message: 'Review successfully updated.',
      ...result,
    });
  } catch (error) {
    logger.error(`updateReview error: ${error.message}`);
    const status = error.status || 500;
    return res.status(status).json({
      error: error.message || 'Failed to update review.',
    });
  }
};

/**
 * DELETE /api/courses/:idOrSlug/reviews/:reviewId
 * Authenticated student deletes their own review (or admin deletes any)
 */
const deleteReview = async (req, res) => {
  try {
    const { reviewId } = req.params;

    const result = await reviewService.deleteReview({
      user: req.user,
      reviewId,
    });

    return res.status(200).json(result);
  } catch (error) {
    logger.error(`deleteReview error: ${error.message}`);
    const status = error.status || 500;
    return res.status(status).json({
      error: error.message || 'Failed to delete review.',
    });
  }
};

/**
 * GET /api/admin/reviews
 * Admin retrieves all reviews with pagination and filters
 */
const getAdminReviews = async (req, res) => {
  try {
    const { page, limit, status, courseId } = req.query;

    const result = await reviewService.getAdminReviews({
      page,
      limit,
      status,
      courseId,
    });

    return res.status(200).json(result);
  } catch (error) {
    logger.error(`getAdminReviews error: ${error.message}`);
    const status = error.status || 500;
    return res.status(status).json({
      error: error.message || 'Failed to retrieve reviews for moderation.',
    });
  }
};

/**
 * PATCH /api/admin/reviews/:id/hide
 * Admin hides an inappropriate review
 */
const hideReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const result = await reviewService.moderateReview({
      adminUser: req.user,
      reviewId: id,
      action: 'hide',
      reason,
    });

    return res.status(200).json({
      message: 'Review has been hidden from public display.',
      ...result,
    });
  } catch (error) {
    logger.error(`hideReview error: ${error.message}`);
    const status = error.status || 500;
    return res.status(status).json({
      error: error.message || 'Failed to hide review.',
    });
  }
};

/**
 * PATCH /api/admin/reviews/:id/restore
 * Admin restores a hidden review
 */
const restoreReview = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await reviewService.moderateReview({
      adminUser: req.user,
      reviewId: id,
      action: 'restore',
    });

    return res.status(200).json({
      message: 'Review has been restored to public display.',
      ...result,
    });
  } catch (error) {
    logger.error(`restoreReview error: ${error.message}`);
    const status = error.status || 500;
    return res.status(status).json({
      error: error.message || 'Failed to restore review.',
    });
  }
};

module.exports = {
  getCourseReviews,
  getMyReview,
  createReview,
  updateReview,
  deleteReview,
  getAdminReviews,
  hideReview,
  restoreReview,
};

