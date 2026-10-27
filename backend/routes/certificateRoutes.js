const express = require('express');
const router = express.Router();
const { verifyCertificate } = require('../controllers/completionController');

// Public certificate verification endpoint (No authentication required)
router.get('/:certificateId', verifyCertificate);

module.exports = router;
