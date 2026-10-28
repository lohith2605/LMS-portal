const express = require('express');
const router = express.Router();
const {
  getMyNotifications,
  getMyUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
} = require('../controllers/notificationController');
const { protect } = require('../middleware/authMiddleware');

// All notification endpoints are private to the authenticated session
router.use(protect);

router.get('/', getMyNotifications);
router.get('/unread-count', getMyUnreadCount);
router.patch('/mark-all-read', markAllNotificationsRead);
router.patch('/:id/read', markNotificationRead);

module.exports = router;

