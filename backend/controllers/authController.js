const User = require('../models/User');
const {
  signToken,
  sendAuthCookie,
  clearAuthCookie,
  hashToken,
  sanitizeUser,
} = require('../utils/authUtils');
const {
  sendPasswordResetEmail,
  sendVerificationEmail,
} = require('../services/emailService');
const firebaseAdmin = require('../config/firebaseAdmin');
const { logger } = require('../utils/logger');

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

/**
 * Register a new user
 * POST /api/auth/register
 */
const register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        error: 'An account with this email address already exists.',
      });
    }

    // Role and account status policies
    let assignedRole = 'student';
    let assignedStatus = 'active';

    if (role && role.toLowerCase() === 'instructor') {
      assignedRole = 'instructor';
      // Instructor accounts require administrator verification
      assignedStatus = 'pending';
    }

    // Create user
    const newUser = await User.create({
      name,
      email,
      password,
      role: assignedRole,
      accountStatus: assignedStatus,
    });

    logger.info(`New user registered: ${newUser.email} (${newUser.role}, ${newUser.accountStatus})`);

    // Generate verification token and dispatch email
    if (typeof newUser.createEmailVerificationToken === 'function') {
      const verifyToken = newUser.createEmailVerificationToken();
      await newUser.save({ validateBeforeSave: false });

      const verifyUrl = `${CLIENT_URL}/verify-email?token=${verifyToken}`;
      try {
        await sendVerificationEmail({
          to: newUser.email,
          name: newUser.name,
          verifyUrl,
        });
      } catch (emailErr) {
        logger.error(`Error sending verification email during registration: ${emailErr.message}`);
      }
    }

    // If pending approval, inform user without session issuance
    if (assignedStatus === 'pending') {
      return res.status(201).json({
        message: 'Instructor application received. Your account is pending administrator review and approval before access is granted.',
        user: sanitizeUser(newUser),
      });
    }

    // For active accounts, issue authenticated session
    const token = signToken(newUser);
    sendAuthCookie(res, token);

    return res.status(201).json({
      message: 'Registration successful. Welcome to LearnSpace!',
      user: sanitizeUser(newUser),
    });
  } catch (error) {
    // Handle MongoDB unique index violation race condition
    if (error.code === 11000) {
      return res.status(409).json({
        error: 'An account with this email address already exists.',
      });
    }

    logger.error(`Registration error: ${error.message}`);
    return res.status(500).json({
      error: 'An internal error occurred while creating your account. Please try again.',
    });
  }
};

/**
 * Log in with email and password
 * POST /api/auth/login
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Find user by normalized email and explicitly select password
    const user = await User.findOne({ email }).select('+password');

    // 2. Generic credentials verification to prevent user enumeration
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({
        error: 'Invalid email address or password.',
      });
    }

    // 3. Check account status
    if (user.accountStatus === 'suspended') {
      return res.status(403).json({
        error: 'Your account has been suspended. Please contact platform support for assistance.',
      });
    }

    if (user.accountStatus === 'pending') {
      return res.status(403).json({
        error: 'Your instructor account is currently pending administrator approval.',
      });
    }

    // 4. Update last login timestamp
    user.lastLoginAt = new Date();
    await user.save({ validateBeforeSave: false });

    // 5. Issue session JWT in HttpOnly cookie
    const token = signToken(user);
    sendAuthCookie(res, token);

    logger.info(`User logged in: ${user.email} (${user.role})`);

    return res.status(200).json({
      message: 'Logged in successfully.',
      user: sanitizeUser(user),
    });
  } catch (error) {
    logger.error(`Login error: ${error.message}`);
    return res.status(500).json({
      error: 'An internal error occurred during login. Please try again.',
    });
  }
};

/**
 * Log out and clear session cookie
 * POST /api/auth/logout
 */
const logout = (req, res) => {
  clearAuthCookie(res);
  return res.status(200).json({
    message: 'Logged out successfully.',
  });
};

/**
 * Get current authenticated user profile
 * GET /api/auth/me
 */
const getMe = (req, res) => {
  return res.status(200).json({
    user: req.user,
  });
};

