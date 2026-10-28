const mongoose = require('mongoose');
const Discussion = require('../models/Discussion');
const DiscussionReply = require('../models/DiscussionReply');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const { logger } = require('../utils/logger');
const notificationService = require('../services/notificationService');

/**
 * Helper: Extract string user ID safely regardless of whether user object has .id or ._id
 */
const getUserId = (user) => {
  if (!user) return '';
  return (user.id || user._id || '').toString();
};

/**
 * Helper: Verify authenticated user has permission to view or participate in a course's discussions.
 * - Admin: Full access + moderation
 * - Course Instructor: Full access + moderation
 * - Student: Enrolled in course -> Full access, no moderation
 */
const verifyCourseAccess = async (courseIdOrSlug, user) => {
  if (!courseIdOrSlug) {
    return { error: 'Course identifier is required.', status: 400 };
  }

  let query;
  if (mongoose.Types.ObjectId.isValid(courseIdOrSlug)) {
    query = { _id: courseIdOrSlug };
  } else {
    query = { slug: String(courseIdOrSlug).toLowerCase().trim() };
  }

  const course = await Course.findOne(query).select('title slug instructor status');
  if (!course) {
    return { error: 'Course not found.', status: 404 };
  }

  if (course.status === 'archived') {
    return { error: 'This course has been archived. Discussions are read-only or unavailable.', status: 400 };
  }

  const userIdStr = getUserId(user);
  const userRole = user.role ? user.role.toLowerCase() : 'student';

  // 1. System Administrator
  if (userRole === 'admin') {
    return { course, isInstructor: false, isAdmin: true, canModerate: true };
  }

  // 2. Course Instructor (Owner)
  const courseInstructorId = course.instructor ? course.instructor.toString() : '';
  if (courseInstructorId && courseInstructorId === userIdStr) {
    return { course, isInstructor: true, isAdmin: false, canModerate: true };
  }

  // 3. Student: Check active or completed enrollment
  const enrollment = await Enrollment.findOne({
    student: userIdStr,
    course: course._id,
    status: { $in: ['active', 'completed'] },
  });

  if (!enrollment) {
    return {
      error: 'You must be enrolled in this course to view or participate in discussions.',
      status: 403,
    };
  }

  return { course, isInstructor: false, isAdmin: false, canModerate: false, isEnrolled: true };
};

/**
 * List discussions for a course with search, filtering, and pagination
 * GET /api/discussions/course/:idOrSlug
 * GET /api/courses/:idOrSlug/discussions
 */
