/**
 * Lightweight, zero-dependency User-Agent and IP parser
 * Extracts operating system, browser, device classification, and sanitized client IP.
 */

/**
 * Parse browser name and approximate version from User-Agent string
 * @param {string} ua
 * @returns {string}
 */
const parseBrowser = (ua) => {
  if (!ua || typeof ua !== 'string') return 'Unknown Browser';

  if (/edg\/([0-9]+)/i.test(ua)) {
    const match = ua.match(/edg\/([0-9]+)/i);
    return `Edge ${match ? match[1] : ''}`.trim();
  }
  if (/opr\/([0-9]+)/i.test(ua) || /opera/i.test(ua)) {
    const match = ua.match(/(?:opr|opera)\/([0-9]+)/i);
    return `Opera ${match ? match[1] : ''}`.trim();
  }
  if (/chrome\/([0-9]+)/i.test(ua) && !/chromium/i.test(ua)) {
    const match = ua.match(/chrome\/([0-9]+)/i);
    return `Chrome ${match ? match[1] : ''}`.trim();
  }
  if (/firefox\/([0-9]+)/i.test(ua)) {
    const match = ua.match(/firefox\/([0-9]+)/i);
    return `Firefox ${match ? match[1] : ''}`.trim();
  }
  if (/version\/([0-9]+).*safari/i.test(ua) || /safari\/([0-9]+)/i.test(ua)) {
    const match = ua.match(/version\/([0-9]+)/i);
    return `Safari ${match ? match[1] : ''}`.trim();
  }
  if (/msie|trident/i.test(ua)) {
    return 'Internet Explorer';
  }

  return 'Standard Web Client';
};

/**
 * Parse operating system from User-Agent string
 * @param {string} ua
 * @returns {string}
 */
const parseOS = (ua) => {
  if (!ua || typeof ua !== 'string') return 'Unknown OS';

  if (/windows phone/i.test(ua)) return 'Windows Phone';
  if (/windows nt 10\.0/i.test(ua)) return 'Windows 11 / 10';
  if (/windows nt 6\.3/i.test(ua)) return 'Windows 8.1';
  if (/windows nt 6\.2/i.test(ua)) return 'Windows 8';
  if (/windows nt 6\.1/i.test(ua)) return 'Windows 7';
  if (/windows/i.test(ua)) return 'Windows';
  if (/iphone|ipad|ipod/i.test(ua)) {
    const match = ua.match(/os (\d+[_.]\d+)/i);
    return `iOS ${match ? match[1].replace('_', '.') : ''}`.trim();
  }
  if (/macintosh|mac os x/i.test(ua)) {
    const match = ua.match(/mac os x (\d+[_.]\d+)/i);
    return `macOS ${match ? match[1].replace('_', '.') : ''}`.trim();
  }
  if (/android/i.test(ua)) {
    const match = ua.match(/android (\d+)/i);
    return `Android ${match ? match[1] : ''}`.trim();
  }
  if (/cros/i.test(ua)) return 'ChromeOS';
  if (/linux/i.test(ua)) return 'Linux';

  return 'Unknown OS';
};

/**
 * Classify device form factor
 * @param {string} ua
 * @returns {'desktop' | 'mobile' | 'tablet' | 'unknown'}
 */
const parseDeviceType = (ua) => {
  if (!ua || typeof ua !== 'string') return 'desktop';

  if (/ipad|tablet|(android(?!.*mobile))/i.test(ua)) {
    return 'tablet';
  }
  if (/mobile|iphone|ipod|blackberry|opera mini|iemobile|wpdesktop/i.test(ua)) {
    return 'mobile';
  }
  return 'desktop';
};

/**
 * Derive client IP address respecting the application's proxy trust policy
 * @param {import('express').Request} req
 * @returns {string} Clean IP address
 */
const parseClientIp = (req) => {
  if (!req) return 'Unknown IP';

  const isProxyTrusted =
    process.env.TRUST_PROXY === 'true' ||
    process.env.TRUST_PROXY === '1' ||
    req.app?.get('trust proxy');

  let ip = '';

  if (isProxyTrusted && req.headers && req.headers['x-forwarded-for']) {
    const forwarded = req.headers['x-forwarded-for'];
    const parts = Array.isArray(forwarded) ? forwarded[0].split(',') : forwarded.split(',');
    ip = parts[0].trim();
  } else if (req.ip) {
    ip = req.ip;
  } else if (req.socket && req.socket.remoteAddress) {
    ip = req.socket.remoteAddress;
  }

  // Normalize IPv6 localhost and mapped IPv4
  if (ip === '::1') ip = '127.0.0.1';
  if (ip.startsWith('::ffff:')) ip = ip.slice(7);

  return ip || 'Unknown IP';
};

/**
 * Extract comprehensive, safe device metadata from an Express request
 * @param {import('express').Request} req
 * @returns {{ browser: string, os: string, type: 'desktop' | 'mobile' | 'tablet' | 'unknown', userAgent: string, ipAddress: string }}
 */
const parseRequestDevice = (req) => {
  const rawUa = req?.headers?.['user-agent'] || '';
  const sanitizedUa = rawUa.slice(0, 500);

  return {
    browser: parseBrowser(sanitizedUa),
    os: parseOS(sanitizedUa),
    type: parseDeviceType(sanitizedUa),
    userAgent: sanitizedUa || 'Unknown User-Agent',
    ipAddress: parseClientIp(req),
  };
};

module.exports = {
  parseBrowser,
  parseOS,
  parseDeviceType,
  parseClientIp,
  parseRequestDevice,
};

