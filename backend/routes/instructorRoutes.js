const express = require('express');
const router = express.Router();
const {
  createCourse,
  getInstructorCourses,
  getInstructorCourseById,
  updateCourse,
  deleteCourse,
  submitForReview,
  addSection,
  updateSection,
  deleteSection,
  reorderSections,
  addLesson,
  updateLesson,
  deleteLesson,
  reorderLessons,
} = require('../controllers/instructorCourseController');
const {
  createQuiz,
  getInstructorCourseQuizzes,
  getInstructorQuizById,
  updateQuiz,
  publishQuiz,
  unpublishQuiz,
  deleteQuiz,
  getQuizAnalytics,
} = require('../controllers/quizController');
const {
  createAssignment,
  getInstructorCourseAssignments,
  getInstructorAssignmentById,
  updateAssignment,
  publishAssignment,
  archiveAssignment,
  deleteAssignment,
  getAssignmentSubmissions,
  getSubmissionById,
  gradeSubmission,
  returnSubmissionForRevision,
  downloadInstructorSubmissionFile,
} = require('../controllers/assignmentController');
const { getInstructorAnalytics } = require('../controllers/analyticsController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

// All instructor routes require authentication and instructor (or admin) role
router.use(protect);
router.use(restrictTo('instructor', 'admin'));

// Phase 13: Learning Analytics
router.get('/analytics', getInstructorAnalytics);

// Course lifecycle endpoints
router.post('/courses', createCourse);
router.get('/courses', getInstructorCourses);
router.get('/courses/:courseId', getInstructorCourseById);
router.patch('/courses/:courseId', updateCourse);
router.delete('/courses/:courseId', deleteCourse);
router.post('/courses/:courseId/submit-for-review', submitForReview);

// Section management endpoints
router.post('/courses/:courseId/sections', addSection);
router.patch('/courses/:courseId/sections/:sectionId', updateSection);
router.delete('/courses/:courseId/sections/:sectionId', deleteSection);
router.put('/courses/:courseId/sections/reorder', reorderSections);

// Lesson management endpoints
router.post('/courses/:courseId/sections/:sectionId/lessons', addLesson);
router.patch('/courses/:courseId/sections/:sectionId/lessons/:lessonId', updateLesson);
router.delete('/courses/:courseId/sections/:sectionId/lessons/:lessonId', deleteLesson);
router.put('/courses/:courseId/sections/:sectionId/lessons/reorder', reorderLessons);

// Quiz & Assessment authoring endpoints
router.post('/courses/:courseId/quizzes', createQuiz);
router.get('/courses/:courseId/quizzes', getInstructorCourseQuizzes);
router.get('/quizzes/:quizId', getInstructorQuizById);
router.patch('/quizzes/:quizId', updateQuiz);
router.delete('/quizzes/:quizId', deleteQuiz);
router.patch('/quizzes/:quizId/publish', publishQuiz);
router.patch('/quizzes/:quizId/unpublish', unpublishQuiz);
router.get('/quizzes/:quizId/analytics', getQuizAnalytics);

// Phase 6: Assignment authoring, submissions, and grading endpoints
router.post('/courses/:courseId/assignments', createAssignment);
router.get('/courses/:courseId/assignments', getInstructorCourseAssignments);
router.get('/assignments/:assignmentId', getInstructorAssignmentById);
router.patch('/assignments/:assignmentId', updateAssignment);
router.post('/assignments/:assignmentId/publish', publishAssignment);
router.patch('/assignments/:assignmentId/publish', publishAssignment);
router.patch('/assignments/:assignmentId/archive', archiveAssignment);
router.delete('/assignments/:assignmentId', deleteAssignment);
router.get('/assignments/:assignmentId/submissions', getAssignmentSubmissions);
router.get('/submissions/:submissionId', getSubmissionById);
router.get('/submissions/:submissionId/files/:fileId/download', downloadInstructorSubmissionFile);
router.patch('/submissions/:submissionId/grade', gradeSubmission);
router.post('/submissions/:submissionId/return-for-revision', returnSubmissionForRevision);

module.exports = router;
