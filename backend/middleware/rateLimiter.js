const rateLimit = require('express-rate-limit');

const isTest = process.env.NODE_ENV === 'test';

/**
 * Strict limiter for sensitive authentication endpoints (Login, Register)
 * Max 20 requests per 15 minutes per IP (disabled/relaxed in test mode)
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isTest ? 1000 : 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many authentication attempts from this IP. Please try again after 15 minutes.',
  },
  skip: () => isTest,
});

/**
 * Rate limiter for password reset requests (Forgot Password & Reset)
 * Max 5 requests per 15 minutes per IP
 */
const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isTest ? 1000 : 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many password reset attempts. Please try again in 15 minutes.',
  },
  skip: () => isTest,
});

module.exports = {
  authLimiter,
  passwordResetLimiter,
};
