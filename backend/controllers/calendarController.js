const {
  getStudentCalendarActivities,
  getInstructorCalendarActivities,
  getUpcomingDeadlines,
} = require('../services/calendarService');
const { processDeadlineReminders } = require('../services/deadlineReminderScheduler');
const { logger } = require('../utils/logger');

/**
 * GET /api/calendar
 * Retrieve authorized calendar activities based on user role and date range
 */
const getCalendarEvents = async (req, res) => {
  try {
    const role = req.user.role || 'student';

    if (role === 'instructor') {
      const data = await getInstructorCalendarActivities(req.user.id, req.query);
      if (data.error) {
        return res.status(data.status || 400).json({ error: data.error });
      }
      return res.status(200).json(data);
    }

    // Default to student perspective (also applicable for learners and admins exploring student view)
    const data = await getStudentCalendarActivities(req.user.id, req.query);
    if (data.error) {
      return res.status(data.status || 400).json({ error: data.error });
    }
    return res.status(200).json(data);
  } catch (err) {
    logger.error(`getCalendarEvents error: ${err.message}`);
    return res.status(500).json({ error: 'Failed to retrieve academic calendar activities.' });
  }
};

/**
 * GET /api/calendar/upcoming
 * Retrieve upcoming incomplete deadlines for authenticated student
 */
const getUpcoming = async (req, res) => {
  try {
    const data = await getUpcomingDeadlines(req.user.id, req.query);
    return res.status(200).json(data);
  } catch (err) {
    logger.error(`getUpcoming error: ${err.message}`);
    return res.status(500).json({ error: 'Failed to retrieve upcoming deadlines.' });
  }
};

/**
 * POST /api/calendar/reminders/trigger
 * Administrative / test endpoint to trigger a deadline reminder sweep
 */
const triggerReminderSweep = async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'instructor') {
      return res.status(403).json({ error: 'Forbidden: Insufficient privileges.' });
    }

    const results = await processDeadlineReminders();
    return res.status(200).json({
      message: 'Deadline reminder sweep completed successfully.',
      results,
    });
  } catch (err) {
    logger.error(`triggerReminderSweep error: ${err.message}`);
    return res.status(500).json({ error: 'Failed to execute deadline reminder sweep.' });
  }
};

module.exports = {
  getCalendarEvents,
  getUpcoming,
  triggerReminderSweep,
};

