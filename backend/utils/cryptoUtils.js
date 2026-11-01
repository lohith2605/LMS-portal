const crypto = require('crypto');

/**
 * Derives a 32-byte encryption key from TOTP_ENCRYPTION_KEY or falls back to JWT_SECRET / dev key.
 * Always passes through SHA-256 to guarantee a strict 32-byte buffer for AES-256.
 */
const getEncryptionKey = () => {
  const secret =
    process.env.TOTP_ENCRYPTION_KEY ||
    process.env.JWT_SECRET ||
    'learnspace_development_mfa_encryption_key_fallback';
  return crypto.createHash('sha256').update(secret).digest();
};

/**
 * Encrypt sensitive plaintext (such as TOTP base32 secret) using AES-256-GCM.
 * Output format: "iv:authTag:encryptedData" (hex encoded)
 * @param {string} plaintext
 * @returns {string}
 */
const encryptSecret = (plaintext) => {
  if (!plaintext) return '';
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12); // Standard 96-bit IV for GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
};

/**
 * Decrypt ciphertext previously encrypted with encryptSecret.
 * @param {string} encryptedString - Format: "iv:authTag:encryptedData"
 * @returns {string} Plaintext
 */
const decryptSecret = (encryptedString) => {
  if (!encryptedString || typeof encryptedString !== 'string') return '';
  const parts = encryptedString.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted secret format');
  }

  const [ivHex, authTagHex, encryptedDataHex] = parts;
  const key = getEncryptionKey();
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedDataHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
};

/**
 * Standardize and hash a recovery code for secure database storage.
 * Codes are case-insensitive and hyphen-agnostic during verification.
 * @param {string} code
 * @returns {string} Hex SHA-256 hash
 */
const hashRecoveryCode = (code) => {
  if (!code || typeof code !== 'string') return '';
  const normalized = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  return crypto.createHash('sha256').update(normalized).digest('hex');
};

/**
 * Generate 8 cryptographically secure, human-readable recovery codes.
 * Format: 5 chars - 5 chars (e.g., "7K9P2-W4M8Q")
 * Uses an unambiguous character set excluding 0, O, 1, I.
 * @returns {string[]} Array of 8 formatted plaintext recovery codes
 */
const generateRecoveryCodes = (count = 8) => {
  const charset = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  const codes = [];

  for (let i = 0; i < count; i++) {
    const bytes = crypto.randomBytes(10);
    let part1 = '';
    let part2 = '';
    for (let j = 0; j < 5; j++) {
      part1 += charset[bytes[j] % charset.length];
      part2 += charset[bytes[j + 5] % charset.length];
    }
    codes.push(`${part1}-${part2}`);
  }

  return codes;
};

/**
 * Generate a 6-digit numeric OTP for email verification.
 * @returns {string} 6-digit string
 */
const generateNumericOtp = () => {
  return crypto.randomInt(100000, 1000000).toString();
};

/**
 * Hash a numeric email OTP for secure storage.
 * @param {string} otp
 * @returns {string} Hex SHA-256 hash
 */
const hashOtp = (otp) => {
  if (!otp) return '';
  const normalized = String(otp).trim();
  return crypto.createHash('sha256').update(normalized).digest('hex');
};

/**
 * Generate a unique challenge ID
 * @returns {string}
 */
const generateChallengeId = () => {
  return crypto.randomBytes(24).toString('hex');
};

module.exports = {
  encryptSecret,
  decryptSecret,
  generateRecoveryCodes,
  hashRecoveryCode,
  generateNumericOtp,
  hashOtp,
  generateChallengeId,
};

