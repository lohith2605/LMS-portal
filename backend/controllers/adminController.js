const User = require('../models/User');
const Course = require('../models/Course');
const { sanitizeUser } = require('../utils/authUtils');
const { logger } = require('../utils/logger');

/**
 * Get platform overview metrics for Administrator console
 * GET /api/admin/overview
 */
const getOverview = async (req, res) => {
  try {
    const [
      totalUsers,
      totalStudents,
      totalInstructors,
      pendingInstructors,
      activeInstructors,
      suspendedUsers,
      publishedCourses,
      pendingCourses,
    ] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ role: 'student' }),
      User.countDocuments({ role: 'instructor' }),
      User.countDocuments({ role: 'instructor', accountStatus: 'pending' }),
      User.countDocuments({ role: 'instructor', accountStatus: 'active' }),
      User.countDocuments({ accountStatus: 'suspended' }),
      Course.countDocuments({ status: 'published' }).catch(() => 0),
      Course.countDocuments({ status: 'pending_review' }).catch(() => 0),
    ]);

    return res.status(200).json({
      metrics: {
        totalUsers,
        totalStudents,
        totalInstructors,
        pendingInstructors,
        activeInstructors,
        suspendedUsers,
        publishedCourses,
        pendingCourses,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error(`Admin overview error: ${error.message}`);
    return res.status(500).json({
      error: 'Failed to retrieve administrative platform overview.',
    });
  }
};

/**
 * Get list of pending instructor applications
 * GET /api/admin/instructors/pending
 */
const getPendingInstructors = async (req, res) => {
  try {
    const pendingInstructors = await User.find({
      role: 'instructor',
      accountStatus: 'pending',
    })
      .select('name email role accountStatus createdAt')
      .sort({ createdAt: -1 })
      .lean();

    const formatted = pendingInstructors.map((user) => ({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      accountStatus: user.accountStatus,
      createdAt: user.createdAt,
    }));

    return res.status(200).json({
      pendingInstructors: formatted,
      count: formatted.length,
    });
  } catch (error) {
    logger.error(`Get pending instructors error: ${error.message}`);
    return res.status(500).json({
      error: 'Failed to retrieve pending instructor applications.',
    });
  }
};

/**
 * Approve a pending instructor application
 * PATCH /api/admin/instructors/:id/approve
 */
const approveInstructor = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        error: 'Instructor account not found.',
      });
    }

    if (user.role !== 'instructor') {
      return res.status(400).json({
        error: 'Target user is not an instructor account.',
      });
    }

    user.accountStatus = 'active';
    await user.save();

    logger.success(`Instructor approved by ${req.user.email}: ${user.email} (ID: ${user._id})`);

    return res.status(200).json({
      message: `Instructor application for ${user.name} has been approved.`,
      user: sanitizeUser(user),
    });
  } catch (error) {
    logger.error(`Approve instructor error: ${error.message}`);
    return res.status(500).json({
      error: 'Failed to approve instructor application.',
    });
  }
};

/**
 * Reject a pending instructor application (marks as suspended)
 * PATCH /api/admin/instructors/:id/reject
 */
const rejectInstructor = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        error: 'Instructor account not found.',
      });
    }

    user.accountStatus = 'suspended';
    await user.save();

    logger.warn(`Instructor application rejected by ${req.user.email}: ${user.email} (ID: ${user._id})`);

    return res.status(200).json({
      message: `Instructor application for ${user.name} has been rejected.`,
      user: sanitizeUser(user),
    });
  } catch (error) {
    logger.error(`Reject instructor error: ${error.message}`);
    return res.status(500).json({
      error: 'Failed to reject instructor application.',
    });
  }
};

/**
 * List platform users with search, role filtering, and pagination
 * GET /api/admin/users
 */
