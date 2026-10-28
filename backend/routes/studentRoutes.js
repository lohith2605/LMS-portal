const express = require('express');
const router = express.Router();
const {
  getStudentEnrollments,
  getStudentCourse,
} = require('../controllers/enrollmentController');
const { getQuizAttemptResult } = require('../controllers/quizController');
const { getStudentCertificates } = require('../controllers/completionController');
const {
  getStudentAssignments,
  getStudentAssignmentDetails,
  uploadSubmissionFile,
  downloadStudentSubmissionFile,
  submitAssignment,
  getStudentSubmission,
  getStudentGrades,
} = require('../controllers/assignmentController');
const { getStudentAnalytics } = require('../controllers/analyticsController');
const { protect, restrictTo } = require('../middleware/authMiddleware');
const { uploadSingle } = require('../middleware/uploadMiddleware');

// All student routes require authentication and student (or admin) role
router.use(protect);
router.use(restrictTo('student', 'admin'));

// Phase 13: Learning Analytics
router.get('/analytics', getStudentAnalytics);

router.get('/enrollments', getStudentEnrollments);
router.get('/courses/:courseId', getStudentCourse);

// Student achievements and quiz reviews
router.get('/certificates', getStudentCertificates);
router.get('/quiz-attempts/:attemptId', getQuizAttemptResult);

// Phase 6: Student assignments and grades
router.get('/assignments', getStudentAssignments);
router.get('/assignments/:assignmentId', getStudentAssignmentDetails);
router.post('/assignments/:assignmentId/upload', uploadSingle('file'), uploadSubmissionFile);
router.post('/assignments/:assignmentId/submissions', submitAssignment);
router.get('/assignments/:assignmentId/my-submission', getStudentSubmission);
router.get('/submissions/:submissionId/files/:fileId/download', downloadStudentSubmissionFile);
router.get('/grades', getStudentGrades);

module.exports = router;
