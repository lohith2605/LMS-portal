const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/authMiddleware');
const {
  getUserAnnouncements,
  createCourseAnnouncement,
  getCourseAnnouncements,
  createPlatformAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  togglePinAnnouncement,
} = require('../controllers/announcementController');

// All announcement routes require authentication
router.use(protect);

// Retrieve all announcements visible to the current authenticated user
router.get('/', getUserAnnouncements);

// Specific course announcements via /api/announcements/course/:courseId
router.get('/course/:courseId', getCourseAnnouncements);
router.post('/course/:courseId', createCourseAnnouncement);

// Platform announcement creation via /api/announcements/platform (Admin only)
router.post('/platform', restrictTo('admin'), createPlatformAnnouncement);

// Manage specific announcement
router.patch('/:id/pin', togglePinAnnouncement);
router.patch('/:id', updateAnnouncement);
router.delete('/:id', deleteAnnouncement);

module.exports = router;