const getCourseDiscussions = async (req, res) => {
  try {
    const courseIdOrSlug = req.params.idOrSlug || req.params.courseId;
    const access = await verifyCourseAccess(courseIdOrSlug, req.user);
    if (access.error) {
      return res.status(access.status).json({ error: access.error });
    }

    const { course, canModerate } = access;

    // Parse query params safely
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    const { type, status, sort, search } = req.query;

    const query = {
      course: course._id,
      isDeleted: false,
    };

    // Filter by type
    if (type && ['question', 'discussion'].includes(type.toLowerCase())) {
      query.type = type.toLowerCase();
    }

    // Filter by answered status (for questions)
    if (status) {
      const s = status.toLowerCase();
      if (s === 'answered') {
        query.type = 'question';
        query.isAnswered = true;
      } else if (s === 'unanswered') {
        query.type = 'question';
        query.isAnswered = false;
      }
    }

    // Search query on title or body
    if (search && typeof search === 'string' && search.trim()) {
      const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { title: { $regex: escaped, $options: 'i' } },
        { body: { $regex: escaped, $options: 'i' } },
      ];
    }

    // Determine sort order
    let sortOptions = { isPinned: -1 };
    if (sort === 'oldest') {
      sortOptions.createdAt = 1;
    } else if (sort === 'most_active') {
      sortOptions.replyCount = -1;
      sortOptions.lastActivityAt = -1;
    } else {
      // Default: newest activity
      sortOptions.lastActivityAt = -1;
      sortOptions.createdAt = -1;
    }

    const [total, discussions] = await Promise.all([
      Discussion.countDocuments(query),
      Discussion.find(query)
        .populate('author', 'name email role avatar')
        .populate({
          path: 'acceptedAnswer',
          select: 'author body createdAt',
          populate: { path: 'author', select: 'name role avatar' },
        })
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    const formatted = discussions.map((d) => {
      const authorId = d.author ? (d.author._id || d.author).toString() : '';
      const isAuthor = authorId === getUserId(req.user);
      return {
        ...d,
        canEdit: isAuthor && !d.isLocked,
        canDelete: isAuthor || canModerate,
      };
    });

    return res.status(200).json({
      course: {
        _id: course._id.toString(),
        title: course.title,
        slug: course.slug,
      },
      discussions: formatted,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
      permissions: {
        canModerate,
      },
    });
  } catch (error) {
    logger.error(`getCourseDiscussions error: ${error.message}`);
    return res.status(500).json({ error: 'Failed to retrieve course discussions.' });
  }
};

/**
 * Create a new discussion or question in a course
 * POST /api/discussions/course/:idOrSlug
 * POST /api/courses/:idOrSlug/discussions
 */
const createDiscussion = async (req, res) => {
  try {
    const courseIdOrSlug = req.params.idOrSlug || req.params.courseId;
    const access = await verifyCourseAccess(courseIdOrSlug, req.user);
    if (access.error) {
      return res.status(access.status).json({ error: access.error });
    }

    const { course } = access;
    let { title, body, type } = req.body;

    // Validate title
    if (!title || typeof title !== 'string' || title.trim().length < 5) {
      return res.status(400).json({
        error: 'Discussion title is required and must be at least 5 characters long.',
      });
    }
    if (title.trim().length > 200) {
      return res.status(400).json({
        error: 'Discussion title cannot exceed 200 characters.',
      });
    }

    // Validate body
    if (!body || typeof body !== 'string' || body.trim().length < 10) {
      return res.status(400).json({
        error: 'Discussion content is required and must be at least 10 characters long.',
      });
    }
    if (body.trim().length > 10000) {
      return res.status(400).json({
        error: 'Discussion content cannot exceed 10000 characters.',
      });
    }

    // Validate type
    if (type !== undefined && !['question', 'discussion'].includes(String(type).toLowerCase())) {
      return res.status(400).json({
        error: 'Invalid discussion type. Must be either "question" or "discussion".',
      });
    }
    const normalizedType = type && String(type).toLowerCase() === 'discussion' ? 'discussion' : 'question';

    const discussion = await Discussion.create({
      course: course._id,
      author: getUserId(req.user),
      title: title.trim(),
      body: body.trim(),
      type: normalizedType,
      replyCount: 0,
      lastActivityAt: new Date(),
    });

    const populated = await Discussion.findById(discussion._id)
      .populate('author', 'name email role avatar')
      .lean();

    logger.success(
      `Discussion created: "${discussion.title}" (${discussion.type}) in course ${course.title} by ${req.user.email}`
    );

    return res.status(201).json({
      message: 'Discussion created successfully.',
      discussion: populated,
    });
  } catch (error) {
    logger.error(`createDiscussion error: ${error.message}`);
    return res.status(500).json({ error: 'Failed to create discussion.' });
  }
};

/**
 * Retrieve a single discussion along with paginated replies
 * GET /api/discussions/:id
 */
const getDiscussionById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid discussion ID format.' });
    }

    const discussion = await Discussion.findById(id)
      .populate('author', 'name email role avatar')
      .populate('pinnedBy', 'name role')
      .populate('lockedBy', 'name role')
      .lean();

    if (!discussion || discussion.isDeleted) {
      return res.status(404).json({ error: 'Discussion not found or has been deleted.' });
    }

    const access = await verifyCourseAccess(discussion.course, req.user);
    if (access.error) {
      return res.status(access.status).json({ error: access.error });
    }

    const { canModerate } = access;
    const authorId = discussion.author ? (discussion.author._id || discussion.author).toString() : '';
    const isAuthor = authorId === getUserId(req.user);

    // Parse reply pagination
    const replyPage = Math.max(1, parseInt(req.query.page, 10) || 1);
    const replyLimit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (replyPage - 1) * replyLimit;

    const replyQuery = {
      discussion: discussion._id,
      isDeleted: false,
    };

    const [totalReplies, replies] = await Promise.all([
      DiscussionReply.countDocuments(replyQuery),
      DiscussionReply.find(replyQuery)
        .populate('author', 'name email role avatar')
        .sort({ isAccepted: -1, createdAt: 1 })
        .skip(skip)
        .limit(replyLimit)
        .lean(),
    ]);

    const formattedReplies = replies.map((r) => {
      const replyAuthorId = r.author ? (r.author._id || r.author).toString() : '';
      const isReplyAuthor = replyAuthorId === getUserId(req.user);
      return {
        ...r,
        canEdit: isReplyAuthor && !discussion.isLocked,
        canDelete: isReplyAuthor || canModerate,
        canAccept: (isAuthor || canModerate) && discussion.type === 'question',
      };
    });

    return res.status(200).json({
      discussion: {
        ...discussion,
        canEdit: isAuthor && !discussion.isLocked,
        canDelete: isAuthor || canModerate,
        canModerate,
      },
      replies: formattedReplies,
      pagination: {
        total: totalReplies,
        page: replyPage,
        limit: replyLimit,
        totalPages: Math.ceil(totalReplies / replyLimit) || 1,
      },
      permissions: {
        canModerate,
        canReply: !discussion.isLocked,
      },
    });
  } catch (error) {
    logger.error(`getDiscussionById error: ${error.message}`);
    return res.status(500).json({ error: 'Failed to retrieve discussion details.' });
  }
};

