const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { getJwtSecret, sanitizeUser, clearAuthCookie } = require('../utils/authUtils');
const { validateSession, touchSession } = require('../utils/sessionUtils');
const { logger } = require('../utils/logger');

/**
 * Determine whether a request is background polling/heartbeat traffic
 * that must NOT extend the session inactivity window.
 * @param {import('express').Request} req
 * @returns {boolean}
 */
const isBackgroundPolling = (req) => {
  if (
    req.headers['x-background-request'] === 'true' ||
    req.headers['x-background-poll'] === 'true' ||
    req.headers['x-polling'] === 'true' ||
    req.headers['x-learner-activity'] === 'false'
  ) {
    return true;
  }
  const url = req.originalUrl || req.url || '';
  if (
    url.includes('/notifications/unread-count') ||
    url.includes('/health') ||
    url.includes('/learning-activity/heartbeat') ||
    url.includes('/learning-activity/active-time')
  ) {
    return true;
  }
  return false;
};

/**
 * Middleware: Verify user authentication via HttpOnly cookie or Bearer token header
 * Enforces token signature, purpose, database-backed session state, and account status
 */
const protect = async (req, res, next) => {
  try {
    let token = null;

    // 1. Read token from HttpOnly cookie first
    if (req.cookies && req.cookies.jwt) {
      token = req.cookies.jwt;
    }
    // 2. Fall back to Authorization Bearer header
    else if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer ')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        error: 'Authentication required. Please log in to access this resource.',
      });
    }

    // 3. Verify token signature and expiry
    const secret = getJwtSecret();
    let decoded;
    try {
      decoded = jwt.verify(token, secret);
    } catch (jwtErr) {
      if (jwtErr.name === 'TokenExpiredError') {
        return res.status(401).json({
          error: 'Your session has expired. Please log in again.',
        });
      }
      return res.status(401).json({
        error: 'Invalid authentication session. Please log in again.',
      });
    }

    // 4. CRITICAL SECURITY ENFORCEMENT: Reject pre-auth MFA tokens from accessing protected APIs
    if (decoded.purpose && decoded.purpose !== 'authenticated') {
      return res.status(401).json({
        error: 'Authentication incomplete. Two-factor authentication must be completed.',
      });
    }

    // 5. Database-backed multi-device session validation
    const sessionId = decoded.sid || decoded.sessionId;
    if (sessionId) {
      const sessionResult = await validateSession(sessionId, decoded.id);
      if (!sessionResult.valid) {
        clearAuthCookie(res);
        const messageMap = {
          revoked: 'Your session has been logged out or revoked. Please sign in again.',
          idle_timeout: 'Your session has expired due to 10 minutes of inactivity. Please sign in again.',
          inactivity_timeout: 'Your session has expired due to 10 minutes of inactivity. Please sign in again.',
          absolute_timeout: 'Your session has reached its 8-hour maximum lifetime. Please sign in again.',
        };
        return res.status(401).json({
          error: messageMap[sessionResult.reason] || 'Invalid or expired session. Please log in again.',
        });
      }

      req.session = sessionResult.session;
      req.sessionId = sessionId;

      // Asynchronous throttled activity update (ignored for background polling)
      if (!isBackgroundPolling(req)) {
        touchSession(sessionResult.session).catch((touchErr) => {
          logger.warn(`Failed to touch session ${sessionId}: ${touchErr.message}`);
        });
      }
    } else if (process.env.NODE_ENV !== 'test') {
      // In production/development, require session identifier
      return res.status(401).json({
        error: 'Invalid session credentials. Please sign in again.',
      });
    }

    // 6. Check if user still exists in database
    const currentUser = await User.findById(decoded.id).select('+passwordChangedAt');
    if (!currentUser) {
      return res.status(401).json({
        error: 'The user account associated with this session no longer exists.',
      });
    }

    // 7. Check account status
    if (currentUser.accountStatus === 'suspended') {
      return res.status(403).json({
        error: 'Your account has been suspended. Please contact support.',
      });
    }

    if (currentUser.accountStatus === 'pending') {
      return res.status(403).json({
        error: 'Your account is pending administrator approval.',
      });
    }

    // 8. Check if user changed password after the token was issued
    if (currentUser.changedPasswordAfter(decoded.iat)) {
      return res.status(401).json({
        error: 'Password was recently changed. Please log in again.',
      });
    }

    // 9. Attach sanitized user and original document to request
    req.user = sanitizeUser(currentUser);
    req.userDoc = currentUser;

    next();
  } catch (error) {
    logger.error(`Authentication protect middleware error: ${error.message}`);
    return res.status(500).json({
      error: 'An internal error occurred during authentication.',
    });
  }
};

/**
 * Middleware: Restrict access to designated roles
 * @param  {...string} allowedRoles - E.g. 'admin', 'instructor'
 */
const restrictTo = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Forbidden: You do not have permission to access this resource.',
        requiredRoles: allowedRoles,
        userRole: req.user ? req.user.role : 'unauthenticated',
      });
    }
    next();
  };
};

const optionalProtect = async (req, res, next) => {
  try {
    let token = null;
    if (req.cookies && req.cookies.jwt) {
      token = req.cookies.jwt;
    } else if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer ')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next();
    }

    const secret = getJwtSecret();
    const decoded = jwt.verify(token, secret);

    if (decoded.purpose && decoded.purpose !== 'authenticated') {
      return next();
    }

    const sessionId = decoded.sid || decoded.sessionId;
    if (sessionId) {
      const sessionResult = await validateSession(sessionId, decoded.id);
      if (!sessionResult.valid) {
        return next();
      }
      req.session = sessionResult.session;
      req.sessionId = sessionId;
    }

    const currentUser = await User.findById(decoded.id);

    if (currentUser && currentUser.accountStatus === 'active') {
      req.user = sanitizeUser(currentUser);
      req.userDoc = currentUser;
    }
    next();
  } catch {
    // Fail open for optional auth
    next();
  }
};

module.exports = {
  protect,
  restrictTo,
  optionalProtect,
};