/**
 * Request password reset email
 * POST /api/auth/forgot-password
 */
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    // Generic success message always returned to avoid email enumeration
    const genericResponse = {
      message: 'If an account associated with that email exists, password reset instructions have been dispatched.',
    };

    if (!user) {
      return res.status(200).json(genericResponse);
    }

    // Generate cryptographic reset token and save hash
    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    // Construct reset URL for frontend
    const resetUrl = `${CLIENT_URL}/reset-password?token=${resetToken}`;

    // Dispatch email
    try {
      await sendPasswordResetEmail({
        to: user.email,
        name: user.name,
        resetUrl,
      });
    } catch (emailErr) {
      // Clear token if dispatch fails unexpectedly
      user.passwordResetTokenHash = undefined;
      user.passwordResetExpiresAt = undefined;
      await user.save({ validateBeforeSave: false });
      logger.error(`Error sending reset email: ${emailErr.message}`);
    }

    return res.status(200).json(genericResponse);
  } catch (error) {
    logger.error(`Forgot password error: ${error.message}`);
    return res.status(500).json({
      error: 'Unable to process password reset request at this time.',
    });
  }
};

/**
 * Reset password with verified token
 * POST /api/auth/reset-password
 */
const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    const hashedToken = hashToken(token);

    // Find user with matching active token
    const user = await User.findOne({
      passwordResetTokenHash: hashedToken,
      passwordResetExpiresAt: { $gt: new Date() },
    }).select('+password');

    if (!user) {
      return res.status(400).json({
        error: 'Password reset link is invalid or has expired. Please request a new one.',
      });
    }

    // Set new password
    user.password = newPassword;
    user.passwordResetTokenHash = undefined;
    user.passwordResetExpiresAt = undefined;
    await user.save();

    logger.info(`Password successfully reset for: ${user.email}`);

    // Automatically authenticate user with new session
    const jwtToken = signToken(user);
    sendAuthCookie(res, jwtToken);

    return res.status(200).json({
      message: 'Your password has been reset successfully.',
      user: sanitizeUser(user),
    });
  } catch (error) {
    logger.error(`Reset password error: ${error.message}`);
    return res.status(500).json({
      error: 'Unable to reset password. Please try again.',
    });
  }
};

/**
 * Change password for authenticated user
 * PATCH /api/auth/change-password
 */
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Fetch user with password field
    const user = await User.findById(req.user.id).select('+password');
    if (!user) {
      return res.status(404).json({
        error: 'User not found.',
      });
    }

    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        error: 'Current password does not match.',
      });
    }

    // Disallow setting the exact same password
    if (currentPassword === newPassword) {
      return res.status(400).json({
        error: 'New password cannot be identical to your current password.',
      });
    }

    user.password = newPassword;
    await user.save();

    logger.info(`Password changed by user: ${user.email}`);

    // Issue refreshed session cookie
    const token = signToken(user);
    sendAuthCookie(res, token);

    return res.status(200).json({
      message: 'Password updated successfully.',
      user: sanitizeUser(user),
    });
  } catch (error) {
    logger.error(`Change password error: ${error.message}`);
    return res.status(500).json({
      error: 'An internal error occurred while changing your password.',
    });
  }
};

/**
 * Verify email address with token
 * POST /api/auth/verify-email
 */
const verifyEmail = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ error: 'Verification token is required.' });
    }

    const hashedToken = hashToken(token);
    const user = await User.findOne({
      emailVerificationTokenHash: hashedToken,
      emailVerificationExpiresAt: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({
        error: 'Verification token is invalid or has expired.',
      });
    }

    user.emailVerified = true;
    user.emailVerificationTokenHash = undefined;
    user.emailVerificationExpiresAt = undefined;
    await user.save({ validateBeforeSave: false });

    return res.status(200).json({
      message: 'Email address verified successfully.',
      user: sanitizeUser(user),
    });
  } catch (error) {
    logger.error(`Verify email error: ${error.message}`);
    return res.status(500).json({ error: 'Unable to verify email at this time.' });
  }
};

/**
 * Resend email verification
 * POST /api/auth/resend-verification
 */
