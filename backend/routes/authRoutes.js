const express = require('express');
const router = express.Router();

const {
  register,
  login,
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
} = require('../controllers/authController');

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
router.post('/google', authLimiter, googleLogin);
router.post('/logout', logout);

// Password Reset Flow
router.post('/forgot-password', passwordResetLimiter, validateForgotPassword, forgotPassword);
router.post('/reset-password', passwordResetLimiter, validateResetPassword, resetPassword);

// Email Verification
router.post('/verify-email', verifyEmail);

// Protected User Endpoints (Requires valid session)
router.get('/me', protect, getMe);
router.patch('/change-password', protect, validateChangePassword, changePassword);
router.post('/resend-verification', protect, resendVerification);
router.patch('/profile-picture', protect, uploadAvatar, updateProfilePicture);
router.delete('/profile-picture', protect, deleteProfilePicture);

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