/**
 * Edit an existing discussion (Author only)
 * PATCH /api/discussions/:id
 */
const updateDiscussion = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid discussion ID format.' });
    }

    const discussion = await Discussion.findById(id);
    if (!discussion || discussion.isDeleted) {
      return res.status(404).json({ error: 'Discussion not found or has been deleted.' });
    }

    const access = await verifyCourseAccess(discussion.course, req.user);
    if (access.error) {
      return res.status(access.status).json({ error: access.error });
    }

    // Only the original author can edit content
    const authorId = (discussion.author._id || discussion.author).toString();
    const isAuthor = authorId === getUserId(req.user);
    if (!isAuthor) {
      return res.status(403).json({ error: 'Only the author can edit this discussion.' });
    }

    if (discussion.isLocked) {
      return res.status(400).json({
        error: 'This discussion has been locked by a moderator and cannot be edited.',
      });
    }

    const { title, body, type } = req.body;

    if (title !== undefined) {
      if (typeof title !== 'string' || title.trim().length < 5) {
        return res.status(400).json({
          error: 'Discussion title must be at least 5 characters long.',
        });
      }
      if (title.trim().length > 200) {
        return res.status(400).json({
          error: 'Discussion title cannot exceed 200 characters.',
        });
      }
      discussion.title = title.trim();
    }

    if (body !== undefined) {
      if (typeof body !== 'string' || body.trim().length < 10) {
        return res.status(400).json({
          error: 'Discussion content must be at least 10 characters long.',
        });
      }
      if (body.trim().length > 10000) {
        return res.status(400).json({
          error: 'Discussion content cannot exceed 10000 characters.',
        });
      }
      discussion.body = body.trim();
    }

    if (type !== undefined) {
      const lowerType = String(type).toLowerCase();
      if (!['question', 'discussion'].includes(lowerType)) {
        return res.status(400).json({
          error: 'Invalid discussion type. Must be either "question" or "discussion".',
        });
      }
      discussion.type = lowerType;
      // If changed to discussion, remove any accepted answers
      if (lowerType === 'discussion' && discussion.isAnswered) {
        discussion.isAnswered = false;
        discussion.acceptedAnswer = null;
        discussion.acceptedAt = null;
        discussion.acceptedBy = null;
        await DiscussionReply.updateMany(
          { discussion: discussion._id, isAccepted: true },
          { $set: { isAccepted: false } }
        );
      }
    }

    await discussion.save();

    const populated = await Discussion.findById(discussion._id)
      .populate('author', 'name email role avatar')
      .lean();

    return res.status(200).json({
      message: 'Discussion updated successfully.',
      discussion: populated,
    });
  } catch (error) {
    logger.error(`updateDiscussion error: ${error.message}`);
    return res.status(500).json({ error: 'Failed to update discussion.' });
  }
};

