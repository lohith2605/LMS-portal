const { logger } = require('../utils/logger');

// Sensitive query parameter keys to sanitize in request URLs
const SENSITIVE_QUERY_PARAMS = [
  'token',
  'password',
  'secret',
  'key',
  'api_key',
  'apikey',
  'auth',
  'code',
  'access_token',
  'refresh_token',
  'reset_token',
  'resettoken',
];

/**
 * Sanitizes sensitive parameters from request URL query string.
 *
 * @param {string} originalUrl
 * @returns {string} Sanitized URL
 */
const sanitizeUrl = (originalUrl) => {
  if (!originalUrl || !originalUrl.includes('?')) {
    return originalUrl;
  }

  const [path, queryString] = originalUrl.split('?');
  const params = new URLSearchParams(queryString);
  const keys = Array.from(params.keys());

  for (const key of keys) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_QUERY_PARAMS.some((sensitive) => lowerKey.includes(sensitive))) {
      params.set(key, '[REDACTED]');
    }
  }

  const sanitizedQuery = decodeURIComponent(params.toString());
  return sanitizedQuery ? `${path}?${sanitizedQuery}` : path;
};

/**
 * Request Logger Middleware
 * Logs each completed request once on response 'finish' with high-precision duration.
 */
const requestLogger = (req, res, next) => {
  const startTime = process.hrtime.bigint();

  res.on('finish', () => {
    const endTime = process.hrtime.bigint();
    // Convert nanoseconds to milliseconds
    const durationNs = Number(endTime - startTime);
    const durationMs = Math.round((durationNs / 1e6) * 10) / 10;

    const safeUrl = sanitizeUrl(req.originalUrl || req.url);
    const statusCode = res.statusCode;

    logger.http(req.method, safeUrl, statusCode, durationMs);
  });

  next();
};

module.exports = requestLogger;
