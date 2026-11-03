const mongoose = require('mongoose');
const Announcement = require('../models/Announcement');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const User = require('../models/User');
const {
  createBatchNotifications,
  normalizeNotificationTitle,
  normalizeNotificationMessage,
} = require('../services/notificationService');
const { logger } = require('../utils/logger');

/**
 * Resolve a Course document by ObjectId or slug
 */
const resolveCourse = async (courseIdOrSlug) => {
  if (!courseIdOrSlug) return null;
  if (mongoose.Types.ObjectId.isValid(courseIdOrSlug)) {
    return await Course.findById(courseIdOrSlug);
  }
  return await Course.findOne({ slug: String(courseIdOrSlug).toLowerCase().trim() });
};

/**
 * Check if the user is authorized to manage course announcements
 * (Assigned course instructor or system admin)
 */
const canManageCourseAnnouncements = (course, user) => {
  if (!course || !user) return false;
  if (user.role === 'admin') return true;
  const instructorId = course.instructor ? (course.instructor._id || course.instructor).toString() : '';
  return instructorId === (user.id || user._id).toString();
};

/**
 * Check if the user has access to view a course's announcements
 * (Admin, Course Instructor, or actively enrolled student)
 */
const canViewCourseAnnouncements = async (course, user) => {
  if (!course || !user) return false;
  const userId = (user.id || user._id).toString();
  if (user.role === 'admin') return true;

  const instructorId = course.instructor ? (course.instructor._id || course.instructor).toString() : '';
  if (instructorId === userId) return true;

  const enrollment = await Enrollment.findOne({
    course: course._id,
    student: userId,
    status: { $in: ['active', 'completed'] },
  });
  return !!enrollment;
};

/**
 * POST /api/courses/:courseId/announcements
 * Create a course announcement (Instructor of course or Admin)
 */
const createCourseAnnouncement = async (req, res) => {
  try {
    const courseIdOrSlug = req.params.courseId || req.params.idOrSlug;
    const course = await resolveCourse(courseIdOrSlug);

    if (!course) {
      return res.status(404).json({ error: 'Course not found.' });
    }

    if (!canManageCourseAnnouncements(course, req.user)) {
      return res.status(403).json({
        error: 'Forbidden: Only the assigned course instructor or an administrator can post course announcements.',
      });
    }

    const { title, content, priority = 'normal', isPinned = false, expiresAt } = req.body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'Announcement title is required.' });
    }
    if (title.trim().length > 150) {
      return res.status(400).json({ error: 'Announcement title cannot exceed 150 characters.' });
    }

    if (!content || typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({ error: 'Announcement content is required.' });
    }
    if (content.trim().length > 5000) {
      return res.status(400).json({ error: 'Announcement content cannot exceed 5000 characters.' });
    }

    const validPriorities = ['low', 'normal', 'high', 'urgent'];
    if (priority && !validPriorities.includes(priority)) {
      return res.status(400).json({
        error: `Invalid priority level. Allowed values: ${validPriorities.join(', ')}`,
      });
    }

    let parsedExpiresAt = null;
    if (expiresAt) {
      parsedExpiresAt = new Date(expiresAt);
      if (isNaN(parsedExpiresAt.getTime())) {
        return res.status(400).json({ error: 'Invalid expiration date.' });
      }
      if (parsedExpiresAt <= new Date()) {
        return res.status(400).json({ error: 'Expiration date must be in the future.' });
      }
    }

    const announcement = await Announcement.create({
      title: title.trim(),
      content: content.trim(),
      scope: 'course',
      course: course._id,
      author: req.user.id,
      priority,
      isPinned: Boolean(isPinned),
      expiresAt: parsedExpiresAt,
    });

    // Populate author details for immediate client display
    await announcement.populate('author', 'name role profilePicture');

    // Real-time batch notifications to all enrolled students
    try {
      const enrollments = await Enrollment.find({
        course: course._id,
        status: { $in: ['active', 'completed'] },
      }).select('student');

      if (enrollments && enrollments.length > 0) {
        const notifPayloads = enrollments
          .map((enr) => ({
            recipient: enr.student,
            type: 'course_announcement',
            title: normalizeNotificationTitle(`Announcement: ${announcement.title}`),
            message: normalizeNotificationMessage(announcement.content),
            link: `/courses/${course.slug || course._id}/learn?view=announcements`,
            metadata: {
              courseId: course._id,
              announcementId: announcement._id,
              priority: announcement.priority,
            },
          }))
          .filter((item) => item.recipient && item.recipient.toString() !== req.user.id);

        if (notifPayloads.length > 0) {
          await createBatchNotifications(notifPayloads);
        }
      }
    } catch (notifErr) {
      logger.warn(`Failed to dispatch course announcement notifications: ${notifErr.message}`);
    }

    logger.success(
      `Course announcement created: "${announcement.title}" by ${req.user.email} in course ${course.title}`
    );

    return res.status(201).json({
      message: 'Course announcement created successfully.',
      announcement,
    });
  } catch (error) {
    logger.error(`createCourseAnnouncement error: ${error.message}`);
    return res.status(500).json({ error: 'Failed to create course announcement.' });
  }
};

