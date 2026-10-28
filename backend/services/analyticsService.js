const User = require('../models/User');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const Assignment = require('../models/Assignment');
const AssignmentSubmission = require('../models/AssignmentSubmission');
const Quiz = require('../models/Quiz');
const QuizAttempt = require('../models/QuizAttempt');
const Certificate = require('../models/Certificate');
const Review = require('../models/Review');
const { logger } = require('../utils/logger');

/**
 * Safely compute percentage with 0 denominator protection
 */
function safePercentage(numerator, denominator) {
  if (!denominator || denominator <= 0) return 0;
  const pct = Math.round((numerator / denominator) * 100);
  return Math.min(100, Math.max(0, isNaN(pct) ? 0 : pct));
}

/**
 * Helper to compute course lesson count and completed percentage for an enrollment
 */
function calculateCourseProgress(enrollment, course) {
  if (!course) return { totalLessons: 0, completedCount: 0, progressPercent: 0 };

  const sections = Array.isArray(course.sections) ? course.sections : [];
  let totalLessons = 0;
  for (const s of sections) {
    const lessons = Array.isArray(s.lessons) ? s.lessons : [];
    totalLessons += lessons.filter((l) => l.isPublished !== false).length;
  }

  const completedLessons = Array.isArray(enrollment.completedLessons) ? enrollment.completedLessons : [];
  const completedCount = completedLessons.length;

  let progressPercent = 0;
  if (totalLessons > 0) {
    progressPercent = safePercentage(completedCount, totalLessons);
  } else if (enrollment.isCompleted || enrollment.status === 'completed') {
    progressPercent = 100;
  }

  return { totalLessons, completedCount, progressPercent };
}

/**
 * Get comprehensive analytics for a student
 * @param {string|ObjectId} studentId
 */
