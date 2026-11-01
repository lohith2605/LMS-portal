const { generateSecret, generateURI, verifySync } = require('otplib');
const QRCode = require('qrcode');
const User = require('../models/User');
const {
  encryptSecret,
  decryptSecret,
  generateRecoveryCodes,
  hashRecoveryCode,
  generateNumericOtp,
  hashOtp,
  generateChallengeId,
} = require('../utils/cryptoUtils');
const {
  signToken,
  sendAuthCookie,
  sanitizeUser,
  verifyPreAuthToken,
} = require('../utils/authUtils');
const { createSession } = require('../utils/sessionUtils');
const { sendMfaEmailOtp } = require('../services/emailService');
const { logger } = require('../utils/logger');

/**
 * GET /api/auth/mfa/status
 * Get the current MFA enrollment and configuration status for the authenticated user
 */
const getMfaStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select(
      '+mfa.totp.secret +mfa.recoveryCodes.codeHash'
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User account not found',
      });
    }

    const isTotpConfigured = Boolean(user.mfa?.totp?.verified && user.mfa?.totp?.secret);
    const isEmailOtpConfigured = Boolean(user.mfa?.emailOtp?.verified);
    const recoveryCodes = user.mfa?.recoveryCodes || [];
    const recoveryCodesRemaining = recoveryCodes.filter((rc) => !rc.used).length;

    res.status(200).json({
      success: true,
      mfa: {
        enabled: Boolean(user.mfa?.enabled),
        enforced: Boolean(user.mfa?.enforced || user.role === 'admin'),
        role: user.role,
        preferredMethod: user.mfa?.preferredMethod || 'totp',
        totpConfigured: isTotpConfigured,
        emailOtpConfigured: isEmailOtpConfigured,
        recoveryCodesRemaining,
        totalRecoveryCodes: recoveryCodes.length,
      },
    });
  } catch (error) {
    logger.error(`Error fetching MFA status: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve two-factor authentication status',
    });
  }
};

/**
 * POST /api/auth/mfa/totp/setup
 * Initialize Google Authenticator TOTP enrollment for the authenticated user
 */
const setupTotp = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const secret = generateSecret();
    const appIssuer = 'LearnSpace LMS';
    const otpauthUri = generateURI({
      issuer: appIssuer,
      label: user.email,
      secret,
    });

    const qrCode = await QRCode.toDataURL(otpauthUri, {
      margin: 2,
      scale: 6,
      color: {
        dark: '#0F172A',
        light: '#FFFFFF',
      },
    });

    user.mfa = user.mfa || {};
    user.mfa.totp = user.mfa.totp || {};
    user.mfa.totp.pendingSecret = encryptSecret(secret);
    await user.save();

    res.status(200).json({
      success: true,
      qrCode,
      secret,
      manualEntryKey: secret,
      issuer: appIssuer,
      account: user.email,
    });
  } catch (error) {
    logger.error(`Error initiating TOTP setup: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to generate authenticator configuration',
    });
  }
};

/**
 * POST /api/auth/mfa/totp/verify
 * Confirm TOTP setup with a valid 6-digit code and generate initial backup recovery codes
 */
