const express = require('express');
const router = express.Router();
const {
  getCourses,
  getCourseByIdOrSlug,
  getLessonContent,
  toggleLessonComplete,
} = require('../controllers/courseController');
const { enrollInCourse } = require('../controllers/enrollmentController');
const {
  getCourseQuizzes,
  getQuizForAttempt,
  startQuizAttempt,
  submitQuizAttempt,
  getStudentQuizAttempts,
} = require('../controllers/quizController');
const {
  getCourseCompletionStatus,
  claimCertificate,
} = require('../controllers/completionController');
const { getCourseAssignments } = require('../controllers/assignmentController');
const {
  getCourseDiscussions,
  createDiscussion,
} = require('../controllers/discussionController');
const {
  getCourseReviews,
  getMyReview,
  createReview,
  updateReview,
  deleteReview,
} = require('../controllers/reviewController');
const { protect, restrictTo, optionalProtect } = require('../middleware/authMiddleware');

// Public & authenticated course browsing
router.get('/', optionalProtect, getCourses);
router.get('/:idOrSlug', optionalProtect, getCourseByIdOrSlug);

// Protected lesson viewer (requires enrollment or course instructor/admin)
router.get('/:idOrSlug/lessons/:lessonId', protect, getLessonContent);

// Student enrollment endpoint
router.post('/:courseId/enroll', protect, restrictTo('student', 'admin'), enrollInCourse);

// Toggle lesson completion status
router.post(
  '/:courseId/lessons/:lessonId/complete',
  protect,
  restrictTo('student', 'admin'),
  toggleLessonComplete
);

// Student Quizzes & Assessment endpoints
router.get('/:idOrSlug/quizzes', protect, getCourseQuizzes);
router.get('/:idOrSlug/quizzes/:quizId', protect, getQuizForAttempt);
router.post('/:idOrSlug/quizzes/:quizId/start', protect, startQuizAttempt);
router.post(
  '/:idOrSlug/quizzes/:quizId/attempts/:attemptId/submit',
  protect,
  submitQuizAttempt
);
router.get('/:idOrSlug/quizzes/:quizId/attempts', protect, getStudentQuizAttempts);

// Course completion & certificate issuance
router.get('/:idOrSlug/completion-status', protect, getCourseCompletionStatus);
router.post('/:idOrSlug/claim-certificate', protect, claimCertificate);

// Course assignments
router.get('/:idOrSlug/assignments', protect, getCourseAssignments);

// Phase 7: Course Discussion Forum & Q&A
router.get('/:idOrSlug/discussions', protect, getCourseDiscussions);
router.post('/:idOrSlug/discussions', protect, createDiscussion);

// Phase 12: Course Ratings & Reviews
router.get('/:idOrSlug/reviews', optionalProtect, getCourseReviews);
router.get('/:idOrSlug/reviews/my-review', protect, getMyReview);
router.post('/:idOrSlug/reviews', protect, createReview);
router.patch('/:idOrSlug/reviews/:reviewId', protect, updateReview);
router.delete('/:idOrSlug/reviews/:reviewId', protect, deleteReview);

module.exports = router;