/**
 * GET /api/courses/:courseId/announcements
 * Retrieve announcements for a specific course
 */
const getCourseAnnouncements = async (req, res) => {
  try {
    const courseIdOrSlug = req.params.courseId || req.params.idOrSlug;
    const course = await resolveCourse(courseIdOrSlug);

    if (!course) {
      return res.status(404).json({ error: 'Course not found.' });
    }

    const hasAccess = await canViewCourseAnnouncements(course, req.user);
    if (!hasAccess) {
      return res.status(403).json({
        error: 'Forbidden: You must be enrolled in this course to view its announcements.',
      });
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    const query = {
      scope: 'course',
      course: course._id,
    };

    // By default, exclude expired announcements unless explicitly requested by authorized educator/admin
    const includeExpired = req.query.includeExpired === 'true' && canManageCourseAnnouncements(course, req.user);
    if (!includeExpired) {
      query.$or = [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }];
    }

    const [announcements, total] = await Promise.all([
      Announcement.find(query)
        .sort({ isPinned: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('author', 'name role profilePicture')
        .lean(),
      Announcement.countDocuments(query),
    ]);

    return res.status(200).json({
      announcements,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    logger.error(`getCourseAnnouncements error: ${error.message}`);
    return res.status(500).json({ error: 'Failed to retrieve course announcements.' });
  }
};

/**
 * POST /api/admin/announcements
 * Create a platform-wide announcement (Admin only)
 */
const createPlatformAnnouncement = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'Forbidden: Administrator privileges required to create platform announcements.',
      });
    }

    const {
      title,
      content,
      targetRoles = ['all'],
      priority = 'normal',
      isPinned = false,
      expiresAt,
    } = req.body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'Announcement title is required.' });
    }
    if (title.trim().length > 150) {
      return res.status(400).json({ error: 'Announcement title cannot exceed 150 characters.' });
    }

    if (!content || typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({ error: 'Announcement content is required.' });
    }
    if (content.trim().length > 5000) {
      return res.status(400).json({ error: 'Announcement content cannot exceed 5000 characters.' });
    }

    const validRoles = ['student', 'instructor', 'all'];
    const rolesArray = Array.isArray(targetRoles) ? targetRoles : [targetRoles];
    const invalidRoles = rolesArray.filter((r) => !validRoles.includes(r));
    if (invalidRoles.length > 0) {
      return res.status(400).json({
        error: `Invalid target role(s): ${invalidRoles.join(', ')}. Allowed values: ${validRoles.join(', ')}`,
      });
    }

    const validPriorities = ['low', 'normal', 'high', 'urgent'];
    if (priority && !validPriorities.includes(priority)) {
      return res.status(400).json({
        error: `Invalid priority level. Allowed values: ${validPriorities.join(', ')}`,
      });
    }

    let parsedExpiresAt = null;
    if (expiresAt) {
      parsedExpiresAt = new Date(expiresAt);
      if (isNaN(parsedExpiresAt.getTime())) {
        return res.status(400).json({ error: 'Invalid expiration date.' });
      }
      if (parsedExpiresAt <= new Date()) {
        return res.status(400).json({ error: 'Expiration date must be in the future.' });
      }
    }

    const announcement = await Announcement.create({
      title: title.trim(),
      content: content.trim(),
      scope: 'platform',
      course: null,
      author: req.user.id,
      targetRoles: rolesArray.length > 0 ? rolesArray : ['all'],
      priority,
      isPinned: Boolean(isPinned),
      expiresAt: parsedExpiresAt,
    });

    await announcement.populate('author', 'name role profilePicture');

    // Real-time batch notifications to matching active users
    try {
      let roleFilter = {};
      if (rolesArray.includes('all')) {
        roleFilter = { role: { $in: ['student', 'instructor'] } };
      } else {
        roleFilter = { role: { $in: rolesArray } };
      }

      const eligibleUsers = await User.find({
        ...roleFilter,
        accountStatus: 'active',
        _id: { $ne: req.user.id },
      }).select('_id role');

      if (eligibleUsers && eligibleUsers.length > 0) {
        const notifPayloads = eligibleUsers.map((u) => ({
          recipient: u._id,
          type: 'platform_announcement',
          title: normalizeNotificationTitle(`Platform Notice: ${announcement.title}`),
          message: normalizeNotificationMessage(announcement.content),
          link:
            u.role === 'instructor'
              ? '/instructor/dashboard?tab=announcements'
              : '/student/dashboard?tab=announcements',
          metadata: {
            announcementId: announcement._id,
            priority: announcement.priority,
            scope: 'platform',
          },
        }));

        await createBatchNotifications(notifPayloads);
      }
    } catch (notifErr) {
      logger.warn(`Failed to dispatch platform announcement notifications: ${notifErr.message}`);
    }

    logger.success(
      `Platform announcement created: "${announcement.title}" by ${req.user.email} (Target: ${rolesArray.join(', ')})`
    );

    return res.status(201).json({
      message: 'Platform announcement published successfully.',
      announcement,
    });
  } catch (error) {
    logger.error(`createPlatformAnnouncement error: ${error.message}`);
    return res.status(500).json({ error: 'Failed to create platform announcement.' });
  }
};

