const express = require('express');
const router = express.Router();
const {
  getLearningSummary,
  getMonthlyActivity,
  recordHeartbeat,
  recordCompletionActivity,
} = require('../controllers/learningActivityController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

// All learning activity endpoints require authentication and student or admin role
router.use(protect);
router.use(restrictTo('student', 'admin'));

// Summary endpoint: current/longest streaks, today/week study time, weekly breakdown
router.get('/summary', getLearningSummary);

// Monthly activity history for calendar/heatmap view
router.get('/monthly', getMonthlyActivity);

// Study time tracking heartbeat
router.post('/heartbeat', recordHeartbeat);
router.post('/active-time', recordHeartbeat);

// Explicit qualifying activity recording (e.g. lesson, video completion)
router.post('/complete', recordCompletionActivity);

module.exports = router;