async function getStudentAnalytics(studentId) {
  // 1. Enrollments: active and completed only (exclude dropped)
  const enrollments = await Enrollment.find({
    student: studentId,
    status: { $in: ['active', 'completed'] },
  })
    .populate({
      path: 'course',
      select: 'title slug category thumbnail status sections',
    })
    .lean();

  const validEnrollments = enrollments.filter((e) => e && e.course);
  const enrolledCourseIds = validEnrollments.map((e) => e.course._id);

  let totalProgressSum = 0;
  let activeCoursesCount = 0;
  let completedCoursesCount = 0;

  const courseBreakdown = validEnrollments.map((enr) => {
    const { totalLessons, completedCount, progressPercent } = calculateCourseProgress(enr, enr.course);
    totalProgressSum += progressPercent;
    if (enr.status === 'completed' || enr.isCompleted) {
      completedCoursesCount += 1;
    } else {
      activeCoursesCount += 1;
    }

    return {
      enrollmentId: enr._id,
      courseId: enr.course._id,
      courseTitle: enr.course.title,
      courseSlug: enr.course.slug,
      category: enr.course.category,
      status: enr.status,
      totalLessons,
      completedLessonsCount: completedCount,
      progressPercent,
      lastAccessedAt: enr.lastAccessedAt || enr.enrolledAt,
    };
  });

  const averageCourseProgress = validEnrollments.length > 0
    ? Math.round(totalProgressSum / validEnrollments.length)
    : 0;

  // 2. Assignments
  let assignedCount = 0;
  let submittedCount = 0;
  let gradedCount = 0;
  let pendingGradingCount = 0;
  let gradePercentagesSum = 0;
  let assignmentSubmissions = [];

  if (enrolledCourseIds.length > 0) {
    const publishedAssignments = await Assignment.find({
      course: { $in: enrolledCourseIds },
      status: 'published',
    })
      .select('title maxMarks dueDate course')
      .lean();

    assignedCount = publishedAssignments.length;
    const assignmentMap = new Map();
    publishedAssignments.forEach((a) => assignmentMap.set(a._id.toString(), a));

    assignmentSubmissions = await AssignmentSubmission.find({
      student: studentId,
      assignment: { $in: publishedAssignments.map((a) => a._id) },
    })
      .select('assignment status grade submittedAt feedback')
      .lean();

    submittedCount = assignmentSubmissions.length;

    assignmentSubmissions.forEach((sub) => {
      const a = assignmentMap.get(sub.assignment?.toString());
      const maxMarks = a?.maxMarks || 100;

      if (sub.status === 'graded' && typeof sub.grade === 'number') {
        gradedCount += 1;
        const pct = Math.min(100, Math.max(0, (sub.grade / maxMarks) * 100));
        gradePercentagesSum += pct;
      } else if (sub.status === 'submitted' || sub.status === 'late') {
        pendingGradingCount += 1;
      }
    });
  }

  const averageAssignmentGrade = gradedCount > 0 ? Math.round(gradePercentagesSum / gradedCount) : 0;
  const assignmentSubmissionRate = safePercentage(submittedCount, assignedCount);

  // 3. Quizzes
  const quizAttempts = await QuizAttempt.find({
    student: studentId,
    status: 'completed',
  })
    .populate('quiz', 'title course passingPercentage')
    .sort({ submittedAt: 1 })
    .lean();

  const totalQuizAttempts = quizAttempts.length;
  const quizMap = new Map();

  let totalScoreSum = 0;
  let latestQuizScore = 0;
  let bestQuizScore = 0;

  quizAttempts.forEach((attempt) => {
    const scorePct = typeof attempt.percentage === 'number' ? attempt.percentage : 0;
    totalScoreSum += scorePct;
    latestQuizScore = scorePct; // Last since sorted submittedAt ascending
    if (scorePct > bestQuizScore) bestQuizScore = scorePct;

    const quizId = attempt.quiz?._id?.toString() || attempt.quiz?.toString();
    if (quizId) {
      if (!quizMap.has(quizId)) {
        quizMap.set(quizId, {
          quizId,
          quizTitle: attempt.quiz?.title || 'Quiz',
          attemptsCount: 0,
          bestScore: 0,
          latestScore: 0,
          passed: false,
        });
      }
      const entry = quizMap.get(quizId);
      entry.attemptsCount += 1;
      entry.latestScore = scorePct;
      if (scorePct > entry.bestScore) entry.bestScore = scorePct;
      if (attempt.passed) entry.passed = true;
    }
  });

  const averageQuizScore = totalQuizAttempts > 0 ? Math.round(totalScoreSum / totalQuizAttempts) : 0;
  const quizzesAttemptedCount = quizMap.size;
  const quizzesPassedCount = Array.from(quizMap.values()).filter((q) => q.passed).length;

  // 4. Certificates
  const certificates = await Certificate.find({ student: studentId })
    .populate('course', 'title slug thumbnail')
    .sort({ issuedAt: -1 })
    .lean();

  const certificatesCount = certificates.length;
  const certificatesList = certificates.map((cert) => ({
    certificateId: cert.certificateId,
    courseTitle: cert.course?.title || cert.courseSnapshot?.title || 'Completed Course',
    courseSlug: cert.course?.slug || '',
    issuedAt: cert.issuedAt,
  }));

  // 5. Authentic Recent Learning Activity Timeline (Merged & Sorted)
  const activityItems = [];

  // Enrollment access
  validEnrollments.forEach((e) => {
    if (e.lastAccessedAt) {
      activityItems.push({
        id: `access-${e._id}`,
        type: 'course_access',
        title: `Studied "${e.course.title}"`,
        date: new Date(e.lastAccessedAt),
        metadata: { courseTitle: e.course.title, courseSlug: e.course.slug },
      });
    }
  });

  // Assignment submissions
  assignmentSubmissions.forEach((s) => {
    if (s.submittedAt) {
      activityItems.push({
        id: `sub-${s._id}`,
        type: 'assignment_submission',
        title: s.status === 'graded' ? 'Assignment Graded' : 'Assignment Submitted',
        date: new Date(s.submittedAt),
        metadata: { status: s.status, grade: s.grade },
      });
    }
  });

  // Quiz completions
  quizAttempts.forEach((a) => {
    if (a.submittedAt) {
      activityItems.push({
        id: `quiz-${a._id}`,
        type: 'quiz_completion',
        title: `Completed quiz attempt: ${a.quiz?.title || 'Quiz'}`,
        date: new Date(a.submittedAt),
        metadata: { percentage: a.percentage, passed: a.passed },
      });
    }
  });

  // Certificates
  certificates.forEach((c) => {
    activityItems.push({
      id: `cert-${c._id}`,
      type: 'certificate_earned',
      title: `Earned Certificate for "${c.course?.title || 'Course'}"`,
      date: new Date(c.issuedAt || c.createdAt),
      metadata: { certificateId: c.certificateId },
    });
  });

  // Sort descending by date and slice top 10
  activityItems.sort((a, b) => b.date.getTime() - a.date.getTime());
  const recentActivities = activityItems.slice(0, 10);

  return {
    overview: {
      totalEnrolled: validEnrollments.length,
      activeCourses: activeCoursesCount,
      completedCourses: completedCoursesCount,
      averageCourseProgress,
      certificatesEarned: certificatesCount,
    },
    courses: {
      summary: {
        total: validEnrollments.length,
        active: activeCoursesCount,
        completed: completedCoursesCount,
        averageProgress: averageCourseProgress,
      },
      breakdown: courseBreakdown,
    },
    assignments: {
      totalAssigned: assignedCount,
      submittedCount,
      pendingGradingCount,
      gradedCount,
      submissionRate: assignmentSubmissionRate,
      averageGrade: averageAssignmentGrade,
    },
    quizzes: {
      totalAttempts: totalQuizAttempts,
      quizzesAttempted: quizzesAttemptedCount,
      quizzesPassed: quizzesPassedCount,
      bestScore: bestQuizScore,
      latestScore: latestQuizScore,
      averageScore: averageQuizScore,
      attemptsSummary: Array.from(quizMap.values()),
    },
    certificates: {
      total: certificatesCount,
      list: certificatesList,
    },
    recentActivities,
  };
}

