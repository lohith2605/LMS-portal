const express = require('express');
const router = express.Router();
const {
  getCourseDiscussions,
  createDiscussion,
  getDiscussionById,
  updateDiscussion,
  deleteDiscussion,
  createReply,
  updateReply,
  deleteReply,
  toggleAcceptedAnswer,
  togglePinDiscussion,
  toggleLockDiscussion,
} = require('../controllers/discussionController');
const { protect } = require('../middleware/authMiddleware');

// All discussion routes require an authenticated user session
router.use(protect);

// Course-scoped discussion list and creation
router.get('/course/:idOrSlug', getCourseDiscussions);
router.post('/course/:idOrSlug', createDiscussion);

// Single discussion details, editing, and soft-deletion
router.get('/:id', getDiscussionById);
router.patch('/:id', updateDiscussion);
router.delete('/:id', deleteDiscussion);

// Moderation: Pinning and Locking
router.patch('/:id/pin', togglePinDiscussion);
router.patch('/:id/lock', toggleLockDiscussion);

// Replies: Creation, editing, soft-deletion, and accepted answer toggle
router.post('/:id/replies', createReply);
router.patch('/:id/replies/:replyId', updateReply);
router.delete('/:id/replies/:replyId', deleteReply);
router.patch('/:id/replies/:replyId/accept', toggleAcceptedAnswer);

module.exports = router;