/**
 * Soft-delete a discussion (Author or Moderator)
 * DELETE /api/discussions/:id
 */
const deleteDiscussion = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid discussion ID format.' });
    }

    const discussion = await Discussion.findById(id);
    if (!discussion || discussion.isDeleted) {
      return res.status(404).json({ error: 'Discussion not found or already deleted.' });
    }

    const access = await verifyCourseAccess(discussion.course, req.user);
    if (access.error) {
      return res.status(access.status).json({ error: access.error });
    }

    const { canModerate } = access;
    const authorId = (discussion.author._id || discussion.author).toString();
    const isAuthor = authorId === getUserId(req.user);

    if (!isAuthor && !canModerate) {
      return res.status(403).json({ error: 'You are not authorized to delete this discussion.' });
    }

    discussion.isDeleted = true;
    discussion.deletedAt = new Date();
    discussion.deletedBy = getUserId(req.user);

    // Reset accepted answer state if present
    discussion.acceptedAnswer = null;
    discussion.isAnswered = false;

    await discussion.save();

    // Cascading soft-delete associated replies
    await DiscussionReply.updateMany(
      { discussion: discussion._id, isDeleted: false },
      {
        $set: {
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: getUserId(req.user),
        },
      }
    );

    logger.info(`Discussion "${discussion.title}" (${discussion._id}) soft-deleted by ${req.user.email}`);

    return res.status(200).json({
      message: 'Discussion deleted successfully.',
    });
  } catch (error) {
    logger.error(`deleteDiscussion error: ${error.message}`);
    return res.status(500).json({ error: 'Failed to delete discussion.' });
  }
};

/**
 * Create a reply to an active discussion
 * POST /api/discussions/:id/replies
 */
const createReply = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid discussion ID format.' });
    }

    const discussion = await Discussion.findById(id);
    if (!discussion || discussion.isDeleted) {
      return res.status(404).json({ error: 'Discussion not found or has been deleted.' });
    }

    if (discussion.isLocked) {
      return res.status(400).json({
        error: 'This discussion is locked. New replies are disabled.',
      });
    }

    const access = await verifyCourseAccess(discussion.course, req.user);
    if (access.error) {
      return res.status(access.status).json({ error: access.error });
    }

    const { body } = req.body;
    if (!body || typeof body !== 'string' || body.trim().length < 2) {
      return res.status(400).json({
        error: 'Reply content is required and must be at least 2 characters long.',
      });
    }
    if (body.trim().length > 5000) {
      return res.status(400).json({
        error: 'Reply content cannot exceed 5000 characters.',
      });
    }

    const reply = await DiscussionReply.create({
      discussion: discussion._id,
      course: discussion.course,
      author: getUserId(req.user),
      body: body.trim(),
    });

    // Update parent discussion stats atomically
    discussion.replyCount = await DiscussionReply.countDocuments({
      discussion: discussion._id,
      isDeleted: false,
    });
    discussion.lastActivityAt = new Date();
    await discussion.save();

    // Real-time notification: notify discussion author if not self-reply
    try {
      const discussionAuthorId = (discussion.author._id || discussion.author).toString();
      const replierId = getUserId(req.user);
      if (discussionAuthorId && discussionAuthorId !== replierId) {
        await notificationService.createNotification({
          recipient: discussionAuthorId,
          type: 'discussion_reply',
          title: 'New Reply to Your Discussion',
          message: `${req.user.name || 'Someone'} replied to your discussion "${discussion.title}".`,
          link: `/courses/${discussion.course}/discussions/${discussion._id}`,
          metadata: {
            discussionId: discussion._id,
            courseId: discussion.course,
            replyId: reply._id,
          },
        });
      }
    } catch (notifErr) {
      logger.warn(`Failed to dispatch discussion reply notification: ${notifErr.message}`);
    }

    const populatedReply = await DiscussionReply.findById(reply._id)
      .populate('author', 'name email role avatar')
      .lean();

    return res.status(201).json({
      message: 'Reply posted successfully.',
      reply: populatedReply,
    });
  } catch (error) {
    logger.error(`createReply error: ${error.message}`);
    return res.status(500).json({ error: 'Failed to post reply.' });
  }
};

