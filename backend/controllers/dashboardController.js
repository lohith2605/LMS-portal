const mongoose = require('mongoose');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const Assignment = require('../models/Assignment');
const AssignmentSubmission = require('../models/AssignmentSubmission');
const { logger } = require('../utils/logger');

/**
 * Get Student Dashboard overview and enrolled courses
 * GET /api/dashboard/student
 */
const getStudentOverview = async (req, res) => {
  try {
    const studentId = req.user.id;
    let rawEnrollments = [];

    if (mongoose.Types.ObjectId.isValid(studentId)) {
      try {
        rawEnrollments = await Enrollment.find({
          student: studentId,
          status: { $in: ['active', 'completed'] },
        })
          .populate({
            path: 'course',
            select:
              'title slug summary thumbnail category level estimatedDuration instructor sections status',
            populate: {
              path: 'instructor',
              select: 'name email avatar',
            },
          })
          .sort({ lastAccessedAt: -1, enrolledAt: -1 })
          .lean();
      } catch (dbErr) {
        logger.warn(`Enrollment query fallback: ${dbErr.message}`);
        rawEnrollments = [];
      }
    }

    const activeEnrollments = (rawEnrollments || []).filter(
      (e) => e && e.course && e.course.status !== 'archived'
    );

    let completedCount = 0;
    let inProgressCount = 0;

    const enrolledCourses = activeEnrollments.map((e) => {
      const c = e.course;
      const totalLessons = (c.sections || []).reduce(
        (sum, s) => sum + (s.lessons ? s.lessons.length : 0),
        0
      );
      const completedLessonsCount = (e.completedLessons || []).length;
      const progressPercentage =
        totalLessons > 0 ? Math.min(100, Math.round((completedLessonsCount / totalLessons) * 100)) : 0;

      if (totalLessons > 0 && completedLessonsCount >= totalLessons) {
        completedCount++;
      } else if (completedLessonsCount > 0) {
        inProgressCount++;
      }

      return {
        id: e._id.toString(),
        enrolledAt: e.enrolledAt,
        status: e.status,
        progressPercentage,
        completedCount: completedLessonsCount,
        totalLessons,
        lastAccessedAt: e.lastAccessedAt,
        course: {
          _id: c._id.toString(),
          title: c.title,
          slug: c.slug,
          summary: c.summary,
          thumbnail: c.thumbnail,
          category: c.category,
          level: c.level,
          estimatedDuration: c.estimatedDuration,
          instructor: c.instructor
            ? {
                id: c.instructor._id.toString(),
                name: c.instructor.name,
                avatar: c.instructor.avatar || '',
              }
            : { id: '', name: 'Instructor' },
        },
      };
    });

    // Query real upcoming deadlines from published course assignments
    let upcomingDeadlines = [];
    let upcomingDeadlinesCount = 0;
    if (activeEnrollments.length > 0) {
      try {
        const courseIds = activeEnrollments.map((e) => e.course._id);
        const now = new Date();
        const assignments = await Assignment.find({
          course: { $in: courseIds },
          status: 'published',
          dueDate: { $gte: now },
        })
          .populate('course', 'title slug')
          .sort({ dueDate: 1 })
          .limit(5)
          .lean();

        if (assignments.length > 0) {
          const studentSubmissions = await AssignmentSubmission.find({
            assignment: { $in: assignments.map((a) => a._id) },
            student: studentId,
          }).select('assignment');

          const submittedAssignmentIds = new Set(
            studentSubmissions.map((s) => s.assignment.toString())
          );

          upcomingDeadlines = assignments
            .filter((a) => !submittedAssignmentIds.has(a._id.toString()))
            .map((a) => ({
              id: a._id.toString(),
              title: a.title,
              courseTitle: a.course?.title || '',
              dueDate: a.dueDate,
              maxMarks: a.maxMarks,
            }));
          upcomingDeadlinesCount = upcomingDeadlines.length;
        }
      } catch (err) {
        logger.warn(`Upcoming deadlines query fallback: ${err.message}`);
      }
    }

    return res.status(200).json({
      overview: {
        enrolledCount: activeEnrollments.length,
        inProgressCount,
        completedCount,
        upcomingDeadlinesCount,
      },
      enrolledCourses,
      upcomingDeadlines,
      recentActivity: [],
      announcements: [
        {
          id: 'ann-1',
          title: 'Welcome to the LearnSpace Learning Platform',
          content: 'Browse our curated catalog to begin your learning journey. Enrolled courses and interactive lessons appear directly on your dashboard.',
          tag: 'Platform Update',
          date: new Date().toISOString().split('T')[0],
        },
      ],
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error(`Student overview error: ${error.message}`);
    return res.status(500).json({
      error: 'Failed to retrieve student dashboard data.',
    });
  }
};

/**
 * Get Instructor Dashboard overview and teaching status
 * GET /api/dashboard/instructor
 */
const getInstructorOverview = async (req, res) => {
  try {
    const isApproved = req.user.accountStatus === 'active';
    const instructorId = req.user.id;

    let createdCoursesCount = 0;
    let publishedCoursesCount = 0;
    let pendingReviewsCount = 0;
    let authoredCourses = [];
    let countMap = {};
    let totalLearnersSum = 0;

    if (mongoose.Types.ObjectId.isValid(instructorId)) {
      try {
        const [
          createdCount,
          publishedCount,
          pendingCourseCount,
          coursesFound,
        ] = await Promise.all([
          Course.countDocuments({ instructor: instructorId }),
          Course.countDocuments({ instructor: instructorId, status: 'published' }),
          Course.countDocuments({ instructor: instructorId, status: 'pending_review' }),
          Course.find({ instructor: instructorId })
            .sort({ updatedAt: -1 })
            .limit(10)
            .lean(),
        ]);

        createdCoursesCount = createdCount;
        publishedCoursesCount = publishedCount;
        authoredCourses = coursesFound;

        const courseIds = authoredCourses.map((c) => c._id);
        const [learnerCounts, pendingSubmissionsCount] = await Promise.all([
          Enrollment.aggregate([
            { $match: { course: { $in: courseIds }, status: { $in: ['active', 'completed'] } } },
            { $group: { _id: '$course', totalLearners: { $sum: 1 } } },
          ]),
          AssignmentSubmission.countDocuments({
            course: { $in: courseIds },
            status: { $in: ['submitted', 'late'] },
            isGradePublished: false,
          }),
        ]);

        pendingReviewsCount = pendingSubmissionsCount + pendingCourseCount;

        learnerCounts.forEach((l) => {
          countMap[l._id.toString()] = l.totalLearners;
          totalLearnersSum += l.totalLearners;
        });
      } catch (dbErr) {
        logger.warn(`Instructor overview query fallback: ${dbErr.message}`);
      }
    }

    const courses = authoredCourses.map((c) => {
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
        rejectionReason: c.rejectionReason || '',
        totalSections: (c.sections || []).length,
        totalLessons,
        enrolledCount: countMap[c._id.toString()] || 0,
        updatedAt: c.updatedAt,
      };
    });

    return res.status(200).json({
      accountStatus: req.user.accountStatus,
      isApproved,
      overview: {
        createdCoursesCount,
        publishedCoursesCount,
        totalLearnersCount: totalLearnersSum,
        pendingReviewsCount,
      },
      courses,
      pendingSubmissions: [],
      announcements: [
        {
          id: 'ann-inst-1',
          title: 'Course Studio Authoring Active',
          content: 'You can now create, organize sections, add video or text lessons, and submit courses for administrative publication.',
          tag: 'Studio',
          date: new Date().toISOString().split('T')[0],
        },
      ],
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error(`Instructor overview error: ${error.message}`);
    return res.status(500).json({
      error: 'Failed to retrieve instructor dashboard data.',
    });
  }
};

module.exports = {
  getStudentOverview,
  getInstructorOverview,
};