/**
 * Get comprehensive analytics for an instructor
 * @param {string|ObjectId} instructorId
 */
async function getInstructorAnalytics(instructorId) {
  // 1. Instructor Owned Courses
  const courses = await Course.find({ instructor: instructorId })
    .select('title slug status category thumbnail sections')
    .lean();

  const ownedCourseIds = courses.map((c) => c._id);

  // Status breakdown
  const courseStatusCounts = {
    total: courses.length,
    published: 0,
    draft: 0,
    pending_review: 0,
    rejected: 0,
    archived: 0,
  };

  courses.forEach((c) => {
    if (Object.prototype.hasOwnProperty.call(courseStatusCounts, c.status)) {
      courseStatusCounts[c.status] += 1;
    }
  });

  // 2. Enrollments across owned courses
  let totalLearnersSet = new Set();
  let totalEnrollmentsCount = 0;
  let activeEnrollmentsCount = 0;
  let completedEnrollmentsCount = 0;

  // Cohort progress tiers
  const progressTiers = {
    tier0To25: 0,
    tier26To50: 0,
    tier51To75: 0,
    tier76To100: 0,
  };

  const courseEnrollmentMap = new Map();
  courses.forEach((c) => {
    courseEnrollmentMap.set(c._id.toString(), []);
  });

  if (ownedCourseIds.length > 0) {
    const enrollments = await Enrollment.find({
      course: { $in: ownedCourseIds },
      status: { $in: ['active', 'completed'] },
    })
      .select('course student status completedLessons isCompleted')
      .lean();

    totalEnrollmentsCount = enrollments.length;

    // Course lookup
    const courseObjMap = new Map();
    courses.forEach((c) => courseObjMap.set(c._id.toString(), c));

    enrollments.forEach((enr) => {
      if (enr.student) totalLearnersSet.add(enr.student.toString());

      if (enr.status === 'completed' || enr.isCompleted) {
        completedEnrollmentsCount += 1;
      } else {
        activeEnrollmentsCount += 1;
      }

      const c = courseObjMap.get(enr.course.toString());
      const { progressPercent } = calculateCourseProgress(enr, c);

      // Categorize tier
      if (progressPercent <= 25) {
        progressTiers.tier0To25 += 1;
      } else if (progressPercent <= 50) {
        progressTiers.tier26To50 += 1;
      } else if (progressPercent <= 75) {
        progressTiers.tier51To75 += 1;
      } else {
        progressTiers.tier76To100 += 1;
      }

      const list = courseEnrollmentMap.get(enr.course.toString());
      if (list) {
        list.push({ ...enr, progressPercent });
      }
    });
  }

  const completionRate = safePercentage(completedEnrollmentsCount, totalEnrollmentsCount);

  // 3. Per-Course Performance Comparison
  const coursePerformance = courses.map((course) => {
    const courseEnrs = courseEnrollmentMap.get(course._id.toString()) || [];
    const totalEnrs = courseEnrs.length;
    const completed = courseEnrs.filter((e) => e.status === 'completed' || e.isCompleted).length;
    const active = totalEnrs - completed;
    const courseCompletionRate = safePercentage(completed, totalEnrs);

    let progressSum = 0;
    courseEnrs.forEach((e) => {
      progressSum += e.progressPercent || 0;
    });
    const avgProgress = totalEnrs > 0 ? Math.round(progressSum / totalEnrs) : 0;

    return {
      courseId: course._id,
      title: course.title,
      slug: course.slug,
      status: course.status,
      category: course.category,
      totalEnrollments: totalEnrs,
      activeStudents: active,
      completedStudents: completed,
      completionRate: courseCompletionRate,
      averageProgress: avgProgress,
    };
  });

  // 4. Assignments & Grading Velocity
  let totalAssignments = 0;
  let totalSubmissions = 0;
  let pendingGrading = 0;
  let gradedSubmissionsCount = 0;
  let assignmentGradeSum = 0;

  if (ownedCourseIds.length > 0) {
    const assignments = await Assignment.find({ course: { $in: ownedCourseIds } })
      .select('title maxMarks course')
      .lean();

    totalAssignments = assignments.length;
    const assignmentMap = new Map();
    assignments.forEach((a) => assignmentMap.set(a._id.toString(), a));

    if (totalAssignments > 0) {
      const submissions = await AssignmentSubmission.find({
        assignment: { $in: assignments.map((a) => a._id) },
      })
        .select('assignment status grade')
        .lean();

      totalSubmissions = submissions.length;

      submissions.forEach((sub) => {
        if (sub.status === 'submitted' || sub.status === 'late') {
          pendingGrading += 1;
        } else if (sub.status === 'graded' && typeof sub.grade === 'number') {
          gradedSubmissionsCount += 1;
          const a = assignmentMap.get(sub.assignment?.toString());
          const maxMarks = a?.maxMarks || 100;
          const pct = Math.min(100, Math.max(0, (sub.grade / maxMarks) * 100));
          assignmentGradeSum += pct;
        }
      });
    }
  }

  const averageAssignmentGrade = gradedSubmissionsCount > 0
    ? Math.round(assignmentGradeSum / gradedSubmissionsCount)
    : 0;

  // 5. Quizzes
  let totalQuizzes = 0;
  let totalQuizAttempts = 0;
  let passedQuizAttempts = 0;
  let quizScoreSum = 0;

  if (ownedCourseIds.length > 0) {
    const quizzes = await Quiz.find({ course: { $in: ownedCourseIds } })
      .select('title passingPercentage')
      .lean();

    totalQuizzes = quizzes.length;

    if (totalQuizzes > 0) {
      const quizAttempts = await QuizAttempt.find({
        quiz: { $in: quizzes.map((q) => q._id) },
        status: 'completed',
      })
        .select('percentage passed')
        .lean();

      totalQuizAttempts = quizAttempts.length;

      quizAttempts.forEach((att) => {
        const pct = typeof att.percentage === 'number' ? att.percentage : 0;
        quizScoreSum += pct;
        if (att.passed) passedQuizAttempts += 1;
      });
    }
  }

  const quizPassRate = safePercentage(passedQuizAttempts, totalQuizAttempts);
  const averageQuizScore = totalQuizAttempts > 0 ? Math.round(quizScoreSum / totalQuizAttempts) : 0;

  return {
    overview: {
      totalCourses: courses.length,
      publishedCourses: courseStatusCounts.published,
      totalLearners: totalLearnersSet.size,
      totalEnrollments: totalEnrollmentsCount,
      activeEnrollments: activeEnrollmentsCount,
      completedEnrollments: completedEnrollmentsCount,
      completionRate,
      pendingGrading,
    },
    courseStatusBreakdown: courseStatusCounts,
    progressDistribution: {
      ...progressTiers,
      total: totalEnrollmentsCount,
    },
    assignmentStats: {
      totalAssignments,
      totalSubmissions,
      pendingGrading,
      gradedSubmissions: gradedSubmissionsCount,
      averageGrade: averageAssignmentGrade,
    },
    quizStats: {
      totalQuizzes,
      totalAttempts: totalQuizAttempts,
      passedAttempts: passedQuizAttempts,
      passRate: quizPassRate,
      averageScore: averageQuizScore,
    },
    coursesPerformance: coursePerformance,
  };
}