const getUsers = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    const query = {};

    // Filter by role
    if (req.query.role && ['student', 'instructor', 'admin'].includes(req.query.role.toLowerCase())) {
      query.role = req.query.role.toLowerCase();
    }

    // Filter by accountStatus
    if (req.query.status && ['active', 'pending', 'suspended'].includes(req.query.status.toLowerCase())) {
      query.accountStatus = req.query.status.toLowerCase();
    }

    // Search query on name or email
    if (req.query.search && typeof req.query.search === 'string') {
      const escapedSearch = req.query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (escapedSearch) {
        query.$or = [
          { name: { $regex: escapedSearch, $options: 'i' } },
          { email: { $regex: escapedSearch, $options: 'i' } },
        ];
      }
    }

    const [total, rawUsers] = await Promise.all([
      User.countDocuments(query),
      User.find(query)
        .select('name email role accountStatus emailVerified createdAt lastLoginAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    const users = rawUsers.map((u) => ({
      id: u._id.toString(),
      name: u.name,
      email: u.email,
      role: u.role,
      accountStatus: u.accountStatus,
      emailVerified: Boolean(u.emailVerified),
      createdAt: u.createdAt,
      lastLoginAt: u.lastLoginAt,
    }));

    return res.status(200).json({
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    logger.error(`Get users error: ${error.message}`);
    return res.status(500).json({
      error: 'Failed to retrieve platform users.',
    });
  }
};

/**
 * Get list of courses awaiting administrative review
 * GET /api/admin/courses/pending
 */
const getPendingCourses = async (req, res) => {
  try {
    const pendingCourses = await Course.find({ status: 'pending_review' })
      .populate('instructor', 'name email avatar')
      .sort({ updatedAt: -1 })
      .lean();

    const formatted = pendingCourses.map((c) => {
      const totalLessons = (c.sections || []).reduce(
        (sum, s) => sum + (s.lessons ? s.lessons.length : 0),
        0
      );

      return {
        _id: c._id.toString(),
        title: c.title,
        slug: c.slug,
        summary: c.summary,
        category: c.category,
        level: c.level,
        thumbnail: c.thumbnail,
        status: c.status,
        totalSections: (c.sections || []).length,
        totalLessons,
        instructor: c.instructor
          ? {
              id: c.instructor._id.toString(),
              name: c.instructor.name,
              email: c.instructor.email,
            }
          : { id: '', name: 'Instructor' },
        updatedAt: c.updatedAt,
        createdAt: c.createdAt,
      };
    });

    return res.status(200).json({
      pendingCourses: formatted,
      count: formatted.length,
    });
  } catch (error) {
    logger.error(`Get pending courses error: ${error.message}`);
    return res.status(500).json({
      error: 'Failed to retrieve pending courses.',
    });
  }
};

/**
 * Approve a pending course for publication
 * PATCH /api/admin/courses/:id/approve
 */
const approveCourse = async (req, res) => {
  try {
    const { id } = req.params;

    const course = await Course.findById(id);
    if (!course) {
      return res.status(404).json({ error: 'Course not found.' });
    }

    course.status = 'published';
    course.publishedAt = new Date();
    course.rejectionReason = '';
    await course.save();

    logger.success(`Course approved by ${req.user.email}: ${course.title} (${course._id})`);

    return res.status(200).json({
      message: `Course "${course.title}" has been approved and published to the catalog.`,
      course,
    });
  } catch (error) {
    logger.error(`Approve course error: ${error.message}`);
    return res.status(500).json({
      error: 'Failed to approve course.',
    });
  }
};

/**
 * Reject a pending course with feedback reason
 * PATCH /api/admin/courses/:id/reject
 */
const rejectCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;

    const course = await Course.findById(id);
    if (!course) {
      return res.status(404).json({ error: 'Course not found.' });
    }

    course.status = 'rejected';
    course.rejectionReason =
      rejectionReason && rejectionReason.trim()
        ? rejectionReason.trim()
        : 'Course did not meet platform quality standards. Please revise your curriculum.';
    await course.save();

    logger.warn(`Course rejected by ${req.user.email}: ${course.title} (${course._id})`);

    return res.status(200).json({
      message: `Course "${course.title}" has been rejected. Feedback has been sent to the instructor.`,
      course,
    });
  } catch (error) {
    logger.error(`Reject course error: ${error.message}`);
    return res.status(500).json({
      error: 'Failed to reject course.',
    });
  }
};

module.exports = {
  getOverview,
  getPendingInstructors,
  approveInstructor,
  rejectInstructor,
  getUsers,
  getPendingCourses,
  approveCourse,
  rejectCourse,
};

