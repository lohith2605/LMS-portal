const express = require('express');
const router = express.Router();
const {
  getStudentOverview,
  getInstructorOverview,
} = require('../controllers/dashboardController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

// Student dashboard data (accessible by students and admin)
router.get('/student', protect, restrictTo('student', 'admin'), getStudentOverview);

// Instructor dashboard data (accessible by instructors and admin)
router.get('/instructor', protect, restrictTo('instructor', 'admin'), getInstructorOverview);

module.exports = router;
