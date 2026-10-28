const analyticsService = require('../services/analyticsService');
const { logger } = require('../utils/logger');

/**
 * Get analytics for the authenticated student
 * GET /api/student/analytics
 */
async function getStudentAnalytics(req, res) {
  try {
    const studentId = req.user._id;
    const analytics = await analyticsService.getStudentAnalytics(studentId);
    return res.status(200).json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    logger.error(`Error fetching student analytics: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve student analytics',
      details: error.message,
    });
  }
}

/**
 * Get analytics for the authenticated instructor
 * GET /api/instructor/analytics
 */
async function getInstructorAnalytics(req, res) {
  try {
    const instructorId = req.user._id;
    const analytics = await analyticsService.getInstructorAnalytics(instructorId);
    return res.status(200).json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    logger.error(`Error fetching instructor analytics: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve instructor analytics',
      details: error.message,
    });
  }
}

/**
 * Get platform-wide analytics for administrators
 * GET /api/admin/analytics
 */
async function getAdminAnalytics(req, res) {
  try {
    const analytics = await analyticsService.getAdminAnalytics();
    return res.status(200).json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    logger.error(`Error fetching admin analytics: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve admin analytics',
      details: error.message,
    });
  }
}

module.exports = {
  getStudentAnalytics,
  getInstructorAnalytics,
  getAdminAnalytics,
};

