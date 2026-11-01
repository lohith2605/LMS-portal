const jwt = require('jsonwebtoken');
const crypto = require('crypto');

/**
 * Centralized JWT signing secret retriever
 * Enforces production security by failing fast if secret is missing in production
 * @returns {string}
 */
const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('FATAL: JWT_SECRET environment variable is missing in production.');
    }
    return 'learnspace_development_jwt_secret_fallback_key';
  }
  return secret;
};

/**
 * Sign JWT authentication token bound to user and database session
 * @param {Object} user - User document or object with _id and role
 * @param {string|Object} [sessionId] - Optional database session identifier (sid)
 * @returns {string} Signed JWT
 */
const signToken = (user, sessionId = null) => {
  const secret = getJwtSecret();
  const expiresIn = process.env.JWT_EXPIRES_IN || '8h';

  const payload = {
    id: user._id ? user._id.toString() : user.id,
    role: user.role,
  };

  if (sessionId) {
    payload.sid = sessionId._id ? sessionId._id.toString() : sessionId.toString();
  }

  return jwt.sign(payload, secret, { expiresIn });
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
    maxAge: 8 * 60 * 60 * 1000, // 8 hours in milliseconds (matches 8-hour absolute session lifetime)
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

  let safeAvatar = null;
  if (typeof raw.avatar === 'string' && raw.avatar.trim()) {
    safeAvatar = { url: raw.avatar, publicId: null };
  } else if (raw.avatar && raw.avatar.url) {
    safeAvatar = { url: raw.avatar.url, publicId: raw.avatar.publicId || null };
  }

  return {
    id,
    _id: id,
    name: raw.name,
    email: raw.email,
    role: raw.role,
    accountStatus: raw.accountStatus,
    emailVerified: Boolean(raw.emailVerified),
    avatar: safeAvatar,
    createdAt: raw.createdAt,
    lastLoginAt: raw.lastLoginAt,
    mfaEnabled: Boolean(raw.mfa?.enabled),
    mfaMethod: raw.mfa?.preferredMethod || null,
  };
};

/**
 * Sign restricted, short-lived pre-authentication token for MFA challenge
 * @param {Object} user - User document or minimal identity
 * @param {string} challengeId - Unique challenge ID
 * @param {string} method - 'totp' | 'email_otp'
 * @param {Object} [meta] - Optional metadata (e.g., mfaSetupRequired)
 * @returns {string} Signed JWT
 */
const signPreAuthToken = (user, challengeId, method = 'totp', meta = {}) => {
  const secret = getJwtSecret();

  return jwt.sign(
    {
      id: user._id ? user._id.toString() : user.id,
      role: user.role,
      purpose: 'mfa_pending',
      challengeId,
      method,
      mfaSetupRequired: Boolean(meta.mfaSetupRequired),
    },
    secret,
    { expiresIn: '5m' }
  );
};

/**
 * Verify and decode a pre-authentication MFA token
 * @param {string} token
 * @returns {Object} Decoded payload
 */
const verifyPreAuthToken = (token) => {
  if (!token) {
    const error = new Error('Pre-authentication token is required');
    error.statusCode = 401;
    throw error;
  }

  const secret = getJwtSecret();

  try {
    const decoded = jwt.verify(token, secret);
    if (decoded.purpose !== 'mfa_pending') {
      const err = new Error('Invalid token purpose');
      err.statusCode = 401;
      throw err;
    }
    return decoded;
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      const error = new Error('Two-factor verification window has expired. Please sign in again.');
      error.statusCode = 401;
      throw error;
    }
    const error = new Error('Invalid two-factor session token. Please sign in again.');
    error.statusCode = 401;
    throw error;
  }
};

module.exports = {
  getJwtSecret,
  signToken,
  getCookieOptions,
  sendAuthCookie,
  clearAuthCookie,
  hashToken,
  sanitizeUser,
  signPreAuthToken,
  verifyPreAuthToken,
};
