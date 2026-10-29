const express = require('express');
const router = express.Router();
const { submitContactMessage } = require('../controllers/contactController');
const { contactLimiter } = require('../middleware/rateLimiter');

// Public Contact Form Submission Endpoint
router.post('/', contactLimiter, submitContactMessage);

module.exports = router;
