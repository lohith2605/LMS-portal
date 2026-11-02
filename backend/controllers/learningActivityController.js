const streakService = require('../services/streakService');
const { logger } = require('../utils/logger');

/**
 * GET /api/learning-activity/summary
 * Retrieve the authenticated student's streak stats, today's study seconds,
 * week study seconds, and week daily breakdown.
 */
const getLearningSummary = async (req, res) => {
  try {
    const studentId = req.user.id;
    const requestedTz = req.query.timezone || req.headers['x-timezone'] || req.user.timezone;

    const summary = await streakService.getLearningSummary(studentId, requestedTz);

    return res.status(200).json({
      success: true,
      ...summary,
    });
  } catch (error) {
    logger.error(`Error fetching learning summary: ${error.message}`);
    return res.status(500).json({
      error: 'Failed to retrieve learning activity summary.',
    });
  }
};

/**
 * POST /api/learning-activity/heartbeat
 * Record a bounded active study-time interval for the authenticated student.
 */
const recordHeartbeat = async (req, res) => {
  try {
    const studentId = req.user.id;
    const {
      courseId,
      durationSeconds,
      lessonId,
      sectionId,
      idempotencyKey,
      timezone,
      metadata,
    } = req.body;

    if (!courseId) {
      return res.status(400).json({ error: 'courseId is required.' });
    }

    if (durationSeconds === undefined || durationSeconds === null) {
      return res.status(400).json({ error: 'durationSeconds is required.' });
    }

    const requestedTz = timezone || req.headers['x-timezone'] || req.user.timezone;

    const result = await streakService.recordActiveStudyTime({
      userId: studentId,
      courseId,
      durationSeconds,
      timeZone: requestedTz,
      idempotencyKey,
      lessonId,
      sectionId,
      metadata,
    });

    return res.status(200).json(result);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    if (statusCode < 500) {
      return res.status(statusCode).json({ error: error.message });
    }
    logger.error(`Error recording study heartbeat: ${error.message}`);
    return res.status(500).json({
      error: 'Failed to record study activity.',
    });
  }
};

/**
 * POST /api/learning-activity/complete
 * Record a qualifying learning completion event (lesson, video, quiz, etc.).
 */
const recordCompletionActivity = async (req, res) => {
  try {
    const studentId = req.user.id;
    const {
      courseId,
      lessonId,
      sectionId,
      activityType = 'lesson_completion',
      idempotencyKey,
      timezone,
      metadata,
    } = req.body;

    if (!courseId) {
      return res.status(400).json({ error: 'courseId is required.' });
    }

    const requestedTz = timezone || req.headers['x-timezone'] || req.user.timezone;

    const result = await streakService.recordQualifyingActivity({
      userId: studentId,
      courseId,
      lessonId,
      sectionId,
      activityType,
      timeZone: requestedTz,
      idempotencyKey,
      metadata,
    });

    return res.status(200).json(result);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    if (statusCode < 500) {
      return res.status(statusCode).json({ error: error.message });
    }
    logger.error(`Error recording completion activity: ${error.message}`);
    return res.status(500).json({
      error: 'Failed to record completion activity.',
    });
  }
};

/**
 * GET /api/learning-activity/monthly
 * Retrieve monthly daily learning history for calendar/heatmap view
 */
const getMonthlyActivity = async (req, res) => {
  try {
    const studentId = req.user.id;
    const requestedTz = req.query.timezone || req.headers['x-timezone'] || req.user.timezone;
    const month = req.query.month; // Optional 'YYYY-MM'

    const result = await streakService.getMonthlyActivity(studentId, month, requestedTz);

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    logger.error(`Error fetching monthly learning activity: ${error.message}`);
    return res.status(500).json({
      error: 'Failed to retrieve monthly learning activity.',
    });
  }
};

module.exports = {
  getLearningSummary,
  getMonthlyActivity,
  recordHeartbeat,
  recordCompletionActivity,
};