/**
 * GET /api/announcements
 * Retrieve announcements visible to the authenticated user
 * (Aggregates relevant platform bulletins and authorized course announcements)
 */
const getUserAnnouncements = async (req, res) => {
  try {
    const user = req.user;
    const userId = (user.id || user._id).toString();
    const userRole = user.role ? user.role.toLowerCase() : 'student';

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;
    const scopeFilter = req.query.scope; // 'course' | 'platform' | undefined

    const activeDateCondition = {
      $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
    };

    let visibilityConditions = [];

    // 1. Platform announcements visible to user role
    const platformCondition = {
      scope: 'platform',
      ...activeDateCondition,
    };
    if (userRole !== 'admin') {
      platformCondition.targetRoles = { $in: [userRole, 'all'] };
    }

    if (!scopeFilter || scopeFilter === 'platform') {
      visibilityConditions.push(platformCondition);
    }

    // 2. Course announcements visible to user
    if (!scopeFilter || scopeFilter === 'course') {
      if (userRole === 'admin') {
        // Admin sees all course announcements
        visibilityConditions.push({
          scope: 'course',
          ...activeDateCondition,
        });
      } else if (userRole === 'instructor') {
        // Instructor sees announcements for courses they instruct
        const courses = await Course.find({ instructor: userId }).select('_id');
        const courseIds = courses.map((c) => c._id);
        if (courseIds.length > 0) {
          visibilityConditions.push({
            scope: 'course',
            course: { $in: courseIds },
            ...activeDateCondition,
          });
        }
      } else {
        // Student sees announcements for enrolled active/completed courses
        const enrollments = await Enrollment.find({
          student: userId,
          status: { $in: ['active', 'completed'] },
        }).select('course');
        const enrolledCourseIds = enrollments.map((e) => e.course);
        if (enrolledCourseIds.length > 0) {
          visibilityConditions.push({
            scope: 'course',
            course: { $in: enrolledCourseIds },
            ...activeDateCondition,
          });
        }
      }
    }

    if (visibilityConditions.length === 0) {
      return res.status(200).json({
        announcements: [],
        pagination: { page, limit, total: 0, pages: 1 },
      });
    }

    const finalQuery =
      visibilityConditions.length === 1
        ? visibilityConditions[0]
        : { $or: visibilityConditions };

    const [announcements, total] = await Promise.all([
      Announcement.find(finalQuery)
        .sort({ isPinned: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('author', 'name role profilePicture')
        .populate('course', 'title slug')
        .lean(),
      Announcement.countDocuments(finalQuery),
    ]);

    return res.status(200).json({
      announcements,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    logger.error(`getUserAnnouncements error: ${error.message}`);
    return res.status(500).json({ error: 'Failed to retrieve announcements.' });
  }
};

/**
 * PATCH /api/announcements/:id
 * Edit an announcement (Author or Admin)
 */
const updateAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid announcement identifier.' });
    }

    const announcement = await Announcement.findById(id);
    if (!announcement) {
      return res.status(404).json({ error: 'Announcement not found.' });
    }

    // Authorization: Author or Admin
    const isAuthor = announcement.author.toString() === (req.user.id || req.user._id).toString();
    const isAdmin = req.user.role === 'admin';
    if (!isAuthor && !isAdmin) {
      return res.status(403).json({
        error: 'Forbidden: You do not have permission to modify this announcement.',
      });
    }

    const { title, content, priority, isPinned, expiresAt, targetRoles } = req.body;

    if (title !== undefined) {
      if (typeof title !== 'string' || !title.trim()) {
        return res.status(400).json({ error: 'Announcement title cannot be empty.' });
      }
      if (title.trim().length > 150) {
        return res.status(400).json({ error: 'Announcement title cannot exceed 150 characters.' });
      }
      announcement.title = title.trim();
    }

    if (content !== undefined) {
      if (typeof content !== 'string' || !content.trim()) {
        return res.status(400).json({ error: 'Announcement content cannot be empty.' });
      }
      if (content.trim().length > 5000) {
        return res.status(400).json({ error: 'Announcement content cannot exceed 5000 characters.' });
      }
      announcement.content = content.trim();
    }

    if (priority !== undefined) {
      const validPriorities = ['low', 'normal', 'high', 'urgent'];
      if (!validPriorities.includes(priority)) {
        return res.status(400).json({
          error: `Invalid priority level. Allowed values: ${validPriorities.join(', ')}`,
        });
      }
      announcement.priority = priority;
    }

    if (isPinned !== undefined) {
      announcement.isPinned = Boolean(isPinned);
    }

    if (expiresAt !== undefined) {
      if (expiresAt === null || expiresAt === '') {
        announcement.expiresAt = null;
      } else {
        const parsed = new Date(expiresAt);
        if (isNaN(parsed.getTime())) {
          return res.status(400).json({ error: 'Invalid expiration date format.' });
        }
        announcement.expiresAt = parsed;
      }
    }

    if (announcement.scope === 'platform' && targetRoles !== undefined && isAdmin) {
      const validRoles = ['student', 'instructor', 'all'];
      const rolesArray = Array.isArray(targetRoles) ? targetRoles : [targetRoles];
      const invalidRoles = rolesArray.filter((r) => !validRoles.includes(r));
      if (invalidRoles.length > 0) {
        return res.status(400).json({
          error: `Invalid target role(s): ${invalidRoles.join(', ')}.`,
        });
      }
      announcement.targetRoles = rolesArray.length > 0 ? rolesArray : ['all'];
    }

    await announcement.save();
    await announcement.populate('author', 'name role profilePicture');
    if (announcement.course) {
      await announcement.populate('course', 'title slug');
    }

    logger.success(`Announcement updated: ${announcement._id} by ${req.user.email}`);

    return res.status(200).json({
      message: 'Announcement updated successfully.',
      announcement,
    });
  } catch (error) {
    logger.error(`updateAnnouncement error: ${error.message}`);
    return res.status(500).json({ error: 'Failed to update announcement.' });
  }
};

/**
 * DELETE /api/announcements/:id
 * Delete an announcement (Author or Admin)
 */
const deleteAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid announcement identifier.' });
    }

    const announcement = await Announcement.findById(id);
    if (!announcement) {
      return res.status(404).json({ error: 'Announcement not found.' });
    }

    // Authorization: Author or Admin
    const isAuthor = announcement.author.toString() === (req.user.id || req.user._id).toString();
    const isAdmin = req.user.role === 'admin';
    if (!isAuthor && !isAdmin) {
      return res.status(403).json({
        error: 'Forbidden: You do not have permission to delete this announcement.',
      });
    }

    await announcement.deleteOne();
    logger.success(`Announcement deleted: ${id} by ${req.user.email}`);

    return res.status(200).json({
      message: 'Announcement deleted successfully.',
      id,
    });
  } catch (error) {
    logger.error(`deleteAnnouncement error: ${error.message}`);
    return res.status(500).json({ error: 'Failed to delete announcement.' });
  }
};