/**
 * Edit an existing reply (Author only)
 * PATCH /api/discussions/:id/replies/:replyId
 */
const updateReply = async (req, res) => {
  try {
    const { id, replyId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(replyId)) {
      return res.status(400).json({ error: 'Invalid ID format.' });
    }

    const [discussion, reply] = await Promise.all([
      Discussion.findById(id),
      DiscussionReply.findById(replyId),
    ]);

    if (!discussion || discussion.isDeleted) {
      return res.status(404).json({ error: 'Discussion not found or has been deleted.' });
    }

    if (!reply || reply.isDeleted || reply.discussion.toString() !== discussion._id.toString()) {
      return res.status(404).json({ error: 'Reply not found.' });
    }

    if (discussion.isLocked) {
      return res.status(400).json({
        error: 'This discussion is locked. Content cannot be edited.',
      });
    }

    const access = await verifyCourseAccess(discussion.course, req.user);
    if (access.error) {
      return res.status(access.status).json({ error: access.error });
    }

    // Only the reply author can edit their own reply
    const replyAuthorId = (reply.author._id || reply.author).toString();
    const isAuthor = replyAuthorId === getUserId(req.user);
    if (!isAuthor) {
      return res.status(403).json({ error: 'Only the author can edit this reply.' });
    }

    const { body } = req.body;
    if (!body || typeof body !== 'string' || body.trim().length < 2) {
      return res.status(400).json({
        error: 'Reply content must be at least 2 characters long.',
      });
    }
    if (body.trim().length > 5000) {
      return res.status(400).json({
        error: 'Reply content cannot exceed 5000 characters.',
      });
    }

    reply.body = body.trim();
    await reply.save();

    const populated = await DiscussionReply.findById(reply._id)
      .populate('author', 'name email role avatar')
      .lean();

    return res.status(200).json({
      message: 'Reply updated successfully.',
      reply: populated,
    });
  } catch (error) {
    logger.error(`updateReply error: ${error.message}`);
    return res.status(500).json({ error: 'Failed to update reply.' });
  }
};

/**
 * Soft-delete a reply (Author or Moderator)
 * DELETE /api/discussions/:id/replies/:replyId
 */
const deleteReply = async (req, res) => {
  try {
    const { id, replyId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(replyId)) {
      return res.status(400).json({ error: 'Invalid ID format.' });
    }

    const [discussion, reply] = await Promise.all([
      Discussion.findById(id),
      DiscussionReply.findById(replyId),
    ]);

    if (!discussion || discussion.isDeleted) {
      return res.status(404).json({ error: 'Discussion not found or has been deleted.' });
    }

    if (!reply || reply.isDeleted || reply.discussion.toString() !== discussion._id.toString()) {
      return res.status(404).json({ error: 'Reply not found or already deleted.' });
    }

    const access = await verifyCourseAccess(discussion.course, req.user);
    if (access.error) {
      return res.status(access.status).json({ error: access.error });
    }

    const { canModerate } = access;
    const replyAuthorId = (reply.author._id || reply.author).toString();
    const isAuthor = replyAuthorId === getUserId(req.user);

    if (!isAuthor && !canModerate) {
      return res.status(403).json({ error: 'You are not authorized to delete this reply.' });
    }

    reply.isDeleted = true;
    reply.deletedAt = new Date();
    reply.deletedBy = getUserId(req.user);

    // If this reply was accepted, remove accepted state from discussion atomically
    const wasAccepted = reply.isAccepted || (discussion.acceptedAnswer && discussion.acceptedAnswer.toString() === reply._id.toString());
    if (wasAccepted) {
      reply.isAccepted = false;
      discussion.acceptedAnswer = null;
      discussion.isAnswered = false;
      discussion.acceptedAt = null;
      discussion.acceptedBy = null;
    }

    await reply.save();

    // Recount active reply count safely
    discussion.replyCount = await DiscussionReply.countDocuments({
      discussion: discussion._id,
      isDeleted: false,
    });
    await discussion.save();

    return res.status(200).json({
      message: 'Reply deleted successfully.',
    });
  } catch (error) {
    logger.error(`deleteReply error: ${error.message}`);
    return res.status(500).json({ error: 'Failed to delete reply.' });
  }
};