const verifyTotpSetup = async (req, res) => {
  try {
    const { code } = req.body;
    if (!code || typeof code !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'A 6-digit verification code from your authenticator app is required',
      });
    }

    const user = await User.findById(req.user.id).select(
      '+mfa.totp.pendingSecret +mfa.totp.secret'
    );

    if (!user || !user.mfa?.totp?.pendingSecret) {
      return res.status(400).json({
        success: false,
        message: 'No pending authenticator enrollment in progress. Please start setup again.',
      });
    }

    const plainSecret = decryptSecret(user.mfa.totp.pendingSecret);
    const verification = verifySync({
      token: code.trim(),
      secret: plainSecret,
      window: 1,
    });

    if (!verification || !verification.valid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification code. Please confirm the time on your device and enter the latest 6-digit code.',
      });
    }

    // Activate TOTP
    user.mfa.totp.secret = user.mfa.totp.pendingSecret;
    user.mfa.totp.pendingSecret = undefined;
    user.mfa.totp.verified = true;
    user.mfa.totp.verifiedAt = new Date();
    user.mfa.totp.lastUsedTimeStep = verification.timeStep;
    user.mfa.enabled = true;
    user.mfa.preferredMethod = 'totp';
    if (user.role === 'admin') {
      user.mfa.enforced = true;
    }

    // Generate fresh backup recovery codes
    const recoveryCodes = generateRecoveryCodes(8);
    user.mfa.recoveryCodes = recoveryCodes.map((c) => ({
      codeHash: hashRecoveryCode(c),
      used: false,
    }));

    await user.save();

    logger.info(`TOTP MFA successfully activated for user ${user.email} (${user.role})`);

    res.status(200).json({
      success: true,
      message: 'Google Authenticator has been successfully activated for your account.',
      recoveryCodes,
      user: sanitizeUser(user),
    });
  } catch (error) {
    logger.error(`Error verifying TOTP setup: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to verify authenticator code',
    });
  }
};

/**
 * POST /api/auth/mfa/email-otp/setup
 * Send an email verification code to enable Email OTP for student/instructor accounts
 */
const setupEmailOtp = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select(
      '+mfa.emailOtp.codeHash +mfa.emailOtp.expiresAt'
    );

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.role === 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Administrator accounts must use Google Authenticator TOTP.',
      });
    }

    // 60-second cooldown check
    if (user.mfa?.emailOtp?.lastSentAt) {
      const secondsSinceLastSent = (Date.now() - new Date(user.mfa.emailOtp.lastSentAt).getTime()) / 1000;
      if (secondsSinceLastSent < 60) {
        const remaining = Math.ceil(60 - secondsSinceLastSent);
        return res.status(429).json({
          success: false,
          message: `Please wait ${remaining} seconds before requesting a new verification code.`,
          retryAfter: remaining,
        });
      }
    }

    const otp = generateNumericOtp();
    const codeHash = hashOtp(otp);

    user.mfa = user.mfa || {};
    user.mfa.emailOtp = user.mfa.emailOtp || {};
    user.mfa.emailOtp.codeHash = codeHash;
    user.mfa.emailOtp.expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    user.mfa.emailOtp.lastSentAt = new Date();

    await user.save();
    await sendMfaEmailOtp({ to: user.email, name: user.name, otp });

    res.status(200).json({
      success: true,
      message: `A single-use verification code has been dispatched to ${user.email}.`,
      expiresIn: 600,
    });
  } catch (error) {
    logger.error(`Error setting up Email OTP: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to dispatch email verification code',
    });
  }
};

/**
 * POST /api/auth/mfa/email-otp/verify
 * Confirm Email OTP setup
 */
