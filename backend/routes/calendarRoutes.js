const express = require('express');
const router = express.Router();
const {
  getCalendarEvents,
  getUpcoming,
  triggerReminderSweep,
} = require('../controllers/calendarController');
const { protect } = require('../middleware/authMiddleware');

// All calendar endpoints are private to authenticated sessions
router.use(protect);

router.get('/', getCalendarEvents);
router.get('/upcoming', getUpcoming);
router.post('/reminders/trigger', triggerReminderSweep);

module.exports = router;