/**
 * Get platform-wide analytics for administrators
 */
async function getAdminAnalytics() {
  // 1. Users Breakdown
  const userRoleAgg = await User.aggregate([
    {
      $group: {
        _id: '$role',
        count: { $sum: 1 },
      },
    },
  ]);

  const userStatusAgg = await User.aggregate([
    {
      $group: {
        _id: '$accountStatus',
        count: { $sum: 1 },
      },
    },
  ]);

  const usersByRole = { student: 0, instructor: 0, admin: 0, total: 0 };
  userRoleAgg.forEach((r) => {
    if (Object.prototype.hasOwnProperty.call(usersByRole, r._id)) {
      usersByRole[r._id] = r.count;
    }
    usersByRole.total += r.count;
  });

  const usersByStatus = { active: 0, pending: 0, suspended: 0 };
  userStatusAgg.forEach((s) => {
    if (Object.prototype.hasOwnProperty.call(usersByStatus, s._id)) {
      usersByStatus[s._id] = s.count;
    }
  });

  // 2. Courses Breakdown
  const courseStatusAgg = await Course.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
      },
    },
  ]);

  const courseCategoryAgg = await Course.aggregate([
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 },
      },
    },
  ]);

  const coursesByStatus = {
    total: 0,
    published: 0,
    draft: 0,
    pending_review: 0,
    rejected: 0,
    archived: 0,
  };

  courseStatusAgg.forEach((cs) => {
    if (Object.prototype.hasOwnProperty.call(coursesByStatus, cs._id)) {
      coursesByStatus[cs._id] = cs.count;
    }
    coursesByStatus.total += cs.count;
  });

  const coursesByCategory = {};
  courseCategoryAgg.forEach((cat) => {
    coursesByCategory[cat._id || 'Other'] = cat.count;
  });

  // 3. Enrollments Breakdown
  const enrollmentStatusAgg = await Enrollment.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
      },
    },
  ]);

  const enrollmentsByStatus = {
    total: 0,
    active: 0,
    completed: 0,
    dropped: 0,
  };

  enrollmentStatusAgg.forEach((es) => {
    if (Object.prototype.hasOwnProperty.call(enrollmentsByStatus, es._id)) {
      enrollmentsByStatus[es._id] = es.count;
    }
    enrollmentsByStatus.total += es.count;
  });

  const validEnrollmentsPlatform = enrollmentsByStatus.active + enrollmentsByStatus.completed;
  const platformCompletionRate = safePercentage(enrollmentsByStatus.completed, validEnrollmentsPlatform);

  // 4. Assignments & Submissions
  const totalAssignments = await Assignment.countDocuments();
  const submissionStatusAgg = await AssignmentSubmission.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        avgGrade: { $avg: '$grade' },
      },
    },
  ]);

  let totalSubmissions = 0;
  let gradedSubmissions = 0;
  let pendingSubmissions = 0;
  let rawAvgGrade = 0;

  submissionStatusAgg.forEach((ss) => {
    totalSubmissions += ss.count;
    if (ss._id === 'graded') {
      gradedSubmissions += ss.count;
      rawAvgGrade = ss.avgGrade || 0;
    } else if (ss._id === 'submitted' || ss._id === 'late') {
      pendingSubmissions += ss.count;
    }
  });

  // 5. Quizzes & Attempts
  const totalQuizzes = await Quiz.countDocuments();
  const quizAgg = await QuizAttempt.aggregate([
    {
      $match: { status: 'completed' },
    },
    {
      $group: {
        _id: null,
        totalAttempts: { $sum: 1 },
        passedAttempts: { $sum: { $cond: ['$passed', 1, 0] } },
        avgPercentage: { $avg: '$percentage' },
      },
    },
  ]);

  const quizMetrics = quizAgg[0] || { totalAttempts: 0, passedAttempts: 0, avgPercentage: 0 };
  const platformQuizPassRate = safePercentage(quizMetrics.passedAttempts, quizMetrics.totalAttempts);
  const platformAverageQuizScore = Math.round(quizMetrics.avgPercentage || 0);

  // 6. Certificates & Reviews
  const totalCertificates = await Certificate.countDocuments();
  const reviewAgg = await Review.aggregate([
    {
      $match: { moderationStatus: 'approved' },
    },
    {
      $group: {
        _id: null,
        totalReviews: { $sum: 1 },
        avgRating: { $avg: '$rating' },
      },
    },
  ]);

  const reviewMetrics = reviewAgg[0] || { totalReviews: 0, avgRating: 0 };
  const platformAverageRating = Number((reviewMetrics.avgRating || 0).toFixed(1));

  // 7. 30-Day Time Series Trends (Daily Registrations and Enrollments)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 29);
  thirtyDaysAgo.setUTCHours(0, 0, 0, 0);

  const [registrationTrends, enrollmentTrends] = await Promise.all([
    User.aggregate([
      {
        $match: { createdAt: { $gte: thirtyDaysAgo } },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
    ]),
    Enrollment.aggregate([
      {
        $match: { enrolledAt: { $gte: thirtyDaysAgo } },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$enrolledAt' } },
          count: { $sum: 1 },
        },
      },
    ]),
  ]);

  const regMap = new Map();
  registrationTrends.forEach((r) => regMap.set(r._id, r.count));

  const enrMap = new Map();
  enrollmentTrends.forEach((e) => enrMap.set(e._id, e.count));

  // Build sequential continuous 30-day timeline
  const dailyTrends = [];
  for (let i = 0; i < 30; i++) {
    const d = new Date(thirtyDaysAgo);
    d.setUTCDate(d.getUTCDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    dailyTrends.push({
      date: dateStr,
      registrations: regMap.get(dateStr) || 0,
      enrollments: enrMap.get(dateStr) || 0,
    });
  }

  return {
    users: {
      byRole: usersByRole,
      byStatus: usersByStatus,
    },
    courses: {
      byStatus: coursesByStatus,
      byCategory: coursesByCategory,
    },
    enrollments: {
      ...enrollmentsByStatus,
      completionRate: platformCompletionRate,
    },
    assessments: {
      totalAssignments,
      totalSubmissions,
      pendingSubmissions,
      gradedSubmissions,
      averageAssignmentGrade: Math.round(rawAvgGrade),
      totalQuizzes,
      totalQuizAttempts: quizMetrics.totalAttempts,
      passedQuizAttempts: quizMetrics.passedAttempts,
      passRate: platformQuizPassRate,
      averageQuizScore: platformAverageQuizScore,
    },
    qualityAndCredentials: {
      totalCertificatesIssued: totalCertificates,
      totalReviews: reviewMetrics.totalReviews,
      averageRating: platformAverageRating,
    },
    trends30Days: dailyTrends,
  };
}

module.exports = {
  safePercentage,
  calculateCourseProgress,
  getStudentAnalytics,
  getInstructorAnalytics,
  getAdminAnalytics,
};

