const jwt = require('jsonwebtoken');
const crypto = require('crypto');

/**
 * Sign JWT authentication token
 * @param {Object} user - User document or object with _id and role
 * @returns {string} Signed JWT
 */
const signToken = (user) => {
  const secret = process.env.JWT_SECRET || 'learnspace_development_jwt_secret_fallback_key';
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';

  return jwt.sign(
    {
      id: user._id ? user._id.toString() : user.id,
      role: user.role,
    },
    secret,
    { expiresIn }
  );
};

/**
 * Common cookie options for authentication JWT
 */
const getCookieOptions = () => {
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
    path: '/',
  };
};

/**
 * Attach JWT to response in an HttpOnly cookie
 * @param {Object} res - Express response object
 * @param {string} token - Signed JWT
 */
const sendAuthCookie = (res, token) => {
  const cookieOptions = getCookieOptions();
  res.cookie('jwt', token, cookieOptions);
};

/**
 * Clear the authentication cookie upon logout
 * @param {Object} res - Express response object
 */
const clearAuthCookie = (res) => {
  const isProduction = process.env.NODE_ENV === 'production';
  res.clearCookie('jwt', {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    path: '/',
  });
};

/**
 * SHA-256 hash helper for one-time tokens (reset tokens, email verify tokens)
 * @param {string} token
 * @returns {string} Hex hash
 */
const hashToken = (token) => {
  if (!token) return '';
  return crypto.createHash('sha256').update(token).digest('hex');
};

/**
 * Return sanitized user object safe for client consumption
 * @param {Object} user - User mongoose document or raw object
 * @returns {Object} Safe profile
 */
const sanitizeUser = (user) => {
  if (!user) return null;
  const raw = user.toObject ? user.toObject() : user;
  const id = raw._id ? raw._id.toString() : (raw.id ? raw.id.toString() : '');

  return {
    id,
    _id: id,
    name: raw.name,
    email: raw.email,
    role: raw.role,
    accountStatus: raw.accountStatus,
    emailVerified: Boolean(raw.emailVerified),
    avatar: raw.avatar || '',
    createdAt: raw.createdAt,
    lastLoginAt: raw.lastLoginAt,
  };
};

module.exports = {
  signToken,
  getCookieOptions,
  sendAuthCookie,
  clearAuthCookie,
  hashToken,
  sanitizeUser,
};
