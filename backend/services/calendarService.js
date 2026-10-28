const mongoose = require('mongoose');
const Assignment = require('../models/Assignment');
const AssignmentSubmission = require('../models/AssignmentSubmission');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const { logger } = require('../utils/logger');

const DUE_SOON_HOURS_DEFAULT = 48;

/**
 * Derive activity deadline status based on submission and UTC timestamp
 */
const deriveActivityStatus = (dueDate, submission, now = new Date(), dueSoonHours = DUE_SOON_HOURS_DEFAULT) => {
  if (submission && ['submitted', 'late', 'graded'].includes(submission.status)) {
    return 'completed';
  }

  if (!dueDate) return 'upcoming';

  const due = new Date(dueDate);
  if (isNaN(due.getTime())) return 'upcoming';

  const current = new Date(now);

  if (due < current) {
    return 'overdue';
  }

  const diffMs = due.getTime() - current.getTime();
  const windowMs = dueSoonHours * 60 * 60 * 1000;

  if (diffMs <= windowMs) {
    return 'due_soon';
  }

  return 'upcoming';
};

/**
 * Resolve validated start and end dates with boundaries
 */
const resolveDateRange = (startDate, endDate) => {
  const now = new Date();
  let start;
  let end;

  if (startDate) {
    start = new Date(startDate);
    if (isNaN(start.getTime())) {
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    }
  } else {
    // Default to start of previous month
    start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  }

  if (endDate) {
    end = new Date(endDate);
    if (isNaN(end.getTime())) {
      end = new Date(now.getFullYear(), now.getMonth() + 2, 0, 23, 59, 59, 999);
    }
  } else {
    // Default to end of next month (3-month window)
    end = new Date(now.getFullYear(), now.getMonth() + 2, 0, 23, 59, 59, 999);
  }

  // Handle reversed range gracefully
  if (start > end) {
    const temp = start;
    start = end;
    end = temp;
  }

  // Bound range to maximum 1 year
  const maxRangeMs = 366 * 24 * 60 * 60 * 1000;
  if (end.getTime() - start.getTime() > maxRangeMs) {
    end = new Date(start.getTime() + maxRangeMs);
  }

  return { start, end };
};

/**
 * Fetch authorized student calendar activities
 */
const getStudentCalendarActivities = async (studentId, options = {}) => {
  try {
    const { startDate, endDate, courseId, status, type } = options;
    const { start, end } = resolveDateRange(startDate, endDate);
    const now = new Date();

    // 1. Fetch active / completed enrollments
    const enrollments = await Enrollment.find({
      student: studentId,
      status: { $in: ['active', 'completed'] },
    }).select('course');

    const enrolledCourseIds = enrollments
      .map((e) => (e.course?._id || e.course)?.toString())
      .filter(Boolean);

    if (enrolledCourseIds.length === 0) {
      return {
        events: [],
        total: 0,
        range: { start: start.toISOString(), end: end.toISOString() },
      };
    }

    // 2. Validate courseId parameter if provided
    let targetCourseIds = enrolledCourseIds;
    if (courseId) {
      if (!mongoose.Types.ObjectId.isValid(courseId)) {
        return { error: 'Invalid course ID format.', status: 400 };
      }
      if (!enrolledCourseIds.includes(courseId.toString())) {
        return { error: 'Forbidden: You are not enrolled in this course.', status: 403 };
      }
      targetCourseIds = [courseId.toString()];
    }

    // 3. Query published assignments with deadlines within range
    const assignmentFilter = {
      course: { $in: targetCourseIds },
      status: 'published',
      dueDate: { $gte: start, $lte: end },
    };

    const assignments = await Assignment.find(assignmentFilter)
      .populate('course', 'title slug')
      .sort({ dueDate: 1 })
      .lean();

    const assignmentIds = assignments.map((a) => a._id);

    // 4. Fetch student's submissions for these assignments
    const submissions = await AssignmentSubmission.find({
      student: studentId,
      assignment: { $in: assignmentIds },
    }).lean();

    const submissionMap = new Map();
    submissions.forEach((sub) => {
      submissionMap.set(sub.assignment.toString(), sub);
    });

    // 5. Normalize activities into calendar events
    let events = assignments.map((assignment) => {
      const submission = submissionMap.get(assignment._id.toString());
      const activityStatus = deriveActivityStatus(assignment.dueDate, submission, now);

      return {
        id: assignment._id.toString(),
        type: 'assignment',
        title: assignment.title,
        description: assignment.description || '',
        dueDate: assignment.dueDate,
        maxMarks: assignment.maxMarks || 100,
        allowLateSubmissions: assignment.allowLateSubmissions !== false,
        course: {
          _id: (assignment.course?._id || assignment.course)?.toString(),
          title: assignment.course?.title || 'Enrolled Course',
          slug: assignment.course?.slug || '',
        },
        status: activityStatus,
        submission: submission
          ? {
              id: submission._id.toString(),
              status: submission.status,
              isLate: submission.isLate,
              grade: submission.isGradePublished ? submission.grade : null,
              submittedAt: submission.submittedAt,
            }
          : null,
        destinationUrl: `/student/dashboard?tab=assignments&assignmentId=${assignment._id}`,
      };
    });

    // 6. Apply status filter if specified
    if (status && status !== 'all') {
      events = events.filter((e) => e.status === status);
    }

    // 7. Apply type filter if specified (quizzes currently do not support calendar scheduling)
    if (type && type !== 'all') {
      events = events.filter((e) => e.type === type);
    }

    return {
      events,
      total: events.length,
      range: { start: start.toISOString(), end: end.toISOString() },
    };
  } catch (err) {
    logger.error(`getStudentCalendarActivities error: ${err.message}`);
    throw err;
  }
};