const verifyEmailOtpSetup = async (req, res) => {
  try {
    const { code } = req.body;
    if (!code || typeof code !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Verification code is required',
      });
    }

    const user = await User.findById(req.user.id).select(
      '+mfa.emailOtp.codeHash +mfa.emailOtp.expiresAt +mfa.recoveryCodes.codeHash'
    );

    if (!user || !user.mfa?.emailOtp?.codeHash) {
      return res.status(400).json({
        success: false,
        message: 'No pending email verification code. Please request a new code.',
      });
    }

    if (new Date() > new Date(user.mfa.emailOtp.expiresAt)) {
      return res.status(400).json({
        success: false,
        message: 'Verification code has expired. Please request a fresh code.',
      });
    }

    const candidateHash = hashOtp(code.trim());
    if (candidateHash !== user.mfa.emailOtp.codeHash) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email verification code. Please check your inbox and try again.',
      });
    }

    // Activate Email OTP
    user.mfa.emailOtp.verified = true;
    user.mfa.emailOtp.codeHash = undefined;
    user.mfa.emailOtp.expiresAt = undefined;
    user.mfa.enabled = true;
    user.mfa.preferredMethod = 'email_otp';

    let recoveryCodes = null;
    // Generate recovery codes if user does not already have any
    if (!user.mfa.recoveryCodes || user.mfa.recoveryCodes.length === 0) {
      recoveryCodes = generateRecoveryCodes(8);
      user.mfa.recoveryCodes = recoveryCodes.map((c) => ({
        codeHash: hashRecoveryCode(c),
        used: false,
      }));
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Email Two-Factor Authentication enabled successfully.',
      recoveryCodes,
      user: sanitizeUser(user),
    });
  } catch (error) {
    logger.error(`Error verifying email OTP setup: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to verify email code',
    });
  }
};

/**
 * PUT /api/auth/mfa/preference
 * Switch active preferred method ('totp' | 'email_otp')
 */
const updateMfaPreference = async (req, res) => {
  try {
    const { preferredMethod, password } = req.body;

    if (!['totp', 'email_otp'].includes(preferredMethod)) {
      return res.status(400).json({
        success: false,
        message: 'Preferred method must be either "totp" or "email_otp"',
      });
    }

    const user = await User.findById(req.user.id).select(
      '+password +mfa.totp.secret'
    );

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Require current password for security settings modification (unless OAuth without password)
    if (user.password) {
      if (!password) {
        return res.status(400).json({
          success: false,
          message: 'Current password is required to update security preferences',
        });
      }
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Incorrect password entered',
        });
      }
    }

    if (user.role === 'admin' && preferredMethod !== 'totp') {
      return res.status(403).json({
        success: false,
        message: 'Administrator accounts must maintain Google Authenticator TOTP as the primary factor.',
      });
    }

    if (preferredMethod === 'totp' && (!user.mfa?.totp?.verified || !user.mfa?.totp?.secret)) {
      return res.status(400).json({
        success: false,
        message: 'You must enroll in Google Authenticator before selecting it as your preferred method.',
      });
    }

    if (preferredMethod === 'email_otp' && !user.mfa?.emailOtp?.verified) {
      return res.status(400).json({
        success: false,
        message: 'You must verify your email for two-factor authentication before selecting Email OTP.',
      });
    }

    user.mfa.preferredMethod = preferredMethod;
    await user.save();

    res.status(200).json({
      success: true,
      message: `Preferred two-factor method updated to ${preferredMethod === 'totp' ? 'Google Authenticator' : 'Email OTP'}.`,
      preferredMethod,
    });
  } catch (error) {
    logger.error(`Error updating MFA preference: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to update two-factor preference',
    });
  }
};

/**
 * POST /api/auth/mfa/recovery-codes/regenerate
 * Invalidate existing backup recovery codes and generate a fresh set of 8 codes
 */
const regenerateRecoveryCodes = async (req, res) => {
  try {
    const { password } = req.body;
    const user = await User.findById(req.user.id).select('+password');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (!user.mfa?.enabled && user.role !== 'admin') {
      return res.status(400).json({
        success: false,
        message: 'Two-factor authentication must be enabled to generate recovery codes.',
      });
    }

    if (user.password) {
      if (!password) {
        return res.status(400).json({
          success: false,
          message: 'Current password is required to generate new recovery codes',
        });
      }
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Incorrect password entered',
        });
      }
    }

    const recoveryCodes = generateRecoveryCodes(8);
    user.mfa.recoveryCodes = recoveryCodes.map((c) => ({
      codeHash: hashRecoveryCode(c),
      used: false,
    }));

    await user.save();

    res.status(200).json({
      success: true,
      message: 'New backup recovery codes generated successfully. Previous codes have been invalidated.',
      recoveryCodes,
    });
  } catch (error) {
    logger.error(`Error regenerating recovery codes: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to regenerate recovery codes',
    });
  }
};

/**
 * POST /api/auth/mfa/disable
 * Disable two-factor authentication (strictly disallowed for administrators)
 */
const disableMfa = async (req, res) => {
  try {
    const { password, code } = req.body;
    const user = await User.findById(req.user.id).select(
      '+password +mfa.totp.secret +mfa.emailOtp.codeHash +mfa.recoveryCodes.codeHash'
    );

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.role === 'admin' || user.mfa?.enforced) {
      return res.status(403).json({
        success: false,
        message: 'Two-Factor Authentication is mandatory for administrative accounts and cannot be disabled.',
      });
    }

    if (user.password) {
      if (!password) {
        return res.status(400).json({
          success: false,
          message: 'Current password is required to disable two-factor authentication',
        });
      }
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Incorrect password entered',
        });
      }
    }

    // Verify verification code or recovery code
    let verified = false;
    if (code) {
      const cleanCode = code.trim();
      // Check recovery code
      const recHash = hashRecoveryCode(cleanCode);
      const foundRec = user.mfa?.recoveryCodes?.find((rc) => rc.codeHash === recHash && !rc.used);
      if (foundRec) {
        verified = true;
      } else if (user.mfa?.totp?.secret) {
        // Check TOTP
        const plainSecret = decryptSecret(user.mfa.totp.secret);
        const check = verifySync({ token: cleanCode, secret: plainSecret, window: 1 });
        if (check && check.valid) verified = true;
      }
    }

    if (!verified) {
      return res.status(400).json({
        success: false,
        message: 'A valid authenticator code or recovery code is required to confirm disabling two-factor authentication.',
      });
    }

    user.mfa = user.mfa || {};
    user.mfa.enabled = false;
    if (user.mfa.totp) {
      user.mfa.totp.verified = false;
      user.mfa.totp.secret = undefined;
    }
    if (user.mfa.emailOtp) {
      user.mfa.emailOtp.verified = false;
    }
    user.mfa.recoveryCodes = [];

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Two-factor authentication has been disabled for your account.',
      user: sanitizeUser(user),
    });
  } catch (error) {
    logger.error(`Error disabling MFA: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to disable two-factor authentication',
    });
  }
};

