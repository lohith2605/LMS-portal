const mongoose = require('mongoose');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const Assignment = require('../models/Assignment');
const AssignmentSubmission = require('../models/AssignmentSubmission');
const Certificate = require('../models/Certificate');
const { getPublishedLessons } = require('../utils/courseHelper');
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
    let notStartedCount = 0;

    const enrolledCourses = activeEnrollments.map((e) => {
      const c = e.course;
      const validLessons = getPublishedLessons(c);
      const totalLessons = validLessons.length;
      const validLessonIds = new Set(validLessons.map((l) => (l._id ? l._id.toString() : '')));
      const completedLessonsList = (e.completedLessons || []).filter((id) =>
        validLessonIds.has(id.toString())
      );
      const completedLessonsCount = completedLessonsList.length;
      const progressPercentage =
        totalLessons > 0 ? Math.min(100, Math.round((completedLessonsCount / totalLessons) * 100)) : 0;

      if (totalLessons > 0 && completedLessonsCount >= totalLessons) {
        completedCount++;
      } else if (completedLessonsCount > 0) {
        inProgressCount++;
      } else {
        notStartedCount++;
      }

      const completedSet = new Set(completedLessonsList.map((id) => id.toString()));
      const nextLesson = validLessons.find((l) => !completedSet.has(l._id ? l._id.toString() : ''));

      return {
        id: e._id.toString(),
        enrolledAt: e.enrolledAt,
        status: e.status,
        progressPercentage,
        completedCount: completedLessonsCount,
        totalLessons,
        lastAccessedAt: e.lastAccessedAt,
        certificateIssued: Boolean(e.certificateIssued),
        certificateId: e.certificateId || null,
        firstLessonTitle: validLessons[0]?.title || null,
        nextLessonTitle: nextLesson?.title || null,
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

    // 3a. Resolve resumeLearning: most recently accessed NON-completed enrollment
    let resumeLearning = null;
    const nonCompletedEnrollment = activeEnrollments.find((e) => {
      const c = e.course;
      const validLessons = getPublishedLessons(c);
      const totalLessons = validLessons.length;
      const validLessonIds = new Set(validLessons.map((l) => (l._id ? l._id.toString() : '')));
      const completedCount = (e.completedLessons || []).filter((id) =>
        validLessonIds.has(id.toString())
      ).length;
      const isCompleted =
        e.status === 'completed' ||
        Boolean(e.isCompleted) ||
        (totalLessons > 0 && completedCount >= totalLessons);
      return !isCompleted;
    });

    if (nonCompletedEnrollment) {
      const c = nonCompletedEnrollment.course;
      const validLessons = getPublishedLessons(c);
      const totalLessons = validLessons.length;
      const validLessonIds = new Set(validLessons.map((l) => (l._id ? l._id.toString() : '')));
      const completedList = (nonCompletedEnrollment.completedLessons || []).filter((id) =>
        validLessonIds.has(id.toString())
      );
      const completedSet = new Set(completedList.map((id) => id.toString()));
      const progressPercentage =
        totalLessons > 0 ? Math.min(100, Math.round((completedList.length / totalLessons) * 100)) : 0;

      let targetSectionTitle = '';
      let targetLessonId = '';
      let targetLessonTitle = '';

      // Check if lastAccessedLesson is valid and published
      if (nonCompletedEnrollment.lastAccessedLesson) {
        const lastIdStr = nonCompletedEnrollment.lastAccessedLesson.toString();
        for (const section of c.sections || []) {
          const found = (section.lessons || []).find(
            (l) => l && l._id && l._id.toString() === lastIdStr && l.isPublished !== false
          );
          if (found) {
            targetSectionTitle = section.title || '';
            targetLessonId = found._id.toString();
            targetLessonTitle = found.title || '';
            break;
          }
        }
      }

      // If lastAccessedLesson is not found, unpublished, or already completed, fall back to first unfinished published lesson
      if (!targetLessonId || completedSet.has(targetLessonId)) {
        for (const section of c.sections || []) {
          const unfinished = (section.lessons || []).find(
            (l) => l && l._id && l.isPublished !== false && !completedSet.has(l._id.toString())
          );
          if (unfinished) {
            targetSectionTitle = section.title || '';
            targetLessonId = unfinished._id.toString();
            targetLessonTitle = unfinished.title || '';
            break;
          }
        }
      }

      // If still not found, fall back to first published lesson
      if (!targetLessonId && validLessons.length > 0) {
        const first = validLessons[0];
        const section = (c.sections || []).find((s) =>
          (s.lessons || []).some((l) => l && l._id && l._id.toString() === first._id.toString())
        );
        targetSectionTitle = section?.title || '';
        targetLessonId = first._id ? first._id.toString() : '';
        targetLessonTitle = first.title || '';
      }

      if (targetLessonTitle || totalLessons > 0) {
        resumeLearning = {
          courseId: c._id.toString(),
          courseSlug: c.slug || '',
          courseTitle: c.title,
          sectionTitle: targetSectionTitle,
          lessonId: targetLessonId,
          lessonTitle: targetLessonTitle,
          progressPercentage,
          lastAccessedAt: nonCompletedEnrollment.lastAccessedAt || nonCompletedEnrollment.enrolledAt,
        };
      }
    }

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

    // 4b. Synthesize dynamic recentActivity from real data (no new collection)
    const activityItems = [];

    // 1. Recent lesson access from active enrollments
    for (const enr of activeEnrollments) {
      if (enr.lastAccessedAt && enr.course) {
        activityItems.push({
          type: 'lesson_access',
          text: `Studied "${enr.course.title}"`,
          courseTitle: enr.course.title,
          timestamp: enr.lastAccessedAt,
          link: `/courses/${enr.course.slug}/learn`,
        });
      }
    }

    if (mongoose.Types.ObjectId.isValid(studentId)) {
      try {
        // 2. Assignment Submissions & Published Grades
        const submissions = await AssignmentSubmission.find({ student: studentId })
          .populate({
            path: 'assignment',
            select: 'title course maxMarks',
            populate: { path: 'course', select: 'title slug' },
          })
          .sort({ updatedAt: -1 })
          .limit(8)
          .lean();

        for (const sub of submissions || []) {
          const assign = sub.assignment;
          const course = assign?.course;
          const cTitle = course?.title || '';
          const cSlug = course?.slug || '';

          if (sub.createdAt || sub.submittedAt) {
            activityItems.push({
              type: 'assignment_submission',
              text: `Submitted assignment: "${assign?.title || 'Assignment'}"`,
              courseTitle: cTitle,
              timestamp: sub.submittedAt || sub.createdAt,
              link: cSlug ? `/courses/${cSlug}/learn` : '/student/dashboard',
            });
          }

          if (sub.status === 'graded' && sub.grade !== undefined && sub.grade !== null) {
            activityItems.push({
              type: 'grade_published',
              text: `Grade published: ${sub.grade}/${assign?.maxMarks || 100} for "${assign?.title || 'Assignment'}"`,
              courseTitle: cTitle,
              timestamp: sub.gradedAt || sub.updatedAt,
              link: cSlug ? `/courses/${cSlug}/learn` : '/student/dashboard',
            });
          }
        }

        // 3. Certificates Issued
        const certificates = await Certificate.find({ student: studentId })
          .select('certificateId courseTitleSnapshot issueDate course')
          .populate('course', 'title slug')
          .sort({ issueDate: -1 })
          .limit(4)
          .lean();

        for (const cert of certificates || []) {
          activityItems.push({
            type: 'certificate_issued',
            text: `Earned Certificate of Completion for "${cert.courseTitleSnapshot || cert.course?.title || 'Course'}"`,
            courseTitle: cert.courseTitleSnapshot || cert.course?.title || '',
            timestamp: cert.issueDate,
            link: `/verify/${cert.certificateId}`,
          });
        }
      } catch (actErr) {
        logger.warn(`Recent activity synthesis fallback: ${actErr.message}`);
      }
    }

    // Sort newest first and limit to 8
    const recentActivity = activityItems
      .filter((item) => item && item.timestamp)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 8);

    return res.status(200).json({
      overview: {
        enrolledCount: activeEnrollments.length,
        inProgressCount,
        completedCount,
        notStartedCount,
        upcomingDeadlinesCount,
      },
      resumeLearning,
      enrolledCourses,
      upcomingDeadlines,
      recentActivity,
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

