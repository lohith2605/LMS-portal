const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  verifyCertificate,
  downloadCertificatePdf,
  retryCertificateEmail,
} = require('../controllers/completionController');

// Authenticated certificate PDF download endpoint (Owner or Admin only)
router.get('/:certificateId/download', protect, downloadCertificatePdf);

// Authenticated certificate email retry endpoint
router.post('/:certificateId/retry-email', protect, retryCertificateEmail);

// Public certificate verification endpoint (No authentication required)
router.get('/:certificateId', verifyCertificate);

module.exports = router;
