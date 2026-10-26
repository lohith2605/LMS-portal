const express = require('express');
const router = express.Router();
const { getHealthStatus } = require('../controllers/healthController');

/**
 * @route   GET /api/health
 * @desc    Get API server health and database connection status
 * @access  Public
 */
router.get('/', getHealthStatus);

module.exports = router;