/**
 * PATCH /api/announcements/:id/pin
 * Toggle or set pinned status for an announcement (Author or Admin)
 */
const togglePinAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid announcement identifier.' });
    }

    const announcement = await Announcement.findById(id);
    if (!announcement) {
      return res.status(404).json({ error: 'Announcement not found.' });
    }

    const isAuthor = announcement.author.toString() === (req.user.id || req.user._id).toString();
    const isAdmin = req.user.role === 'admin';
    if (!isAuthor && !isAdmin) {
      return res.status(403).json({
        error: 'Forbidden: You do not have permission to pin this announcement.',
      });
    }

    if (typeof req.body.isPinned === 'boolean') {
      announcement.isPinned = req.body.isPinned;
    } else {
      announcement.isPinned = !announcement.isPinned;
    }

    await announcement.save();
    await announcement.populate('author', 'name role profilePicture');

    return res.status(200).json({
      message: `Announcement ${announcement.isPinned ? 'pinned' : 'unpinned'} successfully.`,
      announcement,
    });
  } catch (error) {
    logger.error(`togglePinAnnouncement error: ${error.message}`);
    return res.status(500).json({ error: 'Failed to toggle announcement pinned status.' });
  }
};

module.exports = {
  createCourseAnnouncement,
  getCourseAnnouncements,
  createPlatformAnnouncement,
  getUserAnnouncements,
  updateAnnouncement,
  deleteAnnouncement,
  togglePinAnnouncement,
};