/**
 * Toggle accepted answer state for questions
 * PATCH /api/discussions/:id/replies/:replyId/accept
 */
const toggleAcceptedAnswer = async (req, res) => {
  try {
    const { id, replyId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(replyId)) {
      return res.status(400).json({ error: 'Invalid ID format.' });
    }

    const [discussion, reply] = await Promise.all([
      Discussion.findById(id),
      DiscussionReply.findById(replyId),
    ]);

    if (!discussion || discussion.isDeleted) {
      return res.status(404).json({ error: 'Discussion not found or has been deleted.' });
    }

    if (discussion.type !== 'question') {
      return res.status(400).json({
        error: 'Accepted answers can only be designated for question discussions.',
      });
    }

    if (!reply || reply.isDeleted || reply.discussion.toString() !== discussion._id.toString()) {
      return res.status(400).json({
        error: 'Reply does not belong to this question discussion.',
      });
    }

    const access = await verifyCourseAccess(discussion.course, req.user);
    if (access.error) {
      return res.status(access.status).json({ error: access.error });
    }

    const { canModerate } = access;
    const authorId = (discussion.author._id || discussion.author).toString();
    const isQuestionAuthor = authorId === getUserId(req.user);

    // Only the question author or course instructor / admin can accept an answer
    if (!isQuestionAuthor && !canModerate) {
      return res.status(403).json({
        error: 'Only the question author or course instructor can accept an answer.',
      });
    }

    if (discussion.isLocked && !canModerate) {
      return res.status(400).json({
        error: 'This discussion is locked. Accepted answers cannot be changed.',
      });
    }

    // Toggle logic: If already accepted, unaccept it
    if (reply.isAccepted) {
      reply.isAccepted = false;
      discussion.acceptedAnswer = null;
      discussion.isAnswered = false;
      discussion.acceptedAt = null;
      discussion.acceptedBy = null;

      await Promise.all([reply.save(), discussion.save()]);

      return res.status(200).json({
        message: 'Accepted answer designation removed.',
        isAccepted: false,
      });
    }

    // Otherwise, clear any previously accepted answer on this discussion first (Concurrency-safe single accepted answer)
    await DiscussionReply.updateMany(
      { discussion: discussion._id, isAccepted: true },
      { $set: { isAccepted: false } }
    );

    reply.isAccepted = true;
    discussion.acceptedAnswer = reply._id;
    discussion.isAnswered = true;
    discussion.acceptedAt = new Date();
    discussion.acceptedBy = getUserId(req.user);

    await Promise.all([reply.save(), discussion.save()]);

    // Real-time notification: notify reply author if not self-accept
    try {
      const replyAuthorId = (reply.author._id || reply.author).toString();
      const currentUserId = getUserId(req.user);
      if (replyAuthorId && replyAuthorId !== currentUserId) {
        await notificationService.createNotification({
          recipient: replyAuthorId,
          type: 'reply_accepted',
          title: 'Your Answer Was Accepted!',
          message: `Your answer on "${discussion.title}" was marked as the accepted solution.`,
          link: `/courses/${discussion.course}/discussions/${discussion._id}`,
          metadata: {
            discussionId: discussion._id,
            courseId: discussion.course,
            replyId: reply._id,
          },
        });
      }
    } catch (notifErr) {
      logger.warn(`Failed to dispatch accepted answer notification: ${notifErr.message}`);
    }

    logger.success(
      `Answer accepted for question "${discussion.title}" (${discussion._id}) by ${req.user.email}`
    );

    return res.status(200).json({
      message: 'Answer marked as accepted.',
      isAccepted: true,
      acceptedAnswerId: reply._id.toString(),
    });
  } catch (error) {
    logger.error(`toggleAcceptedAnswer error: ${error.message}`);
    return res.status(500).json({ error: 'Failed to update accepted answer status.' });
  }
};

