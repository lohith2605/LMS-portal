const mongoose = require('mongoose');
const Assignment = require('../models/Assignment');
const AssignmentSubmission = require('../models/AssignmentSubmission');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const Quiz = require('../models/Quiz');
const QuizAttempt = require('../models/QuizAttempt');
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

  // 24-hour timezone padding to prevent local midnight boundary clipping across global client timezones
  const queryStart = new Date(start.getTime() - 24 * 60 * 60 * 1000);
  const queryEnd = new Date(end.getTime() + 24 * 60 * 60 * 1000);

  return { start, end, queryStart, queryEnd };
};

/**
 * Fetch authorized student calendar activities
 */
const getStudentCalendarActivities = async (studentId, options = {}) => {
  try {
    const { startDate, endDate, courseId, status, type } = options;
    const { start, end, queryStart, queryEnd } = resolveDateRange(startDate, endDate);
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
      dueDate: { $gte: queryStart, $lte: queryEnd },
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

    // 5b. Query published quizzes with deadlines within range
    const quizFilter = {
      course: { $in: targetCourseIds },
      status: 'published',
      dueDate: { $gte: queryStart, $lte: queryEnd, $ne: null },
    };

    const quizzes = await Quiz.find(quizFilter)
      .populate('course', 'title slug')
      .sort({ dueDate: 1 })
      .lean();

    const quizIds = quizzes.map((q) => q._id);
    const quizAttempts = await QuizAttempt.find({
      student: studentId,
      quiz: { $in: quizIds },
    }).lean();

    const quizAttemptsMap = new Map();
    quizAttempts.forEach((att) => {
      const qId = att.quiz.toString();
      const list = quizAttemptsMap.get(qId) || [];
      list.push(att);
      quizAttemptsMap.set(qId, list);
    });

    const quizEvents = quizzes.map((quiz) => {
      const attempts = quizAttemptsMap.get(quiz._id.toString()) || [];
      const hasPassed = attempts.some((a) => a.isPassed || a.passed);
      const isExhausted = quiz.maxAttempts > 0 && attempts.length >= quiz.maxAttempts;
      const isCompleted = hasPassed || isExhausted;

      let activityStatus;
      if (isCompleted) {
        activityStatus = 'completed';
      } else {
        activityStatus = deriveActivityStatus(quiz.dueDate, null, now);
      }

      const courseSlug = quiz.course?.slug || quiz.course;

      return {
        id: quiz._id.toString(),
        type: 'quiz',
        title: quiz.title,
        description: quiz.description || '',
        dueDate: quiz.dueDate,
        availableFrom: quiz.availableFrom,
        durationMinutes: quiz.durationMinutes || 0,
        passingPercentage: quiz.passingPercentage || 70,
        maxAttempts: quiz.maxAttempts || 0,
        attemptsCount: attempts.length,
        hasPassed,
        course: {
          _id: (quiz.course?._id || quiz.course)?.toString(),
          title: quiz.course?.title || 'Enrolled Course',
          slug: quiz.course?.slug || '',
        },
        status: activityStatus,
        destinationUrl: `/courses/${courseSlug}/learn?quiz=${quiz._id}`,
      };
    });

    events = [...events, ...quizEvents].sort(
      (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    );

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
    const { startDate, endDate, courseId, status, type } = options;
    const now = new Date();
    const { start, end, queryStart, queryEnd } = resolveDateRange(startDate, endDate);

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
      dueDate: { $gte: queryStart, $lte: queryEnd },
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
      const deadlineStatus = deriveActivityStatus(assignment.dueDate, null, now);
      return {
        id: assignment._id.toString(),
        type: 'assignment',
        title: assignment.title,
        description: assignment.description || '',
        dueDate: assignment.dueDate,
        status: deadlineStatus,
        publishStatus: assignment.status,
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

    // 4b. Query quizzes (draft or published) within date range
    const quizzes = await Quiz.find({
      course: { $in: targetCourseIds },
      status: { $in: ['published', 'draft'] },
      dueDate: { $gte: queryStart, $lte: queryEnd, $ne: null },
    })
      .populate('course', 'title slug')
      .sort({ dueDate: 1 })
      .lean();

    const quizIds = quizzes.map((q) => q._id);
    const quizAttempts = await QuizAttempt.find({
      quiz: { $in: quizIds },
    }).select('quiz isPassed passed score').lean();

    const quizAttemptStats = new Map();
    quizAttempts.forEach((att) => {
      const qId = att.quiz.toString();
      const current = quizAttemptStats.get(qId) || { total: 0, passed: 0 };
      current.total += 1;
      if (att.isPassed || att.passed) current.passed += 1;
      quizAttemptStats.set(qId, current);
    });

    const quizEvents = quizzes.map((quiz) => {
      const stats = quizAttemptStats.get(quiz._id.toString()) || { total: 0, passed: 0 };
      const deadlineStatus = deriveActivityStatus(quiz.dueDate, null, now);
      return {
        id: quiz._id.toString(),
        type: 'quiz',
        title: quiz.title,
        description: quiz.description || '',
        dueDate: quiz.dueDate,
        availableFrom: quiz.availableFrom,
        status: deadlineStatus,
        publishStatus: quiz.status,
        course: {
          _id: (quiz.course?._id || quiz.course)?.toString(),
          title: quiz.course?.title || 'Taught Course',
          slug: quiz.course?.slug || '',
        },
        stats: {
          totalSubmissions: stats.total,
          gradedSubmissions: stats.passed,
        },
        destinationUrl: `/instructor/dashboard?tab=assessments&quizId=${quiz._id}`,
      };
    });

    events = [...events, ...quizEvents].sort(
      (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    );

    if (status && status !== 'all') {
      events = events.filter((e) => e.status === status || e.publishStatus === status);
    }

    if (type && type !== 'all') {
      events = events.filter((e) => e.type === type);
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
const getUpcomingDeadlines = async (studentId, options = {}, role = 'student') => {
  try {
    const limit = Math.min(20, Math.max(1, parseInt(options.limit, 10) || 5));
    const now = new Date();
    const minDueDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    let courseIds = [];
    const isInstructor = role === 'instructor';

    if (isInstructor) {
      const taughtCourses = await Course.find({ instructor: studentId }).select('_id title slug').lean();
      courseIds = taughtCourses.map((c) => c._id);
    } else {
      const enrollments = await Enrollment.find({
        student: studentId,
        status: { $in: ['active', 'completed'] },
      }).select('course');
      courseIds = enrollments.map((e) => (e.course?._id || e.course)?.toString()).filter(Boolean);
    }

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
    const submissions = isInstructor
      ? await AssignmentSubmission.find({ assignment: { $in: assignmentIds } }).select('assignment status').lean()
      : await AssignmentSubmission.find({ student: studentId, assignment: { $in: assignmentIds } }).lean();

    const submissionMap = new Map();
    if (isInstructor) {
      submissions.forEach((s) => {
        const aId = s.assignment.toString();
        const cur = submissionMap.get(aId) || { total: 0, graded: 0 };
        cur.total += 1;
        if (s.status === 'graded') cur.graded += 1;
        submissionMap.set(aId, cur);
      });
    } else {
      submissions.forEach((s) => submissionMap.set(s.assignment.toString(), s));
    }

    const upcoming = [];
    for (const assignment of assignments) {
      if (isInstructor) {
        const stats = submissionMap.get(assignment._id.toString()) || { total: 0, graded: 0 };
        upcoming.push({
          id: assignment._id.toString(),
          type: 'assignment',
          title: assignment.title,
          dueDate: assignment.dueDate,
          course: {
            _id: (assignment.course?._id || assignment.course)?.toString(),
            title: assignment.course?.title || 'Taught Course',
            slug: assignment.course?.slug || '',
          },
          status: deriveActivityStatus(assignment.dueDate, null, now),
          stats: {
            totalSubmissions: stats.total,
            gradedSubmissions: stats.graded,
          },
          destinationUrl: `/instructor/dashboard?tab=assignments&assignmentId=${assignment._id}`,
        });
      } else {
        const submission = submissionMap.get(assignment._id.toString());
        const activityStatus = deriveActivityStatus(assignment.dueDate, submission, now);

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
      }
    }

    // 2. Published quizzes
    const quizzes = await Quiz.find({
      course: { $in: courseIds },
      status: 'published',
      dueDate: { $gte: minDueDate, $ne: null },
    })
      .populate('course', 'title slug')
      .sort({ dueDate: 1 })
      .limit(limit * 3)
      .lean();

    const quizIds = quizzes.map((q) => q._id);
    const quizAttempts = isInstructor
      ? await QuizAttempt.find({ quiz: { $in: quizIds } }).select('quiz isPassed passed score').lean()
      : await QuizAttempt.find({ student: studentId, quiz: { $in: quizIds } }).lean();

    const quizAttemptsMap = new Map();
    if (isInstructor) {
      quizAttempts.forEach((att) => {
        const qId = att.quiz.toString();
        const cur = quizAttemptsMap.get(qId) || { total: 0, passed: 0 };
        cur.total += 1;
        if (att.isPassed || att.passed) cur.passed += 1;
        quizAttemptsMap.set(qId, cur);
      });
    } else {
      quizAttempts.forEach((att) => {
        const qId = att.quiz.toString();
        const list = quizAttemptsMap.get(qId) || [];
        list.push(att);
        quizAttemptsMap.set(qId, list);
      });
    }

    for (const quiz of quizzes) {
      const courseSlug = quiz.course?.slug || quiz.course;
      if (isInstructor) {
        const stats = quizAttemptsMap.get(quiz._id.toString()) || { total: 0, passed: 0 };
        upcoming.push({
          id: quiz._id.toString(),
          type: 'quiz',
          title: quiz.title,
          dueDate: quiz.dueDate,
          course: {
            _id: (quiz.course?._id || quiz.course)?.toString(),
            title: quiz.course?.title || 'Taught Course',
            slug: quiz.course?.slug || '',
          },
          status: deriveActivityStatus(quiz.dueDate, null, now),
          stats: {
            totalSubmissions: stats.total,
            gradedSubmissions: stats.passed,
          },
          destinationUrl: `/instructor/dashboard?tab=assessments&quizId=${quiz._id}`,
        });
      } else {
        const attempts = quizAttemptsMap.get(quiz._id.toString()) || [];
        const hasPassed = attempts.some((a) => a.isPassed || a.passed);
        const isExhausted = quiz.maxAttempts > 0 && attempts.length >= quiz.maxAttempts;
        if (hasPassed || isExhausted) continue;

        upcoming.push({
          id: quiz._id.toString(),
          type: 'quiz',
          title: quiz.title,
          dueDate: quiz.dueDate,
          course: {
            _id: (quiz.course?._id || quiz.course)?.toString(),
            title: quiz.course?.title || 'Enrolled Course',
            slug: quiz.course?.slug || '',
          },
          status: deriveActivityStatus(quiz.dueDate, null, now),
          destinationUrl: `/courses/${courseSlug}/learn?quiz=${quiz._id}`,
        });
      }
    }

    upcoming.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    return { upcoming: upcoming.slice(0, limit) };
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
