const express = require('express');
const router = express.Router();

const {
  register,
  login,
  adminLogin,
  googleLogin,
  logout,
  getMe,
  forgotPassword,
  resetPassword,
  changePassword,
  verifyEmail,
  resendVerification,
  updateProfilePicture,
  deleteProfilePicture,
  updateProfile,
  getProfileCompletionEndpoint,
} = require('../controllers/authController');

const {
  getMfaStatus,
  setupTotp,
  verifyTotpSetup,
  setupEmailOtp,
  verifyEmailOtpSetup,
  updateMfaPreference,
  regenerateRecoveryCodes,
  disableMfa,
  verifyMfaChallenge,
  resendMfaEmailOtp,
  setupAdminTotpInit,
  confirmAdminTotpSetup,
} = require('../controllers/mfaController');

const {
  listSessions,
  getCurrentSession,
  revokeSessionEndpoint,
  revokeOtherSessionsEndpoint,
  refreshSessionEndpoint,
} = require('../controllers/sessionController');

const {
  validateRegister,
  validateLogin,
  validateForgotPassword,
  validateResetPassword,
  validateChangePassword,
} = require('../middleware/validateAuth');

const { protect, restrictTo } = require('../middleware/authMiddleware');
const { uploadAvatar } = require('../middleware/uploadMiddleware');
const { authLimiter, passwordResetLimiter } = require('../middleware/rateLimiter');

// Public Authentication Endpoints
router.post('/register', authLimiter, validateRegister, register);
router.post('/login', authLimiter, validateLogin, login);
router.post('/admin/login', authLimiter, validateLogin, adminLogin);
router.post('/admin-login', authLimiter, validateLogin, adminLogin);
router.post('/google', authLimiter, googleLogin);
router.post('/logout', logout);

// Password Reset Flow
router.post('/forgot-password', passwordResetLimiter, validateForgotPassword, forgotPassword);
router.post('/reset-password', passwordResetLimiter, validateResetPassword, resetPassword);

// Email Verification
router.post('/verify-email', verifyEmail);

// Two-Factor Authentication (2FA) Public / Pre-Auth Routes
router.post('/mfa/verify-challenge', authLimiter, verifyMfaChallenge);
router.post('/mfa/resend-email-otp', authLimiter, resendMfaEmailOtp);
router.post('/mfa/admin-init-setup', authLimiter, setupAdminTotpInit);
router.post('/mfa/admin-confirm-setup', authLimiter, confirmAdminTotpSetup);

// Protected User Endpoints (Requires valid session)
router.get('/me', protect, getMe);
router.patch('/profile', protect, updateProfile);
router.get('/profile-completion', protect, getProfileCompletionEndpoint);
router.patch('/change-password', protect, validateChangePassword, changePassword);
router.post('/resend-verification', protect, resendVerification);
router.patch('/profile-picture', protect, uploadAvatar, updateProfilePicture);
router.delete('/profile-picture', protect, deleteProfilePicture);

// Two-Factor Authentication (2FA) Protected Account Settings Routes
router.get('/mfa/status', protect, getMfaStatus);
router.post('/mfa/totp/setup', protect, setupTotp);
router.post('/mfa/totp/verify', protect, verifyTotpSetup);
router.post('/mfa/email-otp/setup', protect, setupEmailOtp);
router.post('/mfa/email-otp/verify', protect, verifyEmailOtpSetup);
router.put('/mfa/preference', protect, updateMfaPreference);
router.post('/mfa/recovery-codes/regenerate', protect, regenerateRecoveryCodes);
router.post('/mfa/disable', protect, disableMfa);

// Multi-Device Session Management Endpoints (specific routes before parameterized)
router.get('/sessions', protect, listSessions);
router.get('/sessions/current', protect, getCurrentSession);
router.delete('/sessions/other', protect, revokeOtherSessionsEndpoint);
router.post('/sessions/refresh', protect, refreshSessionEndpoint);
router.delete('/sessions/:sessionId', protect, revokeSessionEndpoint);

// Role-Based Authorization Verification Routes
router.get('/student-only', protect, restrictTo('student', 'admin'), (req, res) => {
  res.json({
    message: 'Access granted to student-accessible area.',
    user: req.user,
  });
});

router.get('/instructor-only', protect, restrictTo('instructor', 'admin'), (req, res) => {
  res.json({
    message: 'Access granted to instructor portal.',
    user: req.user,
  });
});

router.get('/admin-only', protect, restrictTo('admin'), (req, res) => {
  res.json({
    message: 'Access granted to system administration.',
    user: req.user,
  });
});

module.exports = router;
