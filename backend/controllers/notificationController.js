const {
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} = require('../services/notificationService');
const { logger } = require('../utils/logger');

/**
 * GET /api/notifications
 * Retrieve paginated notifications for the authenticated user
 */
const getMyNotifications = async (req, res) => {
  try {
    const data = await getUserNotifications(req.user.id, req.query);
    return res.status(200).json(data);
  } catch (err) {
    logger.error(`getMyNotifications error: ${err.message}`);
    return res.status(500).json({ error: 'Failed to retrieve notifications.' });
  }
};

/**
 * GET /api/notifications/unread-count
 * Retrieve total unread notifications count for the authenticated user
 */
const getMyUnreadCount = async (req, res) => {
  try {
    const unreadCount = await getUnreadCount(req.user.id);
    return res.status(200).json({ unreadCount });
  } catch (err) {
    logger.error(`getMyUnreadCount error: ${err.message}`);
    return res.status(500).json({ error: 'Failed to retrieve unread notification count.' });
  }
};

/**
 * PATCH /api/notifications/:id/read
 * Mark a single notification as read (strictly verifies user ownership)
 */
const markNotificationRead = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await markAsRead(id, req.user.id);

    if (result.error) {
      return res.status(result.status || 400).json({ error: result.error });
    }

    return res.status(200).json({
      message: 'Notification marked as read.',
      notification: result.notification,
    });
  } catch (err) {
    logger.error(`markNotificationRead error: ${err.message}`);
    return res.status(500).json({ error: 'Failed to update notification status.' });
  }
};

/**
 * PATCH /api/notifications/mark-all-read
 * Mark all unread notifications for the authenticated user as read
 */
const markAllNotificationsRead = async (req, res) => {
  try {
    const result = await markAllAsRead(req.user.id);
    return res.status(200).json({
      message: 'All notifications marked as read.',
      updatedCount: result.modifiedCount,
    });
  } catch (err) {
    logger.error(`markAllNotificationsRead error: ${err.message}`);
    return res.status(500).json({ error: 'Failed to mark notifications as read.' });
  }
};

module.exports = {
  getMyNotifications,
  getMyUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
};

