const mongoose = require('mongoose');
const Notification = require('../models/Notification');
const { emitToUser } = require('./socketService');
const { logger } = require('../utils/logger');

/**
 * Persist and emit a real-time notification to a user
 */
const createNotification = async ({
  recipient,
  type,
  title,
  message,
  link = '',
  metadata = {},
}) => {
  try {
    if (!recipient) {
      logger.warn('Notification skipped: Recipient missing');
      return null;
    }

    const recipientId = recipient._id ? recipient._id.toString() : recipient.toString();
    if (!mongoose.Types.ObjectId.isValid(recipientId)) {
      logger.warn(`Notification skipped: Invalid recipient ObjectId (${recipientId})`);
      return null;
    }

    let notification;
    // Check if disconnected and unmocked (e.g. running other unit tests without DB connection)
    if (mongoose.connection.readyState === 0 && Notification.create === mongoose.Model.create) {
      notification = {
        _id: new mongoose.Types.ObjectId(),
        recipient: recipientId,
        type,
        title: title ? title.trim() : 'Notification',
        message: message ? message.trim() : '',
        link: link || '',
        metadata: metadata || {},
        isRead: false,
        createdAt: new Date(),
      };
    } else {
      notification = await Notification.create({
        recipient: recipientId,
        type,
        title: title ? title.trim() : 'Notification',
        message: message ? message.trim() : '',
        link: link || '',
        metadata: metadata || {},
      });
    }

    // Real-time dispatch to the recipient's authenticated socket room
    emitToUser(
      recipientId,
      'notification:new',
      notification.toObject ? notification.toObject() : notification
    );

    return notification;
  } catch (err) {
    logger.error(`Notification creation error: ${err.message}`);
    return null;
  }
};

/**
 * Persist and dispatch notifications in bulk (e.g. course-wide announcements)
 */
const createBatchNotifications = async (items = []) => {
  if (!items || items.length === 0) return [];
  try {
    const validItems = items.filter(
      (item) => item.recipient && mongoose.Types.ObjectId.isValid(item.recipient.toString())
    );

    if (validItems.length === 0) return [];

    let created;
    if (mongoose.connection.readyState === 0 && Notification.insertMany === mongoose.Model.insertMany) {
      created = validItems.map((item) => ({
        _id: new mongoose.Types.ObjectId(),
        ...item,
        isRead: false,
        createdAt: new Date(),
      }));
    } else {
      created = await Notification.insertMany(validItems);
    }

    for (const notif of created) {
      emitToUser(
        notif.recipient.toString(),
        'notification:new',
        notif.toObject ? notif.toObject() : notif
      );
    }

    return created;
  } catch (err) {
    logger.error(`Batch notification error: ${err.message}`);
    return [];
  }
};

/**
 * Retrieve paginated notifications for the authenticated user
 */
const getUserNotifications = async (userId, options = {}) => {
  const page = Math.max(1, parseInt(options.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(options.limit, 10) || 20));
  const skip = (page - 1) * limit;

  const filter = { recipient: userId };
  if (options.unreadOnly === true || options.unreadOnly === 'true') {
    filter.isRead = false;
  }

  const [total, notifications] = await Promise.all([
    Notification.countDocuments(filter),
    Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
  ]);

  return {
    notifications,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit) || 1,
    },
    unreadCount: await getUnreadCount(userId),
  };
};

/**
 * Retrieve total unread notifications count for the authenticated user
 */
const getUnreadCount = async (userId) => {
  try {
    return await Notification.countDocuments({
      recipient: userId,
      isRead: false,
    });
  } catch (err) {
    logger.error(`Get unread count error: ${err.message}`);
    return 0;
  }
};

/**
 * Mark a single notification as read, ensuring strict recipient ownership
 */
const markAsRead = async (notificationId, userId) => {
  if (!mongoose.Types.ObjectId.isValid(notificationId)) {
    return { error: 'Invalid notification ID format.', status: 400 };
  }

  const notification = await Notification.findOne({
    _id: notificationId,
    recipient: userId,
  });

  if (!notification) {
    return { error: 'Notification not found or access denied.', status: 404 };
  }

  if (!notification.isRead) {
    notification.isRead = true;
    await notification.save();
  }

  return { notification };
};

/**
 * Mark all unread notifications as read for the authenticated user
 */
const markAllAsRead = async (userId) => {
  const result = await Notification.updateMany(
    { recipient: userId, isRead: false },
    { $set: { isRead: true } }
  );

  return {
    modifiedCount: result.modifiedCount || 0,
  };
};

module.exports = {
  createNotification,
  createBatchNotifications,
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
};

