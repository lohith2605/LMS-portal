const test = require('node:test');
const assert = require('node:assert');
const mongoose = require('mongoose');
const analyticsService = require('../services/analyticsService');
const analyticsController = require('../controllers/analyticsController');
const User = require('../models/User');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const Assignment = require('../models/Assignment');
const AssignmentSubmission = require('../models/AssignmentSubmission');
const Quiz = require('../models/Quiz');
const QuizAttempt = require('../models/QuizAttempt');
const Certificate = require('../models/Certificate');
const Review = require('../models/Review');

test.describe('Phase 13: Learning Analytics Suite', () => {
  // Test 1: safePercentage utility
  test('1. safePercentage handles zero denominators and limits safely', () => {
    assert.strictEqual(analyticsService.safePercentage(0, 0), 0);
    assert.strictEqual(analyticsService.safePercentage(5, 0), 0);
    assert.strictEqual(analyticsService.safePercentage(null, 10), 0);
    assert.strictEqual(analyticsService.safePercentage(5, 10), 50);
    assert.strictEqual(analyticsService.safePercentage(1, 3), 33);
    assert.strictEqual(analyticsService.safePercentage(120, 100), 100); // capped at 100
  });

  // Test 2: calculateCourseProgress helper
  test('2. calculateCourseProgress calculates progress and ignores unpublished lessons', () => {
    const course = {
      sections: [
        {
          lessons: [
            { _id: new mongoose.Types.ObjectId(), isPublished: true },
            { _id: new mongoose.Types.ObjectId(), isPublished: true },
            { _id: new mongoose.Types.ObjectId(), isPublished: false }, // draft lesson ignored
          ],
        },
        {
          lessons: [
            { _id: new mongoose.Types.ObjectId(), isPublished: true },
          ],
        },
      ],
    };

    const enrollmentPartial = {
      completedLessons: [course.sections[0].lessons[0]._id],
      isCompleted: false,
    };

    const res = analyticsService.calculateCourseProgress(enrollmentPartial, course);
    assert.strictEqual(res.totalLessons, 3);
    assert.strictEqual(res.completedCount, 1);
    assert.strictEqual(res.progressPercent, 33); // 1 / 3 = 33%

    const enrollmentEmptyCourse = {
      completedLessons: [],
      isCompleted: true,
      status: 'completed',
    };
    const resEmpty = analyticsService.calculateCourseProgress(enrollmentEmptyCourse, { sections: [] });
    assert.strictEqual(resEmpty.totalLessons, 0);
    assert.strictEqual(resEmpty.progressPercent, 100);
  });

  // Test 3: getStudentAnalytics
  test('3. getStudentAnalytics correctly calculates progress, quizzes, and excludes dropped enrollments', async () => {
    const studentId = new mongoose.Types.ObjectId();
    const courseId1 = new mongoose.Types.ObjectId();
    const courseId2 = new mongoose.Types.ObjectId();

    const originalEnrollmentFind = Enrollment.find;
    const originalAssignmentFind = Assignment.find;
    const originalSubmissionFind = AssignmentSubmission.find;
    const originalQuizAttemptFind = QuizAttempt.find;
    const originalCertificateFind = Certificate.find;

    try {
      // Mock enrollments (active + completed)
      Enrollment.find = (query) => {
        // Verify dropped status is excluded
        assert.deepStrictEqual(query.status, { $in: ['active', 'completed'] });
        assert.strictEqual(query.student.toString(), studentId.toString());

        return {
          populate: () => ({
            lean: () => Promise.resolve([
              {
                _id: 'enr_1',
                student: studentId,
                status: 'active',
                isCompleted: false,
                completedLessons: ['l1', 'l2'],
                lastAccessedAt: new Date('2026-10-28T10:00:00Z'),
                course: {
                  _id: courseId1,
                  title: 'React Fundamentals',
                  slug: 'react-fundamentals',
                  category: 'Development',
                  sections: [
                    { lessons: [{ _id: 'l1', isPublished: true }, { _id: 'l2', isPublished: true }, { _id: 'l3', isPublished: true }, { _id: 'l4', isPublished: true }] },
                  ],
                },
              },
              {
                _id: 'enr_2',
                student: studentId,
                status: 'completed',
                isCompleted: true,
                completedLessons: ['l5', 'l6'],
                lastAccessedAt: new Date('2026-10-27T10:00:00Z'),
                course: {
                  _id: courseId2,
                  title: 'Node Mastery',
                  slug: 'node-mastery',
                  category: 'Development',
                  sections: [
                    { lessons: [{ _id: 'l5', isPublished: true }, { _id: 'l6', isPublished: true }] },
                  ],
                },
              },
            ]),
          }),
        };
      };

      // Mock assignments
      const assignId = new mongoose.Types.ObjectId();
      Assignment.find = () => ({
        select: () => ({
          lean: () => Promise.resolve([
            { _id: assignId, title: 'Build an API', maxMarks: 100, course: courseId2 },
          ]),
        }),
      });

      // Mock assignment submissions
      AssignmentSubmission.find = () => ({
        select: () => ({
          lean: () => Promise.resolve([
            { _id: 'sub_1', assignment: assignId, status: 'graded', grade: 90, submittedAt: new Date('2026-10-28T09:00:00Z') },
          ]),
        }),
      });

      // Mock quiz attempts with score differentiation (best vs latest vs average)
      const quizId = new mongoose.Types.ObjectId();
      QuizAttempt.find = () => ({
        populate: () => ({
          sort: () => ({
            lean: () => Promise.resolve([
              // Attempt 1: 60%
              { _id: 'att_1', quiz: { _id: quizId, title: 'Node Quiz' }, percentage: 60, passed: false, submittedAt: new Date('2026-10-26T12:00:00Z') },
              // Attempt 2: 95% (best)
              { _id: 'att_2', quiz: { _id: quizId, title: 'Node Quiz' }, percentage: 95, passed: true, submittedAt: new Date('2026-10-27T12:00:00Z') },
              // Attempt 3: 80% (latest)
              { _id: 'att_3', quiz: { _id: quizId, title: 'Node Quiz' }, percentage: 80, passed: true, submittedAt: new Date('2026-10-28T12:00:00Z') },
            ]),
          }),
        }),
      });

      // Mock certificates
      Certificate.find = () => ({
        populate: () => ({
          sort: () => ({
            lean: () => Promise.resolve([
              { _id: 'cert_1', certificateId: 'CERT-12345', course: { title: 'Node Mastery', slug: 'node-mastery' }, issuedAt: new Date('2026-10-27T15:00:00Z') },
            ]),
          }),
        }),
      });

      const res = await analyticsService.getStudentAnalytics(studentId);

      // Verify overview
      assert.strictEqual(res.overview.totalEnrolled, 2);
      assert.strictEqual(res.overview.activeCourses, 1);
      assert.strictEqual(res.overview.completedCourses, 1);
      assert.strictEqual(res.overview.certificatesEarned, 1);
      // Course 1 is 50% (2/4), Course 2 is 100% (2/2) -> average = 75%
      assert.strictEqual(res.overview.averageCourseProgress, 75);

      // Verify assignment stats
      assert.strictEqual(res.assignments.totalAssigned, 1);
      assert.strictEqual(res.assignments.submittedCount, 1);
      assert.strictEqual(res.assignments.gradedCount, 1);
      assert.strictEqual(res.assignments.averageGrade, 90);
      assert.strictEqual(res.assignments.submissionRate, 100);

      // Verify quiz stats & differentiation
      assert.strictEqual(res.quizzes.totalAttempts, 3);
      assert.strictEqual(res.quizzes.quizzesAttempted, 1);
      assert.strictEqual(res.quizzes.quizzesPassed, 1);
      assert.strictEqual(res.quizzes.bestScore, 95);
      assert.strictEqual(res.quizzes.latestScore, 80);
      assert.strictEqual(res.quizzes.averageScore, 78); // (60 + 95 + 80) / 3 = 78.33 -> 78%

      // Verify recent activities timeline (sorted descending)
      assert.ok(res.recentActivities.length > 0);
      for (let i = 0; i < res.recentActivities.length - 1; i++) {
        assert.ok(res.recentActivities[i].date.getTime() >= res.recentActivities[i + 1].date.getTime());
      }
    } finally {
      Enrollment.find = originalEnrollmentFind;
      Assignment.find = originalAssignmentFind;
      AssignmentSubmission.find = originalSubmissionFind;
      QuizAttempt.find = originalQuizAttemptFind;
      Certificate.find = originalCertificateFind;
    }
  });

  // Test 4: getInstructorAnalytics
  test('4. getInstructorAnalytics isolates courses to authenticated instructor and generates cohort distributions', async () => {
    const instructorId = new mongoose.Types.ObjectId();
    const courseId = new mongoose.Types.ObjectId();

    const originalCourseFind = Course.find;
    const originalEnrollmentFind = Enrollment.find;
    const originalAssignmentFind = Assignment.find;
    const originalSubmissionFind = AssignmentSubmission.find;
    const originalQuizFind = Quiz.find;
    const originalQuizAttemptFind = QuizAttempt.find;

    try {
      Course.find = (query) => {
        // Strictly verify instructor ownership isolation
        assert.strictEqual(query.instructor.toString(), instructorId.toString());
        return {
          select: () => ({
            lean: () => Promise.resolve([
              {
                _id: courseId,
                title: 'Fullstack Bootcamp',
                slug: 'fullstack-bootcamp',
                status: 'published',
                category: 'Development',
                sections: [
                  { lessons: [{ _id: 'l1' }, { _id: 'l2' }, { _id: 'l3' }, { _id: 'l4' }] },
                ],
              },
            ]),
          }),
        };
      };

      Enrollment.find = () => ({
        select: () => ({
          lean: () => Promise.resolve([
            // Student 1: 25% (tier 0-25)
            { _id: 'e1', course: courseId, student: 's1', status: 'active', isCompleted: false, completedLessons: ['l1'] },
            // Student 2: 50% (tier 26-50)
            { _id: 'e2', course: courseId, student: 's2', status: 'active', isCompleted: false, completedLessons: ['l1', 'l2'] },
            // Student 3: 75% (tier 51-75)
            { _id: 'e3', course: courseId, student: 's3', status: 'active', isCompleted: false, completedLessons: ['l1', 'l2', 'l3'] },
            // Student 4: 100% (tier 76-100)
            { _id: 'e4', course: courseId, student: 's4', status: 'completed', isCompleted: true, completedLessons: ['l1', 'l2', 'l3', 'l4'] },
          ]),
        }),
      });

      const assignId = new mongoose.Types.ObjectId();
      Assignment.find = () => ({
        select: () => ({
          lean: () => Promise.resolve([
            { _id: assignId, title: 'Capstone Project', maxMarks: 100, course: courseId },
          ]),
        }),
      });

      AssignmentSubmission.find = () => ({
        select: () => ({
          lean: () => Promise.resolve([
            { _id: 'sub_1', assignment: assignId, status: 'submitted', grade: null }, // pending grading
            { _id: 'sub_2', assignment: assignId, status: 'graded', grade: 80 },
          ]),
        }),
      });

      const quizId = new mongoose.Types.ObjectId();
      Quiz.find = () => ({
        select: () => ({
          lean: () => Promise.resolve([
            { _id: quizId, title: 'React Quiz', passingPercentage: 70 },
          ]),
        }),
      });

      QuizAttempt.find = () => ({
        select: () => ({
          lean: () => Promise.resolve([
            { _id: 'qa1', quiz: quizId, percentage: 85, passed: true },
            { _id: 'qa2', quiz: quizId, percentage: 50, passed: false },
          ]),
        }),
      });

      const res = await analyticsService.getInstructorAnalytics(instructorId);

      // Verify overview & ownership
      assert.strictEqual(res.overview.totalCourses, 1);
      assert.strictEqual(res.overview.publishedCourses, 1);
      assert.strictEqual(res.overview.totalLearners, 4);
      assert.strictEqual(res.overview.totalEnrollments, 4);
      assert.strictEqual(res.overview.activeEnrollments, 3);
      assert.strictEqual(res.overview.completedEnrollments, 1);
      assert.strictEqual(res.overview.completionRate, 25); // 1 / 4 = 25%

      // Verify progress distribution tiers
      assert.strictEqual(res.progressDistribution.tier0To25, 1);
      assert.strictEqual(res.progressDistribution.tier26To50, 1);
      assert.strictEqual(res.progressDistribution.tier51To75, 1);
      assert.strictEqual(res.progressDistribution.tier76To100, 1);
      assert.strictEqual(res.progressDistribution.total, 4);

      // Verify assignment grading velocity
      assert.strictEqual(res.assignmentStats.totalAssignments, 1);
      assert.strictEqual(res.assignmentStats.totalSubmissions, 2);
      assert.strictEqual(res.assignmentStats.pendingGrading, 1);
      assert.strictEqual(res.assignmentStats.gradedSubmissions, 1);
      assert.strictEqual(res.assignmentStats.averageGrade, 80);

      // Verify quiz stats
      assert.strictEqual(res.quizStats.totalQuizzes, 1);
      assert.strictEqual(res.quizStats.totalAttempts, 2);
      assert.strictEqual(res.quizStats.passedAttempts, 1);
      assert.strictEqual(res.quizStats.passRate, 50);
      assert.strictEqual(res.quizStats.averageScore, 68); // (85 + 50) / 2 = 67.5 -> 68%

      // Verify per-course comparison list
      assert.strictEqual(res.coursesPerformance.length, 1);
      assert.strictEqual(res.coursesPerformance[0].activeStudents, 3);
      assert.strictEqual(res.coursesPerformance[0].completedStudents, 1);
    } finally {
      Course.find = originalCourseFind;
      Enrollment.find = originalEnrollmentFind;
      Assignment.find = originalAssignmentFind;
      AssignmentSubmission.find = originalSubmissionFind;
      Quiz.find = originalQuizFind;
      QuizAttempt.find = originalQuizAttemptFind;
    }
  });

  // Test 5: getAdminAnalytics
  test('5. getAdminAnalytics aggregates platform metrics and fills 30-day daily trends', async () => {
    const originalUserAgg = User.aggregate;
    const originalCourseAgg = Course.aggregate;
    const originalEnrollmentAgg = Enrollment.aggregate;
    const originalAssignmentCount = Assignment.countDocuments;
    const originalSubmissionAgg = AssignmentSubmission.aggregate;
    const originalQuizCount = Quiz.countDocuments;
    const originalQuizAgg = QuizAttempt.aggregate;
    const originalCertCount = Certificate.countDocuments;
    const originalReviewAgg = Review.aggregate;

    try {
      User.aggregate = (pipeline) => {
        // If grouping by createdAt for 30 days
        if (JSON.stringify(pipeline).includes('$dateToString')) {
          return Promise.resolve([{ _id: new Date().toISOString().split('T')[0], count: 3 }]);
        }
        if (JSON.stringify(pipeline).includes('$role')) {
          return Promise.resolve([
            { _id: 'student', count: 10 },
            { _id: 'instructor', count: 2 },
            { _id: 'admin', count: 1 },
          ]);
        }
        if (JSON.stringify(pipeline).includes('$accountStatus')) {
          return Promise.resolve([
            { _id: 'active', count: 12 },
            { _id: 'pending', count: 1 },
          ]);
        }
        return Promise.resolve([]);
      };

      Course.aggregate = (pipeline) => {
        if (JSON.stringify(pipeline).includes('$status')) {
          return Promise.resolve([
            { _id: 'published', count: 5 },
            { _id: 'draft', count: 2 },
          ]);
        }
        if (JSON.stringify(pipeline).includes('$category')) {
          return Promise.resolve([
            { _id: 'Development', count: 4 },
            { _id: 'Design', count: 3 },
          ]);
        }
        return Promise.resolve([]);
      };

      Enrollment.aggregate = (pipeline) => {
        if (JSON.stringify(pipeline).includes('$dateToString')) {
          return Promise.resolve([{ _id: new Date().toISOString().split('T')[0], count: 5 }]);
        }
        return Promise.resolve([
          { _id: 'active', count: 15 },
          { _id: 'completed', count: 5 },
          { _id: 'dropped', count: 2 },
        ]);
      };

      Assignment.countDocuments = () => Promise.resolve(8);
      AssignmentSubmission.aggregate = () => Promise.resolve([
        { _id: 'graded', count: 10, avgGrade: 85 },
        { _id: 'submitted', count: 4, avgGrade: null },
      ]);

      Quiz.countDocuments = () => Promise.resolve(4);
      QuizAttempt.aggregate = () => Promise.resolve([
        { _id: null, totalAttempts: 20, passedAttempts: 16, avgPercentage: 82.5 },
      ]);

      Certificate.countDocuments = () => Promise.resolve(5);
      Review.aggregate = () => Promise.resolve([
        { _id: null, totalReviews: 7, avgRating: 4.8 },
      ]);

      const res = await analyticsService.getAdminAnalytics();

      // Users
      assert.strictEqual(res.users.byRole.total, 13);
      assert.strictEqual(res.users.byRole.student, 10);
      assert.strictEqual(res.users.byRole.instructor, 2);
      assert.strictEqual(res.users.byRole.admin, 1);
      assert.strictEqual(res.users.byStatus.active, 12);

      // Courses
      assert.strictEqual(res.courses.byStatus.published, 5);
      assert.strictEqual(res.courses.byStatus.draft, 2);
      assert.strictEqual(res.courses.byCategory.Development, 4);

      // Enrollments
      assert.strictEqual(res.enrollments.total, 22);
      assert.strictEqual(res.enrollments.active, 15);
      assert.strictEqual(res.enrollments.completed, 5);
      assert.strictEqual(res.enrollments.dropped, 2);
      assert.strictEqual(res.enrollments.completionRate, 25); // 5 / (15 + 5) = 25%

      // Assessments
      assert.strictEqual(res.assessments.totalAssignments, 8);
      assert.strictEqual(res.assessments.totalSubmissions, 14);
      assert.strictEqual(res.assessments.gradedSubmissions, 10);
      assert.strictEqual(res.assessments.averageAssignmentGrade, 85);
      assert.strictEqual(res.assessments.totalQuizzes, 4);
      assert.strictEqual(res.assessments.totalQuizAttempts, 20);
      assert.strictEqual(res.assessments.passRate, 80); // 16 / 20 = 80%

      // Quality & Credentials
      assert.strictEqual(res.qualityAndCredentials.totalCertificatesIssued, 5);
      assert.strictEqual(res.qualityAndCredentials.totalReviews, 7);
      assert.strictEqual(res.qualityAndCredentials.averageRating, 4.8);

      // 30-day time series trends
      assert.strictEqual(res.trends30Days.length, 30);
      const todayStr = new Date().toISOString().split('T')[0];
      const todayEntry = res.trends30Days.find((t) => t.date === todayStr);
      assert.ok(todayEntry);
      assert.strictEqual(todayEntry.registrations, 3);
      assert.strictEqual(todayEntry.enrollments, 5);
    } finally {
      User.aggregate = originalUserAgg;
      Course.aggregate = originalCourseAgg;
      Enrollment.aggregate = originalEnrollmentAgg;
      Assignment.countDocuments = originalAssignmentCount;
      AssignmentSubmission.aggregate = originalSubmissionAgg;
      Quiz.countDocuments = originalQuizCount;
      QuizAttempt.aggregate = originalQuizAgg;
      Certificate.countDocuments = originalCertCount;
      Review.aggregate = originalReviewAgg;
    }
  });

  // Test 6: Controller Handlers
  test('6. Controller handlers return structured responses and handle errors safely', async () => {
    const mockReq = { user: { _id: new mongoose.Types.ObjectId() } };
    let capturedStatus = null;
    let capturedJson = null;

    const mockRes = {
      status(code) {
        capturedStatus = code;
        return this;
      },
      json(data) {
        capturedJson = data;
        return this;
      },
    };

    const originalGetStudentAnalytics = analyticsService.getStudentAnalytics;
    try {
      // Success path
      analyticsService.getStudentAnalytics = async () => ({
        overview: { totalEnrolled: 3, averageCourseProgress: 85 },
      });

      await analyticsController.getStudentAnalytics(mockReq, mockRes);
      assert.strictEqual(capturedStatus, 200);
      assert.strictEqual(capturedJson.success, true);
      assert.strictEqual(capturedJson.data.overview.totalEnrolled, 3);

      // Error path
      analyticsService.getStudentAnalytics = async () => {
        throw new Error('Database connection failed');
      };

      await analyticsController.getStudentAnalytics(mockReq, mockRes);
      assert.strictEqual(capturedStatus, 500);
      assert.strictEqual(capturedJson.success, false);
      assert.strictEqual(capturedJson.error, 'Failed to retrieve student analytics');
    } finally {
      analyticsService.getStudentAnalytics = originalGetStudentAnalytics;
    }
  });
});