/**
 * POST /api/auth/mfa/verify-challenge
 * Public/Pre-Auth: Validate MFA challenge code or backup recovery code during sign-in
 */
const verifyMfaChallenge = async (req, res) => {
  try {
    const { preAuthToken, code, isRecoveryCode } = req.body;

    if (!preAuthToken) {
      return res.status(401).json({
        success: false,
        message: 'Two-factor session token is missing. Please sign in again.',
      });
    }

    if (!code || typeof code !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Verification code is required',
      });
    }

    let decoded;
    try {
      decoded = verifyPreAuthToken(preAuthToken);
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: err.message || 'Two-factor verification window has expired. Please sign in again.',
      });
    }

    const { id: userId, challengeId } = decoded;

    const user = await User.findById(userId).select(
      '+password +mfa.totp.secret +mfa.totp.lastUsedTimeStep +mfa.emailOtp.codeHash +mfa.emailOtp.expiresAt +mfa.recoveryCodes.codeHash +mfa.currentChallenge.challengeId +mfa.currentChallenge.expiresAt +mfa.currentChallenge.used'
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Account not found. Please sign in again.',
      });
    }

    if (user.accountStatus !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'Your account is suspended or pending approval.',
      });
    }

    // Atomic Challenge Verification
    const activeChallenge = user.mfa?.currentChallenge;
    if (
      !activeChallenge ||
      activeChallenge.challengeId !== challengeId ||
      activeChallenge.used ||
      new Date() > new Date(activeChallenge.expiresAt)
    ) {
      return res.status(401).json({
        success: false,
        message: 'This two-factor challenge is invalid or has expired. Please sign in again.',
      });
    }

    const cleanCode = code.trim();

    // Verify Code
    if (isRecoveryCode) {
      const recHash = hashRecoveryCode(cleanCode);
      const matchedCode = user.mfa?.recoveryCodes?.find(
        (rc) => rc.codeHash === recHash && !rc.used
      );

      if (!matchedCode) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or already-used backup recovery code.',
        });
      }

      matchedCode.used = true;
      matchedCode.usedAt = new Date();
    } else if (activeChallenge.method === 'totp' || (!activeChallenge.method && user.mfa?.totp?.secret)) {
      if (!user.mfa?.totp?.secret) {
        return res.status(400).json({
          success: false,
          message: 'Google Authenticator is not configured on this account.',
        });
      }

      const plainSecret = decryptSecret(user.mfa.totp.secret);
      const verification = verifySync({
        token: cleanCode,
        secret: plainSecret,
        window: 1,
      });

      if (!verification || !verification.valid) {
        return res.status(400).json({
          success: false,
          message: 'Invalid 6-digit code. Please check your authenticator app and try again.',
        });
      }

      // Replay prevention check
      if (
        typeof user.mfa.totp.lastUsedTimeStep === 'number' &&
        verification.timeStep <= user.mfa.totp.lastUsedTimeStep
      ) {
        return res.status(400).json({
          success: false,
          message: 'This authenticator code has already been consumed. Please enter the current code from your authenticator app.',
        });
      }

      user.mfa.totp.lastUsedTimeStep = verification.timeStep;
    } else if (activeChallenge.method === 'email_otp') {
      if (!user.mfa?.emailOtp?.codeHash) {
        return res.status(400).json({
          success: false,
          message: 'No active email verification code. Please request a new one.',
        });
      }

      if (new Date() > new Date(user.mfa.emailOtp.expiresAt)) {
        return res.status(400).json({
          success: false,
          message: 'Email verification code has expired. Please request a new code.',
        });
      }

      const candidateHash = hashOtp(cleanCode);
      if (candidateHash !== user.mfa.emailOtp.codeHash) {
        return res.status(400).json({
          success: false,
          message: 'Invalid email verification code. Please check your email inbox and try again.',
        });
      }

      // Clear email OTP code hash
      user.mfa.emailOtp.codeHash = undefined;
      user.mfa.emailOtp.expiresAt = undefined;
    } else {
      return res.status(400).json({
        success: false,
        message: 'Unknown authentication method requested.',
      });
    }

    // Mark challenge consumed
    user.mfa.currentChallenge.used = true;
    user.lastLoginAt = new Date();
    await user.save();

    // Create database-backed multi-device session for verified MFA login
    const session = await createSession({ user, req, role: user.role });
    const token = signToken(user, session._id);
    sendAuthCookie(res, token);

    logger.info(`MFA challenge verified successfully for ${user.email} (${user.role}) via ${isRecoveryCode ? 'recovery_code' : activeChallenge.method}`);

    res.status(200).json({
      success: true,
      message: 'Sign in successful',
      user: sanitizeUser(user),
    });
  } catch (error) {
    logger.error(`Error in verifyMfaChallenge: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Authentication failed during two-factor verification',
    });
  }
};

/**
 * POST /api/auth/mfa/resend-email-otp
 * Public/Pre-Auth: Resend Email OTP during active login challenge
 */
const resendMfaEmailOtp = async (req, res) => {
  try {
    const { preAuthToken } = req.body;
    if (!preAuthToken) {
      return res.status(401).json({
        success: false,
        message: 'Pre-authentication session required',
      });
    }

    const decoded = verifyPreAuthToken(preAuthToken);
    const user = await User.findById(decoded.id).select(
      '+mfa.emailOtp.codeHash +mfa.emailOtp.expiresAt +mfa.currentChallenge.challengeId +mfa.currentChallenge.used'
    );

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Cooldown check (60 seconds)
    if (user.mfa?.emailOtp?.lastSentAt) {
      const elapsed = (Date.now() - new Date(user.mfa.emailOtp.lastSentAt).getTime()) / 1000;
      if (elapsed < 60) {
        const remaining = Math.ceil(60 - elapsed);
        return res.status(429).json({
          success: false,
          message: `Please wait ${remaining} seconds before requesting a new code.`,
          retryAfter: remaining,
        });
      }
    }

    const otp = generateNumericOtp();
    user.mfa = user.mfa || {};
    user.mfa.emailOtp = user.mfa.emailOtp || {};
    user.mfa.emailOtp.codeHash = hashOtp(otp);
    user.mfa.emailOtp.expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    user.mfa.emailOtp.lastSentAt = new Date();

    await user.save();
    await sendMfaEmailOtp({ to: user.email, name: user.name, otp });

    res.status(200).json({
      success: true,
      message: `A fresh verification code has been dispatched to ${user.email}.`,
      expiresIn: 600,
    });
  } catch (error) {
    logger.error(`Error resending email OTP: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to resend email verification code',
    });
  }
};

