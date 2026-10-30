const express = require('express');
const router = express.Router();
const { getTestimonials } = require('../controllers/reviewController');

// GET /api/reviews/testimonials - Public verified student testimonials
router.get('/testimonials', getTestimonials);

module.exports = router;

