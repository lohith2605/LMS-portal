const express = require('express');
const router = express.Router();
const {
  getOverview,
  getPendingInstructors,
  approveInstructor,
  rejectInstructor,
  getUsers,
  getPendingCourses,
  approveCourse,
  rejectCourse,
} = require('../controllers/adminController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

// All admin routes require authenticated session with admin role
router.use(protect);
router.use(restrictTo('admin'));

// Platform summary and analytics
router.get('/overview', getOverview);

// Instructor approval queue
router.get('/instructors/pending', getPendingInstructors);
router.patch('/instructors/:id/approve', approveInstructor);
router.patch('/instructors/:id/reject', rejectInstructor);

// Course moderation queue
router.get('/courses/pending', getPendingCourses);
router.patch('/courses/:id/approve', approveCourse);
router.patch('/courses/:id/reject', rejectCourse);

// User management
router.get('/users', getUsers);

module.exports = router;