/**
 * Toggle pin status for a discussion (Instructor or Admin only)
 * PATCH /api/discussions/:id/pin
 */
const togglePinDiscussion = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid discussion ID format.' });
    }

    const discussion = await Discussion.findById(id);
    if (!discussion || discussion.isDeleted) {
      return res.status(404).json({ error: 'Discussion not found or has been deleted.' });
    }

    const access = await verifyCourseAccess(discussion.course, req.user);
    if (access.error) {
      return res.status(access.status).json({ error: access.error });
    }

    if (!access.canModerate) {
      return res.status(403).json({
        error: 'Only course instructors or administrators can pin discussions.',
      });
    }

    discussion.isPinned = !discussion.isPinned;
    if (discussion.isPinned) {
      discussion.pinnedAt = new Date();
      discussion.pinnedBy = getUserId(req.user);
    } else {
      discussion.pinnedAt = null;
      discussion.pinnedBy = null;
    }

    await discussion.save();

    logger.info(`Discussion "${discussion.title}" pin status toggled to ${discussion.isPinned}`);

    return res.status(200).json({
      message: discussion.isPinned ? 'Discussion pinned to top.' : 'Discussion unpinned.',
      isPinned: discussion.isPinned,
    });
  } catch (error) {
    logger.error(`togglePinDiscussion error: ${error.message}`);
    return res.status(500).json({ error: 'Failed to toggle pin status.' });
  }
};

/**
 * Toggle lock status for a discussion (Instructor or Admin only)
 * PATCH /api/discussions/:id/lock
 */
const toggleLockDiscussion = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid discussion ID format.' });
    }

    const discussion = await Discussion.findById(id);
    if (!discussion || discussion.isDeleted) {
      return res.status(404).json({ error: 'Discussion not found or has been deleted.' });
    }

    const access = await verifyCourseAccess(discussion.course, req.user);
    if (access.error) {
      return res.status(access.status).json({ error: access.error });
    }

    if (!access.canModerate) {
      return res.status(403).json({
        error: 'Only course instructors or administrators can lock discussions.',
      });
    }

    discussion.isLocked = !discussion.isLocked;
    if (discussion.isLocked) {
      discussion.lockedAt = new Date();
      discussion.lockedBy = getUserId(req.user);
    } else {
      discussion.lockedAt = null;
      discussion.lockedBy = null;
    }

    await discussion.save();

    logger.info(`Discussion "${discussion.title}" lock status toggled to ${discussion.isLocked}`);

    return res.status(200).json({
      message: discussion.isLocked ? 'Discussion locked.' : 'Discussion unlocked.',
      isLocked: discussion.isLocked,
    });
  } catch (error) {
    logger.error(`toggleLockDiscussion error: ${error.message}`);
    return res.status(500).json({ error: 'Failed to toggle lock status.' });
  }
};

module.exports = {
  verifyCourseAccess,
  getCourseDiscussions,
  createDiscussion,
  getDiscussionById,
  updateDiscussion,
  deleteDiscussion,
  createReply,
  updateReply,
  deleteReply,
  toggleAcceptedAnswer,
  togglePinDiscussion,
  toggleLockDiscussion,
};

