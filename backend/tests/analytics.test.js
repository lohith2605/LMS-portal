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

  // Test 7: Case 1 & 2 - Instructor with one published course and one active enrollment reports 1 learner, 1 enrollment, and accurate lesson progress
  test('7. Instructor Analytics: One published course with one active enrollment reports 1 learner, 1 enrollment, and lesson progress', async () => {
    const instructorId = new mongoose.Types.ObjectId();
    const courseId = new mongoose.Types.ObjectId();
    const studentId = new mongoose.Types.ObjectId();
    const lesson1Id = new mongoose.Types.ObjectId();
    const lesson2Id = new mongoose.Types.ObjectId();

    const origCourseFind = Course.find;
    const origEnrollmentFind = Enrollment.find;
    const origAssignmentFind = Assignment.find;
    const origQuizFind = Quiz.find;

    try {
      Course.find = (query) => {
        assert.strictEqual(query.instructor.toString(), instructorId.toString());
        return {
          select: () => ({
            lean: () => Promise.resolve([
              {
                _id: courseId,
                title: 'HTML & CSS Foundations',
                slug: 'html-css',
                status: 'published',
                category: 'Development',
                sections: [
                  {
                    lessons: [
                      { _id: lesson1Id, isPublished: true },
                      { _id: lesson2Id, isPublished: true },
                    ],
                  },
                ],
              },
            ]),
          }),
        };
      };

      Enrollment.find = (query) => {
        assert.deepStrictEqual(query.course, { $in: [courseId] });
        assert.deepStrictEqual(query.status, { $in: ['active', 'completed'] });
        return {
          select: () => ({
            lean: () => Promise.resolve([
              {
                _id: new mongoose.Types.ObjectId(),
                course: courseId,
                student: studentId,
                status: 'active',
                isCompleted: false,
                completedLessons: [lesson1Id],
              },
            ]),
          }),
        };
      };

      Assignment.find = () => ({
        select: () => ({
          lean: () => Promise.resolve([]),
        }),
      });

      Quiz.find = () => ({
        select: () => ({
          lean: () => Promise.resolve([]),
        }),
      });

      const res = await analyticsService.getInstructorAnalytics(instructorId);

      assert.strictEqual(res.overview.totalCourses, 1);
      assert.strictEqual(res.overview.publishedCourses, 1);
      assert.strictEqual(res.overview.totalLearners, 1);
      assert.strictEqual(res.overview.totalEnrollments, 1);
      assert.strictEqual(res.overview.activeEnrollments, 1);
      assert.strictEqual(res.overview.completedEnrollments, 0);
      assert.strictEqual(res.overview.completionRate, 0);

      // Lesson progress tier: 1 / 2 = 50% -> tier26To50
      assert.strictEqual(res.progressDistribution.tier26To50, 1);
      assert.strictEqual(res.progressDistribution.tier0To25, 0);
      assert.strictEqual(res.progressDistribution.total, 1);
      assert.strictEqual(res.coursesPerformance[0].averageProgress, 50);
    } finally {
      Course.find = origCourseFind;
      Enrollment.find = origEnrollmentFind;
      Assignment.find = origAssignmentFind;
      Quiz.find = origQuizFind;
    }
  });

  // Test 8: Case 3 & 4 - 100% lesson progress without completion criteria is NOT marked completed; fully completed enrollment is counted
  test('8. Instructor Analytics: 100% lesson progress remains active unless formally completed', async () => {
    const instructorId = new mongoose.Types.ObjectId();
    const courseId = new mongoose.Types.ObjectId();
    const student1Id = new mongoose.Types.ObjectId();
    const student2Id = new mongoose.Types.ObjectId();
    const lessonId = new mongoose.Types.ObjectId();

    const origCourseFind = Course.find;
    const origEnrollmentFind = Enrollment.find;
    const origAssignmentFind = Assignment.find;
    const origQuizFind = Quiz.find;

    try {
      Course.find = () => ({
        select: () => ({
          lean: () => Promise.resolve([
            {
              _id: courseId,
              title: 'JavaScript Essentials',
              status: 'published',
              sections: [{ lessons: [{ _id: lessonId, isPublished: true }] }],
            },
          ]),
        }),
      });

      Enrollment.find = () => ({
        select: () => ({
          lean: () => Promise.resolve([
            // Student 1: 100% progress (1/1 lesson) but has not claimed certificate / satisfied mandatory quizzes
            {
              _id: new mongoose.Types.ObjectId(),
              course: courseId,
              student: student1Id,
              status: 'active',
              isCompleted: false,
              completedLessons: [lessonId],
            },
            // Student 2: Formal course completion with certificate issued
            {
              _id: new mongoose.Types.ObjectId(),
              course: courseId,
              student: student2Id,
              status: 'completed',
              isCompleted: true,
              certificateIssued: true,
              completedLessons: [lessonId],
            },
          ]),
        }),
      });

      Assignment.find = () => ({ select: () => ({ lean: () => Promise.resolve([]) }) });
      Quiz.find = () => ({ select: () => ({ lean: () => Promise.resolve([]) }) });

      const res = await analyticsService.getInstructorAnalytics(instructorId);

      assert.strictEqual(res.overview.totalLearners, 2);
      assert.strictEqual(res.overview.totalEnrollments, 2);
      assert.strictEqual(res.overview.activeEnrollments, 1, 'Uncompleted student with 100% lessons must remain active');
      assert.strictEqual(res.overview.completedEnrollments, 1, 'Only formally completed enrollment counts as completed');
      assert.strictEqual(res.overview.completionRate, 50); // 1 / 2 = 50%

      // Both students fall into Tier 76-100%
      assert.strictEqual(res.progressDistribution.tier76To100, 2);
      assert.strictEqual(res.coursesPerformance[0].activeStudents, 1);
      assert.strictEqual(res.coursesPerformance[0].completedStudents, 1);
    } finally {
      Course.find = origCourseFind;
      Enrollment.find = origEnrollmentFind;
      Assignment.find = origAssignmentFind;
      Quiz.find = origQuizFind;
    }
  });

  // Test 9: Case 5 & 6 & 7 - Unique learner counting, exclusion of other instructors' courses, and exclusion of dropped enrollments
  test('9. Instructor Analytics: Unique student counting across multiple courses & exclusion of dropped / external courses', async () => {
    const instructor1Id = new mongoose.Types.ObjectId();
    const c1Id = new mongoose.Types.ObjectId();
    const c2Id = new mongoose.Types.ObjectId();
    const cExternalId = new mongoose.Types.ObjectId();
    const sameStudentId = new mongoose.Types.ObjectId();

    const origCourseFind = Course.find;
    const origEnrollmentFind = Enrollment.find;
    const origAssignmentFind = Assignment.find;
    const origQuizFind = Quiz.find;

    try {
      Course.find = (query) => {
        // Only return courses owned by instructor1Id
        if (query.instructor.toString() === instructor1Id.toString()) {
          return {
            select: () => ({
              lean: () => Promise.resolve([
                { _id: c1Id, title: 'Course 1', status: 'published', sections: [] },
                { _id: c2Id, title: 'Course 2', status: 'published', sections: [] },
              ]),
            }),
          };
        }
        return { select: () => ({ lean: () => Promise.resolve([]) }) };
      };

      Enrollment.find = (query) => {
        // Must exclude dropped enrollments
        assert.deepStrictEqual(query.status, { $in: ['active', 'completed'] });
        // Must query only instructor1's courses
        const targetIds = query.course.$in.map((id) => id.toString());
        assert.ok(targetIds.includes(c1Id.toString()));
        assert.ok(targetIds.includes(c2Id.toString()));
        assert.ok(!targetIds.includes(cExternalId.toString()));

        return {
          select: () => ({
            lean: () => Promise.resolve([
              // Same student enrolled in Course 1
              { _id: 'e1', course: c1Id, student: sameStudentId, status: 'active', isCompleted: false, completedLessons: [] },
              // Same student enrolled in Course 2
              { _id: 'e2', course: c2Id, student: sameStudentId, status: 'active', isCompleted: false, completedLessons: [] },
            ]),
          }),
        };
      };

      Assignment.find = () => ({ select: () => ({ lean: () => Promise.resolve([]) }) });
      Quiz.find = () => ({ select: () => ({ lean: () => Promise.resolve([]) }) });

      const res = await analyticsService.getInstructorAnalytics(instructor1Id);

      // Student enrolled in 2 courses counts as 1 Total Learner, but 2 Total Enrollments
      assert.strictEqual(res.overview.totalLearners, 1, 'Duplicate student across courses must be deduplicated in totalLearners');
      assert.strictEqual(res.overview.totalEnrollments, 2, 'Total enrollments must count each course enrollment');
      assert.strictEqual(res.overview.activeEnrollments, 2);
    } finally {
      Course.find = origCourseFind;
      Enrollment.find = origEnrollmentFind;
      Assignment.find = origAssignmentFind;
      Quiz.find = origQuizFind;
    }
  });

  // Test 10: Case 8 - Empty course / enrollment portfolio returns safe zero structure
  test('10. Instructor Analytics: Empty course portfolio returns safe zero-valued structure without error', async () => {
    const emptyInstructorId = new mongoose.Types.ObjectId();
    const origCourseFind = Course.find;

    try {
      Course.find = () => ({
        select: () => ({
          lean: () => Promise.resolve([]),
        }),
      });

      const res = await analyticsService.getInstructorAnalytics(emptyInstructorId);

      assert.strictEqual(res.overview.totalCourses, 0);
      assert.strictEqual(res.overview.publishedCourses, 0);
      assert.strictEqual(res.overview.totalLearners, 0);
      assert.strictEqual(res.overview.totalEnrollments, 0);
      assert.strictEqual(res.overview.activeEnrollments, 0);
      assert.strictEqual(res.overview.completedEnrollments, 0);
      assert.strictEqual(res.overview.completionRate, 0);
      assert.strictEqual(res.progressDistribution.total, 0);
      assert.strictEqual(res.coursesPerformance.length, 0);
    } finally {
      Course.find = origCourseFind;
    }
  });

  // Test 11: Case 9 - Analytics Controller correctly extracts req.user.id and returns HTTP 200 with success & data
  test('11. Analytics Controller: Successfully extracts req.user.id (from sanitizeUser) and returns 200 shape', async () => {
    const instructorId = new mongoose.Types.ObjectId().toString();
    // Simulate real sanitizeUser output: contains 'id', but may omit '_id'
    const mockReq = {
      user: {
        id: instructorId,
        name: 'Professor Turing',
        role: 'instructor',
      },
    };

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

    const origGetInstructorAnalytics = analyticsService.getInstructorAnalytics;
    try {
      let passedId = null;
      analyticsService.getInstructorAnalytics = async (id) => {
        passedId = id;
        return {
          overview: { totalCourses: 2, totalLearners: 5 },
          coursesPerformance: [],
        };
      };

      await analyticsController.getInstructorAnalytics(mockReq, mockRes);

      assert.strictEqual(capturedStatus, 200);
      assert.strictEqual(capturedJson.success, true);
      assert.strictEqual(capturedJson.data.overview.totalCourses, 2);
      assert.strictEqual(passedId, instructorId, 'Controller must pass req.user.id to analytics service');
    } finally {
      analyticsService.getInstructorAnalytics = origGetInstructorAnalytics;
    }
  });

  // Test 12: Case 10 - Assignment and Quiz counts are accurately scoped to owned courses
  test('12. Instructor Analytics: Assignment & quiz counts are isolated strictly to owned courses', async () => {
    const instructorId = new mongoose.Types.ObjectId();
    const ownedCourseId = new mongoose.Types.ObjectId();

    const origCourseFind = Course.find;
    const origEnrollmentFind = Enrollment.find;
    const origAssignmentFind = Assignment.find;
    const origSubmissionFind = AssignmentSubmission.find;
    const origQuizFind = Quiz.find;
    const origQuizAttemptFind = QuizAttempt.find;

    try {
      Course.find = () => ({
        select: () => ({
          lean: () => Promise.resolve([
            { _id: ownedCourseId, title: 'Database Design', status: 'published', sections: [] },
          ]),
        }),
      });

      Enrollment.find = () => ({
        select: () => ({
          lean: () => Promise.resolve([]),
        }),
      });

      const assign1Id = new mongoose.Types.ObjectId();
      Assignment.find = (query) => {
        // Verify only owned course IDs are queried
        assert.deepStrictEqual(query.course, { $in: [ownedCourseId] });
        return {
          select: () => ({
            lean: () => Promise.resolve([
              { _id: assign1Id, title: 'SQL Schema', maxMarks: 50, course: ownedCourseId },
            ]),
          }),
        };
      };

      AssignmentSubmission.find = (query) => {
        assert.deepStrictEqual(query.assignment, { $in: [assign1Id] });
        return {
          select: () => ({
            lean: () => Promise.resolve([
              { _id: 'sub_1', assignment: assign1Id, status: 'submitted', grade: null },
            ]),
          }),
        };
      };

      const quiz1Id = new mongoose.Types.ObjectId();
      Quiz.find = (query) => {
        assert.deepStrictEqual(query.course, { $in: [ownedCourseId] });
        return {
          select: () => ({
            lean: () => Promise.resolve([
              { _id: quiz1Id, title: 'Normalization Quiz', passingPercentage: 80 },
            ]),
          }),
        };
      };

      QuizAttempt.find = (query) => {
        assert.deepStrictEqual(query.quiz, { $in: [quiz1Id] });
        return {
          select: () => ({
            lean: () => Promise.resolve([
              { _id: 'att_1', quiz: quiz1Id, percentage: 90, passed: true },
            ]),
          }),
        };
      };

      const res = await analyticsService.getInstructorAnalytics(instructorId);

      assert.strictEqual(res.assignmentStats.totalAssignments, 1);
      assert.strictEqual(res.assignmentStats.totalSubmissions, 1);
      assert.strictEqual(res.assignmentStats.pendingGrading, 1);
      assert.strictEqual(res.quizStats.totalQuizzes, 1);
      assert.strictEqual(res.quizStats.totalAttempts, 1);
      assert.strictEqual(res.quizStats.passedAttempts, 1);
      assert.strictEqual(res.quizStats.passRate, 100);
    } finally {
      Course.find = origCourseFind;
      Enrollment.find = origEnrollmentFind;
      Assignment.find = origAssignmentFind;
      AssignmentSubmission.find = origSubmissionFind;
      Quiz.find = origQuizFind;
      QuizAttempt.find = origQuizAttemptFind;
    }
  });
});