const resendVerification = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (user.emailVerified) {
      return res.status(400).json({ error: 'This email is already verified.' });
    }

    const verifyToken = user.createEmailVerificationToken();
    await user.save({ validateBeforeSave: false });

    const verifyUrl = `${CLIENT_URL}/verify-email?token=${verifyToken}`;
    await sendVerificationEmail({
      to: user.email,
      name: user.name,
      verifyUrl,
    });

    return res.status(200).json({
      message: 'A fresh verification email has been sent.',
    });
  } catch (error) {
    logger.error(`Resend verification error: ${error.message}`);
    return res.status(500).json({ error: 'Unable to resend verification email.' });
  }
};

/**
 * Authenticate with verified Firebase Google ID token
 * POST /api/auth/google
 */
const googleLogin = async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken || typeof idToken !== 'string' || !idToken.trim()) {
      return res.status(400).json({
        error: 'Firebase ID token is required.',
      });
    }

    // 1. Cryptographically verify the ID token on the backend
    let decodedToken;
    try {
      decodedToken = await firebaseAdmin.verifyFirebaseIdToken(idToken.trim());
    } catch (verifyError) {
      logger.warn(`Firebase ID token verification failed: ${verifyError.message}`);
      if (verifyError.message && verifyError.message.includes('Firebase Admin SDK is not configured')) {
        return res.status(503).json({
          error: 'Google sign-in is temporarily unavailable on the server. Please check Firebase Admin credentials.',
        });
      }
      return res.status(401).json({
        error: 'Google authentication failed: invalid or expired token.',
      });
    }

    // 2. Extract verified profile claims from decoded token
    const { uid, email, email_verified, name, picture } = decodedToken;

    if (!email) {
      return res.status(400).json({
        error: 'Google account must have an associated email address.',
      });
    }

    if (!email_verified) {
      return res.status(403).json({
        error: 'Your Google email address is not verified. Please verify your email with Google first.',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // 3. Find existing user by firebaseUid or email
    let user = await User.findOne({ firebaseUid: uid });
    let isNewUser = false;

    if (!user) {
      user = await User.findOne({ email: normalizedEmail });
      if (user) {
        // Link Google UID to existing account safely
        user.firebaseUid = uid;
        if (!user.emailVerified) {
          user.emailVerified = true;
        }
        if (picture && !user.avatar) {
          user.avatar = picture;
        }
        await user.save({ validateBeforeSave: false });
        logger.info(`Linked Firebase UID to existing account: ${user.email}`);
      }
    }

    // 4. Create new student account if user doesn't exist
    if (!user) {
      isNewUser = true;
      user = await User.create({
        name: name || normalizedEmail.split('@')[0],
        email: normalizedEmail,
        firebaseUid: uid,
        role: 'student', // Strictly enforce student role - prevent client role escalation
        accountStatus: 'active',
        emailVerified: true,
        avatar: picture || '',
      });
      logger.info(`New user registered via Google: ${user.email} (${user.role})`);
    }

    // 5. Enforce account status policies
    if (user.accountStatus === 'suspended') {
      return res.status(403).json({
        error: 'Your account has been suspended. Please contact platform support for assistance.',
      });
    }

    if (user.accountStatus === 'pending') {
      return res.status(403).json({
        error: 'Your instructor account is currently pending administrator approval.',
      });
    }

    // 6. Update last login timestamp
    user.lastLoginAt = new Date();
    if (picture && !user.avatar) {
      user.avatar = picture;
    }
    await user.save({ validateBeforeSave: false });

    // 7. Issue standard LMS session JWT cookie
    const token = signToken(user);
    sendAuthCookie(res, token);

    logger.info(`User logged in via Google: ${user.email} (${user.role})`);

    return res.status(isNewUser ? 201 : 200).json({
      message: isNewUser
        ? 'Welcome to LearnSpace! Your account has been created.'
        : 'Logged in successfully with Google.',
      user: sanitizeUser(user),
    });
  } catch (error) {
    if (error.code === 11000) {
      try {
        const existing = await User.findOne({ email: req.body?.email?.toLowerCase()?.trim() });
        if (existing) {
          const token = signToken(existing);
          sendAuthCookie(res, token);
          return res.status(200).json({
            message: 'Logged in successfully with Google.',
            user: sanitizeUser(existing),
          });
        }
      } catch {}
    }

    logger.error(`Google login error: ${error.message}`);
    return res.status(500).json({
      error: 'An internal error occurred during Google sign-in. Please try again.',
    });
  }
};

module.exports = {
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
};
