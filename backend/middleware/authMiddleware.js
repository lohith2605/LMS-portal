const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { sanitizeUser } = require('../utils/authUtils');
const { logger } = require('../utils/logger');

/**
 * Middleware: Verify user authentication via HttpOnly cookie or Bearer token header
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
    const secret = process.env.JWT_SECRET || 'learnspace_development_jwt_secret_fallback_key';
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

    // 4. Check if user still exists in database
    const currentUser = await User.findById(decoded.id).select('+passwordChangedAt');
    if (!currentUser) {
      return res.status(401).json({
        error: 'The user account associated with this session no longer exists.',
      });
    }

    // 5. Check account status
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

    // 6. Check if user changed password after the token was issued
    if (currentUser.changedPasswordAfter(decoded.iat)) {
      return res.status(401).json({
        error: 'Password was recently changed. Please log in again.',
      });
    }

    // 7. Attach sanitized user and original document to request
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

module.exports = {
  protect,
  restrictTo,
};