/**
 * Fetch authorized instructor calendar activities
 */
const getInstructorCalendarActivities = async (instructorId, options = {}) => {
  try {
    const { startDate, endDate, courseId, status } = options;
    const { start, end } = resolveDateRange(startDate, endDate);

    // 1. Fetch courses owned by instructor
    const courses = await Course.find({ instructor: instructorId }).select('_id title slug').lean();
    const instructorCourseIds = courses.map((c) => c._id.toString());

    if (instructorCourseIds.length === 0) {
      return {
        events: [],
        total: 0,
        range: { start: start.toISOString(), end: end.toISOString() },
      };
    }

    // 2. Validate courseId if specified
    let targetCourseIds = instructorCourseIds;
    if (courseId) {
      if (!mongoose.Types.ObjectId.isValid(courseId)) {
        return { error: 'Invalid course ID format.', status: 400 };
      }
      if (!instructorCourseIds.includes(courseId.toString())) {
        return { error: 'Forbidden: You do not teach this course.', status: 403 };
      }
      targetCourseIds = [courseId.toString()];
    }

    // 3. Query assignments (draft or published) within date range
    const assignments = await Assignment.find({
      course: { $in: targetCourseIds },
      status: { $in: ['published', 'draft'] },
      dueDate: { $gte: start, $lte: end },
    })
      .populate('course', 'title slug')
      .sort({ dueDate: 1 })
      .lean();

    const assignmentIds = assignments.map((a) => a._id);

    // 4. Aggregate submission counts
    const submissions = await AssignmentSubmission.find({
      assignment: { $in: assignmentIds },
    }).select('assignment status').lean();

    const submissionStats = new Map();
    submissions.forEach((sub) => {
      const aId = sub.assignment.toString();
      const current = submissionStats.get(aId) || { total: 0, graded: 0 };
      current.total += 1;
      if (sub.status === 'graded') current.graded += 1;
      submissionStats.set(aId, current);
    });

    let events = assignments.map((assignment) => {
      const stats = submissionStats.get(assignment._id.toString()) || { total: 0, graded: 0 };
      return {
        id: assignment._id.toString(),
        type: 'assignment',
        title: assignment.title,
        description: assignment.description || '',
        dueDate: assignment.dueDate,
        status: assignment.status,
        course: {
          _id: (assignment.course?._id || assignment.course)?.toString(),
          title: assignment.course?.title || 'Taught Course',
          slug: assignment.course?.slug || '',
        },
        stats: {
          totalSubmissions: stats.total,
          gradedSubmissions: stats.graded,
        },
        destinationUrl: `/instructor/dashboard?tab=assignments&assignmentId=${assignment._id}`,
      };
    });

    if (status && status !== 'all') {
      events = events.filter((e) => e.status === status);
    }

    return {
      events,
      total: events.length,
      range: { start: start.toISOString(), end: end.toISOString() },
    };
  } catch (err) {
    logger.error(`getInstructorCalendarActivities error: ${err.message}`);
    throw err;
  }
};

/**
 * Retrieve impending upcoming deadlines for active student
 */
const getUpcomingDeadlines = async (studentId, options = {}) => {
  try {
    const limit = Math.min(20, Math.max(1, parseInt(options.limit, 10) || 5));
    const now = new Date();

    const enrollments = await Enrollment.find({
      student: studentId,
      status: { $in: ['active', 'completed'] },
    }).select('course');

    const courseIds = enrollments.map((e) => (e.course?._id || e.course)?.toString()).filter(Boolean);
    if (courseIds.length === 0) return { upcoming: [] };

    // Fetch published assignments with dueDate in the future or up to 24h overdue if late allowed
    const assignments = await Assignment.find({
      course: { $in: courseIds },
      status: 'published',
      dueDate: { $gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
    })
      .populate('course', 'title slug')
      .sort({ dueDate: 1 })
      .limit(limit * 3)
      .lean();

    const assignmentIds = assignments.map((a) => a._id);
    const submissions = await AssignmentSubmission.find({
      student: studentId,
      assignment: { $in: assignmentIds },
    }).lean();

    const submissionMap = new Map();
    submissions.forEach((s) => submissionMap.set(s.assignment.toString(), s));

    const upcoming = [];
    for (const assignment of assignments) {
      const submission = submissionMap.get(assignment._id.toString());
      const activityStatus = deriveActivityStatus(assignment.dueDate, submission, now);

      // Incomplete activities only
      if (activityStatus !== 'completed') {
        upcoming.push({
          id: assignment._id.toString(),
          type: 'assignment',
          title: assignment.title,
          dueDate: assignment.dueDate,
          course: {
            _id: (assignment.course?._id || assignment.course)?.toString(),
            title: assignment.course?.title || 'Enrolled Course',
            slug: assignment.course?.slug || '',
          },
          status: activityStatus,
          destinationUrl: `/student/dashboard?tab=assignments&assignmentId=${assignment._id}`,
        });
      }

      if (upcoming.length >= limit) break;
    }

    return { upcoming };
  } catch (err) {
    logger.error(`getUpcomingDeadlines error: ${err.message}`);
    throw err;
  }
};

module.exports = {
  deriveActivityStatus,
  resolveDateRange,
  getStudentCalendarActivities,
  getInstructorCalendarActivities,
  getUpcomingDeadlines,
  DUE_SOON_HOURS_DEFAULT,
};
