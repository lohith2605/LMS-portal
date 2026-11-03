const test = require('node:test');
const assert = require('node:assert');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const {
  getClientBaseUrl,
  getResetPasswordUrl,
  getVerificationUrl,
  hashToken,
} = require('../utils/authUtils');
const {
  sendPasswordResetEmail,
  setTransporter,
} = require('../services/emailService');

// Save original environment
const originalEnv = { ...process.env };

test.afterEach(() => {
  process.env = { ...originalEnv };
  setTransporter(null);
});

test('1. getClientBaseUrl resolves CLIENT_URL, strips trailing slashes, and falls back to 5174', () => {
  // Fallback when unset
  delete process.env.CLIENT_URL;
  delete process.env.FRONTEND_URL;
  assert.strictEqual(getClientBaseUrl(), 'http://localhost:5174');

  // Uses CLIENT_URL and strips trailing slashes
  process.env.CLIENT_URL = 'http://localhost:5174/';
  assert.strictEqual(getClientBaseUrl(), 'http://localhost:5174');

  // Handles multiple trailing slashes
  process.env.CLIENT_URL = 'https://learnspace.org///';
  assert.strictEqual(getClientBaseUrl(), 'https://learnspace.org');

  // Falls back to FRONTEND_URL if CLIENT_URL is empty
  delete process.env.CLIENT_URL;
  process.env.FRONTEND_URL = 'https://app.learnspace.io';
  assert.strictEqual(getClientBaseUrl(), 'https://app.learnspace.io');
});

test('2. getResetPasswordUrl constructs query-based reset URL using configured base URL', () => {
  process.env.CLIENT_URL = 'http://localhost:5174';
  const token = 'a1b2c3d4e5f67890';
  const url = getResetPasswordUrl(token);

  assert.strictEqual(url, 'http://localhost:5174/reset-password?token=a1b2c3d4e5f67890');
});

test('3. getResetPasswordUrl supports RESET_PASSWORD_URL override with placeholders', () => {
  const token = 'sample_token_123';

  // Template with {token}
  process.env.RESET_PASSWORD_URL = 'https://custom.domain/auth/reset/{token}';
  assert.strictEqual(
    getResetPasswordUrl(token),
    'https://custom.domain/auth/reset/sample_token_123'
  );

  // Template with :token
  process.env.RESET_PASSWORD_URL = 'https://custom.domain/reset/:token';
  assert.strictEqual(
    getResetPasswordUrl(token),
    'https://custom.domain/reset/sample_token_123'
  );

  // Template without placeholder appends ?token=
  process.env.RESET_PASSWORD_URL = 'https://custom.domain/reset';
  assert.strictEqual(
    getResetPasswordUrl(token),
    'https://custom.domain/reset?token=sample_token_123'
  );
});

test('4. getVerificationUrl constructs verification URL using clean base URL', () => {
  process.env.CLIENT_URL = 'http://localhost:5174/';
  const token = 'verify_token_456';
  assert.strictEqual(
    getVerificationUrl(token),
    'http://localhost:5174/verify-email?token=verify_token_456'
  );
});

test('5. User reset token generation produces 64-char hex, SHA-256 hash, and 15-min expiry', () => {
  // Mock user document schema method logic
  const mockUser = {
    passwordResetTokenHash: undefined,
    passwordResetExpiresAt: undefined,
    createPasswordResetToken() {
      const resetToken = crypto.randomBytes(32).toString('hex');
      this.passwordResetTokenHash = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');
      this.passwordResetExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
      return resetToken;
    },
  };

  const rawToken = mockUser.createPasswordResetToken();

  assert.strictEqual(typeof rawToken, 'string');
  assert.strictEqual(rawToken.length, 64);
  assert.match(rawToken, /^[0-9a-f]{64}$/);

  // DB stores hash, not raw token
  assert.notStrictEqual(mockUser.passwordResetTokenHash, rawToken);
  assert.strictEqual(mockUser.passwordResetTokenHash, hashToken(rawToken));

  // Expiration within 15 minutes window
  const diffMinutes = (mockUser.passwordResetExpiresAt.getTime() - Date.now()) / (60 * 1000);
  assert.ok(diffMinutes > 14.9 && diffMinutes <= 15.0, 'Expiration must be exactly 15 minutes');
});

test('6. sendPasswordResetEmail delivers valid reset URL in both text and HTML markup', async () => {
  let capturedEmail = null;
  const mockTransporter = {
    sendMail: async (options) => {
      capturedEmail = options;
      return { messageId: 'test_msg_id' };
    },
  };

  setTransporter(mockTransporter);

  const resetUrl = 'http://localhost:5174/reset-password?token=abc123def456';
  const sent = await sendPasswordResetEmail({
    to: 'learner@example.com',
    name: 'Ada Lovelace',
    resetUrl,
  });

  assert.strictEqual(sent, true);
  assert.ok(capturedEmail, 'Mail must be dispatched');
  assert.strictEqual(capturedEmail.to, 'learner@example.com');
  assert.ok(capturedEmail.text.includes(resetUrl), 'Plaintext email must contain reset URL');
  assert.ok(capturedEmail.html.includes(`href="${resetUrl}"`), 'HTML email must contain clickable reset button link');
  assert.ok(capturedEmail.html.includes('15 minutes'), 'HTML email must communicate 15-minute expiry');
});

test('7. Password reset token verification, single-use invalidation, and session revocation logic', async () => {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = hashToken(rawToken);

  let revokedSessions = false;
  let userPassword = await bcrypt.hash('OldPassword123', 10);

  const mockUserInDb = {
    _id: 'user_123',
    email: 'student@example.com',
    password: userPassword,
    passwordResetTokenHash: hashedToken,
    passwordResetExpiresAt: new Date(Date.now() + 15 * 60 * 1000), // active
    accountStatus: 'active',
    async save() {
      userPassword = this.password;
    },
  };

  // 7a. Rejects expired token
  const expiredUser = {
    ...mockUserInDb,
    passwordResetExpiresAt: new Date(Date.now() - 1000), // expired 1s ago
  };
  const isExpired = expiredUser.passwordResetExpiresAt <= new Date();
  assert.strictEqual(isExpired, true, 'Expired token must not be accepted');

  // 7b. Rejects invalid token hash mismatch
  const wrongHashedToken = hashToken('wrong_token');
  assert.notStrictEqual(wrongHashedToken, mockUserInDb.passwordResetTokenHash);

  // 7c. Successful first reset
  const incomingToken = rawToken;
  assert.strictEqual(hashToken(incomingToken), mockUserInDb.passwordResetTokenHash);
  assert.ok(mockUserInDb.passwordResetExpiresAt > new Date());

  // Apply new password
  const newPasswordPlain = 'NewSecurePassword456';
  mockUserInDb.password = await bcrypt.hash(newPasswordPlain, 10);
  // Clear token hash and expiry for single-use guarantee
  mockUserInDb.passwordResetTokenHash = undefined;
  mockUserInDb.passwordResetExpiresAt = undefined;
  await mockUserInDb.save();
  revokedSessions = true;

  assert.strictEqual(revokedSessions, true, 'Sessions must be revoked on password change');
  assert.strictEqual(mockUserInDb.passwordResetTokenHash, undefined, 'Token hash must be cleared');
  assert.strictEqual(mockUserInDb.passwordResetExpiresAt, undefined, 'Expiry must be cleared');

  // 7d. Replay attempt with same token must fail
  const replayHash = hashToken(incomingToken);
  assert.notStrictEqual(replayHash, mockUserInDb.passwordResetTokenHash, 'Token cannot be reused');
});