/**
 * POST /api/auth/mfa/admin-init-setup
 * Public/Pre-Auth: Initialize first-time TOTP enrollment for an administrator
 */
const setupAdminTotpInit = async (req, res) => {
  try {
    const { preAuthToken } = req.body;
    if (!preAuthToken) {
      return res.status(401).json({
        success: false,
        message: 'Administrative pre-authentication token is required',
      });
    }

    const decoded = verifyPreAuthToken(preAuthToken);
    if (decoded.role !== 'admin' || !decoded.mfaSetupRequired) {
      return res.status(403).json({
        success: false,
        message: 'Invalid administrative setup request',
      });
    }

    const user = await User.findById(decoded.id);
    if (!user || user.role !== 'admin') {
      return res.status(404).json({ success: false, message: 'Administrator account not found' });
    }

    const secret = generateSecret();
    const appIssuer = 'LearnSpace LMS Platform Governance';
    const otpauthUri = generateURI({
      issuer: appIssuer,
      label: user.email,
      secret,
    });

    const qrCode = await QRCode.toDataURL(otpauthUri, {
      margin: 2,
      scale: 6,
      color: { dark: '#0F172A', light: '#FFFFFF' },
    });

    user.mfa = user.mfa || {};
    user.mfa.totp = user.mfa.totp || {};
    user.mfa.totp.pendingSecret = encryptSecret(secret);
    await user.save();

    res.status(200).json({
      success: true,
      qrCode,
      secret,
      manualEntryKey: secret,
      issuer: appIssuer,
      account: user.email,
    });
  } catch (error) {
    logger.error(`Error in setupAdminTotpInit: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to initialize administrator 2FA setup',
    });
  }
};

/**
 * POST /api/auth/mfa/admin-confirm-setup
 * Public/Pre-Auth: Verify first-time TOTP code and finalize administrator login
 */
const confirmAdminTotpSetup = async (req, res) => {
  try {
    const { preAuthToken, code } = req.body;

    if (!preAuthToken || !code) {
      return res.status(400).json({
        success: false,
        message: 'Pre-authentication session and verification code are required',
      });
    }

    const decoded = verifyPreAuthToken(preAuthToken);
    if (decoded.role !== 'admin' || !decoded.mfaSetupRequired) {
      return res.status(403).json({
        success: false,
        message: 'Invalid administrator enrollment request',
      });
    }

    const user = await User.findById(decoded.id).select(
      '+mfa.totp.pendingSecret +mfa.totp.secret +mfa.currentChallenge.challengeId +mfa.currentChallenge.used'
    );

    if (!user || user.role !== 'admin' || !user.mfa?.totp?.pendingSecret) {
      return res.status(400).json({
        success: false,
        message: 'No pending administrator enrollment found. Please sign in again.',
      });
    }

    const plainSecret = decryptSecret(user.mfa.totp.pendingSecret);
    const verification = verifySync({
      token: code.trim(),
      secret: plainSecret,
      window: 1,
    });

    if (!verification || !verification.valid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid 6-digit authenticator code. Please check your authenticator app and try again.',
      });
    }

    // Activate TOTP for Admin
    user.mfa.totp.secret = user.mfa.totp.pendingSecret;
    user.mfa.totp.pendingSecret = undefined;
    user.mfa.totp.verified = true;
    user.mfa.totp.verifiedAt = new Date();
    user.mfa.totp.lastUsedTimeStep = verification.timeStep;
    user.mfa.enabled = true;
    user.mfa.enforced = true;
    user.mfa.preferredMethod = 'totp';

    // Generate 8 backup recovery codes
    const recoveryCodes = generateRecoveryCodes(8);
    user.mfa.recoveryCodes = recoveryCodes.map((c) => ({
      codeHash: hashRecoveryCode(c),
      used: false,
    }));

    // Invalidate pre-auth challenge
    if (user.mfa.currentChallenge) {
      user.mfa.currentChallenge.used = true;
    }
    user.lastLoginAt = new Date();

    await user.save();

    // Issue database-backed session & authenticating session cookie
    const session = await createSession({ user, req, role: user.role });
    const token = signToken(user, session._id);
    sendAuthCookie(res, token);

    logger.info(`Administrator ${user.email} successfully completed first-time 2FA enrollment.`);

    res.status(200).json({
      success: true,
      message: 'Administrator Two-Factor Authentication enrolled successfully',
      recoveryCodes,
      user: sanitizeUser(user),
    });
  } catch (error) {
    logger.error(`Error confirming admin TOTP setup: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to complete administrator two-factor enrollment',
    });
  }
};

module.exports = {
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
};
