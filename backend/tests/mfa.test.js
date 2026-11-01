process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_key_12345678901234567890';
const { test, before, beforeEach } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const otplib = require('otplib');
const crypto = require('crypto');
const { app } = require('../server');
const User = require('../models/User');
const {
  signToken,
  signPreAuthToken,
} = require('../utils/authUtils');
const {
  encryptSecret,
  decryptSecret,
  generateRecoveryCodes,
  hashRecoveryCode,
  generateNumericOtp,
  hashOtp,
} = require('../utils/cryptoUtils');

// Shared mock database store for in-memory testing
const mockUsers = [];

// Helper to create mock Mongoose-like User document
const createMockUserDoc = (data) => {
  const doc = {
    _id: data._id || new (require('mongoose').Types.ObjectId)(),
    name: data.name || 'Test User',
    email: (data.email || 'test@example.com').toLowerCase().trim(),
    password: data.password || 'Password123',
    role: data.role || 'student',
    accountStatus: data.accountStatus || 'active',
    emailVerified: data.emailVerified !== undefined ? data.emailVerified : true,
    mfa: data.mfa || {
      enabled: false,
      enforced: false,
      preferredMethod: 'totp',
      totp: {},
      emailOtp: {},
      recoveryCodes: [],
    },
    createdAt: new Date(),
    updatedAt: new Date(),

    async comparePassword(candidate) {
      return candidate === this.password;
    },
    changedPasswordAfter() {
      return false;
    },
    async save() {
      this.updatedAt = new Date();
      return this;
    },
    toObject() {
      return { ...this };
    },
    toJSON() {
      const copy = { ...this };
      delete copy.password;
      if (copy.mfa) {
        if (copy.mfa.totp) {
          delete copy.mfa.totp.secret;
          delete copy.mfa.totp.pendingSecret;
          delete copy.mfa.totp.lastUsedTimeStep;
        }
        if (copy.mfa.emailOtp) {
          delete copy.mfa.emailOtp.codeHash;
        }
        if (Array.isArray(copy.mfa.recoveryCodes)) {
          copy.mfa.recoveryCodesRemaining = copy.mfa.recoveryCodes.filter((rc) => !rc.used).length;
          delete copy.mfa.recoveryCodes;
        }
        delete copy.mfa.currentChallenge;
      }
      return copy;
    },
  };

  return doc;
};

before(() => {
  // Mock User.findById
  User.findById = (id) => {
    const resolveFound = () => {
      const found = mockUsers.find(
        (u) => u._id.toString() === id?.toString() || u.id?.toString() === id?.toString()
      );
      return found || null;
    };

    const query = {
      select: () => query,
      then: (resolve, reject) => {
        try {
          return resolve(resolveFound());
        } catch (err) {
          return reject(err);
        }
      },
    };
    return query;
  };

  // Mock User.findOne
  User.findOne = (criteria) => {
    const resolveFound = () => {
      let found = null;
      if (criteria.email) {
        found = mockUsers.find((u) => u.email === criteria.email.toLowerCase().trim());
      } else if (criteria['passwordResetTokenHash']) {
        found = mockUsers.find(
          (u) => u.passwordResetTokenHash === criteria.passwordResetTokenHash
        );
      } else if (criteria._id) {
        found = mockUsers.find((u) => u._id.toString() === criteria._id.toString());
      }
      return found || null;
    };

    const query = {
      select: () => query,
      then: (resolve, reject) => {
        try {
          return resolve(resolveFound());
        } catch (err) {
          return reject(err);
        }
      },
    };
    return query;
  };
});

beforeEach(() => {
  mockUsers.length = 0;
});

// ============================================================================
// 1. MFA Status Queries
// ============================================================================
test('1. GET /api/auth/mfa/status returns 401 when unauthenticated', async () => {
  const res = await request(app).get('/api/auth/mfa/status');
  assert.strictEqual(res.status, 401);
});

test('2. GET /api/auth/mfa/status returns status for authenticated user without MFA', async () => {
  const user = createMockUserDoc({
    email: 'student@example.com',
    role: 'student',
  });
  mockUsers.push(user);
  const token = signToken(user);

  const res = await request(app)
    .get('/api/auth/mfa/status')
    .set('Cookie', [`jwt=${token}`]);

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.success, true);
  assert.strictEqual(res.body.mfa.enabled, false);
  assert.strictEqual(res.body.mfa.enforced, false);
  assert.strictEqual(res.body.mfa.totpConfigured, false);
  assert.strictEqual(res.body.mfa.emailOtpConfigured, false);
});

// ============================================================================
// 2. TOTP Setup and Verification
// ============================================================================
test('3. POST /api/auth/mfa/totp/setup returns QR code and manual entry key', async () => {
  const user = createMockUserDoc({ email: 'totp.user@example.com' });
  mockUsers.push(user);
  const token = signToken(user);

  const res = await request(app)
    .post('/api/auth/mfa/totp/setup')
    .set('Cookie', [`jwt=${token}`]);

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.success, true);
  assert.ok(res.body.qrCode.startsWith('data:image/png;base64,'));
  assert.ok(res.body.secret);
  assert.ok(res.body.manualEntryKey);
  assert.ok(user.mfa.totp.pendingSecret);
});

test('4. POST /api/auth/mfa/totp/verify rejects invalid 6-digit code', async () => {
  const user = createMockUserDoc({ email: 'totp.user@example.com' });
  const rawSecret = otplib.generateSecret();
  user.mfa.totp.pendingSecret = encryptSecret(rawSecret);
  mockUsers.push(user);
  const token = signToken(user);

  const res = await request(app)
    .post('/api/auth/mfa/totp/verify')
    .set('Cookie', [`jwt=${token}`])
    .send({ code: '000000' });

  assert.strictEqual(res.status, 400);
  assert.ok(res.body.message.includes('Invalid verification code'));
  assert.strictEqual(user.mfa.enabled, false);
});

test('5. POST /api/auth/mfa/totp/verify confirms enrollment and returns 8 recovery codes', async () => {
  const user = createMockUserDoc({ email: 'totp.user@example.com' });
  const rawSecret = otplib.generateSecret();
  user.mfa.totp.pendingSecret = encryptSecret(rawSecret);
  mockUsers.push(user);
  const token = signToken(user);

  const validCode = otplib.generateSync({ secret: rawSecret });

  const res = await request(app)
    .post('/api/auth/mfa/totp/verify')
    .set('Cookie', [`jwt=${token}`])
    .send({ code: validCode });

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.success, true);
  assert.strictEqual(user.mfa.enabled, true);
  assert.strictEqual(user.mfa.totp.verified, true);
  assert.strictEqual(user.mfa.totp.pendingSecret, undefined);
  assert.strictEqual(Array.isArray(res.body.recoveryCodes), true);
  assert.strictEqual(res.body.recoveryCodes.length, 8);
  assert.strictEqual(user.mfa.recoveryCodes.length, 8);
});

// ============================================================================
// 3. User Login Challenge Interception & TOTP Verification
// ============================================================================
test('6. Student with MFA enabled receives 2FA challenge on password login', async () => {
  const rawSecret = otplib.generateSecret();
  const user = createMockUserDoc({
    email: 'mfa.student@example.com',
    password: 'Password123',
    role: 'student',
    mfa: {
      enabled: true,
      preferredMethod: 'totp',
      totp: {
        secret: encryptSecret(rawSecret),
        verified: true,
      },
      recoveryCodes: [],
    },
  });
  mockUsers.push(user);

  const res = await request(app).post('/api/auth/login').send({
    email: 'mfa.student@example.com',
    password: 'Password123',
  });

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.mfaRequired, true);
  assert.strictEqual(res.body.method, 'totp');
  assert.ok(res.body.preAuthToken);
  // Verify no session cookie was set
  const cookies = res.headers['set-cookie'] || [];
  assert.strictEqual(cookies.some((c) => c.includes('jwt=') && c.includes('HttpOnly')), false);
});

test('7. POST /api/auth/mfa/verify-challenge verifies TOTP code and logs in user', async () => {
  const rawSecret = otplib.generateSecret();
  const challengeId = 'ch_test_123';
  const user = createMockUserDoc({
    email: 'mfa.student@example.com',
    mfa: {
      enabled: true,
      preferredMethod: 'totp',
      totp: {
        secret: encryptSecret(rawSecret),
        verified: true,
      },
      currentChallenge: {
        challengeId,
        method: 'totp',
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        used: false,
      },
    },
  });
  mockUsers.push(user);

  const preAuthToken = signPreAuthToken(user, challengeId, 'totp');
  const validCode = otplib.generateSync({ secret: rawSecret });

  const res = await request(app).post('/api/auth/mfa/verify-challenge').send({
    preAuthToken,
    code: validCode,
  });

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.success, true);
  assert.strictEqual(res.body.user.email, 'mfa.student@example.com');
  assert.strictEqual(user.mfa.currentChallenge.used, true);
  // Verify session cookie was issued
  const cookies = res.headers['set-cookie'] || [];
  assert.ok(cookies.some((c) => c.includes('jwt=') && c.includes('HttpOnly')));
});

test('8. Replay prevention: Consumed challenge cannot be reused', async () => {
  const rawSecret = otplib.generateSecret();
  const challengeId = 'ch_consumed';
  const user = createMockUserDoc({
    email: 'mfa.student@example.com',
    mfa: {
      enabled: true,
      preferredMethod: 'totp',
      totp: {
        secret: encryptSecret(rawSecret),
        verified: true,
      },
      currentChallenge: {
        challengeId,
        method: 'totp',
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        used: true, // Already consumed
      },
    },
  });
  mockUsers.push(user);

  const preAuthToken = signPreAuthToken(user, challengeId, 'totp');
  const validCode = otplib.generateSync({ secret: rawSecret });

  const res = await request(app).post('/api/auth/mfa/verify-challenge').send({
    preAuthToken,
    code: validCode,
  });

  assert.strictEqual(res.status, 401);
  assert.ok(res.body.message.includes('invalid') || res.body.message.includes('expired'));
});

// ============================================================================
// 4. Recovery Code Authentication
// ============================================================================
test('9. Backup recovery code successfully fulfills 2FA login challenge', async () => {
  const recoveryPlain = '7K9P2-W4M8Q';
  const challengeId = 'ch_rec_1';
  const user = createMockUserDoc({
    email: 'mfa.student@example.com',
    mfa: {
      enabled: true,
      preferredMethod: 'totp',
      totp: {
        secret: encryptSecret(otplib.generateSecret()),
        verified: true,
      },
      recoveryCodes: [
        {
          codeHash: hashRecoveryCode(recoveryPlain),
          used: false,
        },
      ],
      currentChallenge: {
        challengeId,
        method: 'totp',
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        used: false,
      },
    },
  });
  mockUsers.push(user);

  const preAuthToken = signPreAuthToken(user, challengeId, 'totp');

  // Case-insensitive, hyphen-agnostic test: "7k9p2w4m8q"
  const res = await request(app).post('/api/auth/mfa/verify-challenge').send({
    preAuthToken,
    code: '7k9p2w4m8q',
    isRecoveryCode: true,
  });

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.success, true);
  assert.strictEqual(user.mfa.recoveryCodes[0].used, true);
  assert.ok(user.mfa.recoveryCodes[0].usedAt);
});

test('10. Used recovery code cannot be reused again', async () => {
  const recoveryPlain = 'USED1-CODE2';
  const challengeId = 'ch_rec_used';
  const user = createMockUserDoc({
    email: 'mfa.student@example.com',
    mfa: {
      enabled: true,
      preferredMethod: 'totp',
      recoveryCodes: [
        {
          codeHash: hashRecoveryCode(recoveryPlain),
          used: true, // Already used
          usedAt: new Date(),
        },
      ],
      currentChallenge: {
        challengeId,
        method: 'totp',
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        used: false,
      },
    },
  });
  mockUsers.push(user);

  const preAuthToken = signPreAuthToken(user, challengeId, 'totp');

  const res = await request(app).post('/api/auth/mfa/verify-challenge').send({
    preAuthToken,
    code: recoveryPlain,
    isRecoveryCode: true,
  });

  assert.strictEqual(res.status, 400);
  assert.ok(res.body.message.includes('already-used'));
});

// ============================================================================
// 5. Email OTP Setup and Login Flow
// ============================================================================
test('11. POST /api/auth/mfa/email-otp/setup dispatches email code to student', async () => {
  const user = createMockUserDoc({
    email: 'email.otp@example.com',
    role: 'student',
  });
  mockUsers.push(user);
  const token = signToken(user);

  const res = await request(app)
    .post('/api/auth/mfa/email-otp/setup')
    .set('Cookie', [`jwt=${token}`]);

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.success, true);
  assert.ok(user.mfa.emailOtp.codeHash);
  assert.ok(user.mfa.emailOtp.expiresAt);
});

test('12. Email OTP setup enforces 60-second cooldown rate limit (429)', async () => {
  const user = createMockUserDoc({
    email: 'email.otp@example.com',
    role: 'student',
    mfa: {
      emailOtp: {
        lastSentAt: new Date(Date.now() - 15 * 1000), // 15 seconds ago
      },
    },
  });
  mockUsers.push(user);
  const token = signToken(user);

  const res = await request(app)
    .post('/api/auth/mfa/email-otp/setup')
    .set('Cookie', [`jwt=${token}`]);

  assert.strictEqual(res.status, 429);
  assert.ok(res.body.message.includes('Please wait'));
});

test('13. POST /api/auth/mfa/email-otp/verify confirms Email OTP setup', async () => {
  const plainOtp = '123456';
  const user = createMockUserDoc({
    email: 'email.otp@example.com',
    role: 'student',
    mfa: {
      emailOtp: {
        codeHash: hashOtp(plainOtp),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    },
  });
  mockUsers.push(user);
  const token = signToken(user);

  const res = await request(app)
    .post('/api/auth/mfa/email-otp/verify')
    .set('Cookie', [`jwt=${token}`])
    .send({ code: plainOtp });

  assert.strictEqual(res.status, 200);
  assert.strictEqual(user.mfa.enabled, true);
  assert.strictEqual(user.mfa.emailOtp.verified, true);
  assert.strictEqual(user.mfa.preferredMethod, 'email_otp');
});

test('14. Student with Email OTP preferred receives email challenge on password login', async () => {
  const user = createMockUserDoc({
    email: 'email.login@example.com',
    password: 'Password123',
    role: 'student',
    mfa: {
      enabled: true,
      preferredMethod: 'email_otp',
      emailOtp: {
        verified: true,
      },
    },
  });
  mockUsers.push(user);

  const res = await request(app).post('/api/auth/login').send({
    email: 'email.login@example.com',
    password: 'Password123',
  });

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.mfaRequired, true);
  assert.strictEqual(res.body.method, 'email_otp');
  assert.ok(res.body.preAuthToken);
  assert.ok(user.mfa.emailOtp.codeHash);
});

// ============================================================================
// 6. Administrator Mandatory TOTP & Role Protection
// ============================================================================
test('15. Administrator CANNOT disable Two-Factor Authentication (403 Forbidden)', async () => {
  const admin = createMockUserDoc({
    email: 'admin@learnspace.io',
    role: 'admin',
    password: 'Password123',
    mfa: {
      enabled: true,
      enforced: true,
      preferredMethod: 'totp',
      totp: {
        secret: encryptSecret(otplib.generateSecret()),
        verified: true,
      },
    },
  });
  mockUsers.push(admin);
  const token = signToken(admin);

  const res = await request(app)
    .post('/api/auth/mfa/disable')
    .set('Cookie', [`jwt=${token}`])
    .send({ password: 'Password123', code: '123456' });

  assert.strictEqual(res.status, 403);
  assert.ok(res.body.message.includes('mandatory for administrative accounts'));
});

test('16. Administrator CANNOT switch preferred method to Email OTP (403 Forbidden)', async () => {
  const admin = createMockUserDoc({
    email: 'admin@learnspace.io',
    role: 'admin',
    password: 'Password123',
    mfa: {
      enabled: true,
      enforced: true,
      preferredMethod: 'totp',
      totp: {
        secret: encryptSecret(otplib.generateSecret()),
        verified: true,
      },
      emailOtp: {
        verified: true,
      },
    },
  });
  mockUsers.push(admin);
  const token = signToken(admin);

  const res = await request(app)
    .put('/api/auth/mfa/preference')
    .set('Cookie', [`jwt=${token}`])
    .send({ preferredMethod: 'email_otp', password: 'Password123' });

  assert.strictEqual(res.status, 403);
  assert.ok(res.body.message.includes('must maintain Google Authenticator'));
});

test('17. Administrator CANNOT set up Email OTP (403 Forbidden)', async () => {
  const admin = createMockUserDoc({
    email: 'admin@learnspace.io',
    role: 'admin',
  });
  mockUsers.push(admin);
  const token = signToken(admin);

  const res = await request(app)
    .post('/api/auth/mfa/email-otp/setup')
    .set('Cookie', [`jwt=${token}`]);

  assert.strictEqual(res.status, 403);
  assert.ok(res.body.message.includes('must use Google Authenticator TOTP'));
});

// ============================================================================
// 7. Recovery Code Regeneration
// ============================================================================
test('18. POST /api/auth/mfa/recovery-codes/regenerate creates 8 fresh codes and requires password', async () => {
  const user = createMockUserDoc({
    email: 'student@example.com',
    password: 'Password123',
    mfa: {
      enabled: true,
      recoveryCodes: [
        { codeHash: 'old_hash_1', used: true },
        { codeHash: 'old_hash_2', used: false },
      ],
    },
  });
  mockUsers.push(user);
  const token = signToken(user);

  // Wrong password
  const failRes = await request(app)
    .post('/api/auth/mfa/recovery-codes/regenerate')
    .set('Cookie', [`jwt=${token}`])
    .send({ password: 'WrongPassword' });

  assert.strictEqual(failRes.status, 401);

  // Correct password
  const successRes = await request(app)
    .post('/api/auth/mfa/recovery-codes/regenerate')
    .set('Cookie', [`jwt=${token}`])
    .send({ password: 'Password123' });

  assert.strictEqual(successRes.status, 200);
  assert.strictEqual(successRes.body.recoveryCodes.length, 8);
  assert.strictEqual(user.mfa.recoveryCodes.length, 8);
  assert.strictEqual(user.mfa.recoveryCodes.every((rc) => !rc.used), true);
});

// ============================================================================
// 8. Disabling MFA (Students / Instructors)
// ============================================================================
test('19. Student can disable MFA with valid password and verification code', async () => {
  const rawSecret = otplib.generateSecret();
  const user = createMockUserDoc({
    email: 'student@example.com',
    password: 'Password123',
    mfa: {
      enabled: true,
      enforced: false,
      preferredMethod: 'totp',
      totp: {
        secret: encryptSecret(rawSecret),
        verified: true,
      },
      recoveryCodes: [],
    },
  });
  mockUsers.push(user);
  const token = signToken(user);

  const validCode = otplib.generateSync({ secret: rawSecret });

  const res = await request(app)
    .post('/api/auth/mfa/disable')
    .set('Cookie', [`jwt=${token}`])
    .send({ password: 'Password123', code: validCode });

  assert.strictEqual(res.status, 200);
  assert.strictEqual(user.mfa.enabled, false);
  assert.strictEqual(user.mfa.totp.verified, false);
});

// ============================================================================
// 9. Administrator Mandatory Bootstrap Flow
// ============================================================================
test('20. Unconfigured administrator gets mandatory setup challenge', async () => {
  const admin = createMockUserDoc({
    email: 'admin.bootstrap@learnspace.io',
    password: 'AdminPassword123!',
    role: 'admin',
    accountStatus: 'active',
  });
  mockUsers.push(admin);

  const res = await request(app).post('/api/auth/admin/login').send({
    email: 'admin.bootstrap@learnspace.io',
    password: 'AdminPassword123!',
  });

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.mfaRequired, true);
  assert.strictEqual(res.body.mfaSetupRequired, true);
  assert.strictEqual(res.body.method, 'totp');
  assert.ok(res.body.preAuthToken);
});

test('21. setupAdminTotpInit returns enrollment QR code and secret', async () => {
  const admin = createMockUserDoc({
    email: 'admin.bootstrap@learnspace.io',
    role: 'admin',
  });
  mockUsers.push(admin);

  const preAuthToken = signPreAuthToken(admin, 'ch_init', 'totp', { mfaSetupRequired: true });

  const res = await request(app).post('/api/auth/mfa/admin-init-setup').send({
    preAuthToken,
  });

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.success, true);
  assert.ok(res.body.qrCode.startsWith('data:image/png;base64,'));
  assert.ok(res.body.secret);
  assert.ok(admin.mfa.totp.pendingSecret);
});

test('22. confirmAdminTotpSetup rejects invalid 6-digit code', async () => {
  const admin = createMockUserDoc({
    email: 'admin.bootstrap@learnspace.io',
    role: 'admin',
    mfa: {
      totp: {
        pendingSecret: encryptSecret(otplib.generateSecret()),
      },
      currentChallenge: {
        challengeId: 'ch_confirm',
        used: false,
      },
    },
  });
  mockUsers.push(admin);

  const preAuthToken = signPreAuthToken(admin, 'ch_confirm', 'totp', { mfaSetupRequired: true });

  const res = await request(app).post('/api/auth/mfa/admin-confirm-setup').send({
    preAuthToken,
    code: '000000',
  });

  assert.strictEqual(res.status, 400);
  assert.ok(res.body.message.includes('Invalid 6-digit authenticator code'));
});

test('23. confirmAdminTotpSetup activates mandatory 2FA, issues session cookie, returns recovery codes', async () => {
  const rawSecret = otplib.generateSecret();
  const admin = createMockUserDoc({
    email: 'admin.bootstrap@learnspace.io',
    role: 'admin',
    mfa: {
      totp: {
        pendingSecret: encryptSecret(rawSecret),
      },
      currentChallenge: {
        challengeId: 'ch_confirm',
        used: false,
      },
    },
  });
  mockUsers.push(admin);

  const preAuthToken = signPreAuthToken(admin, 'ch_confirm', 'totp', { mfaSetupRequired: true });
  const validCode = otplib.generateSync({ secret: rawSecret });

  const res = await request(app).post('/api/auth/mfa/admin-confirm-setup').send({
    preAuthToken,
    code: validCode,
  });

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.success, true);
  assert.strictEqual(admin.mfa.enforced, true);
  assert.strictEqual(admin.mfa.totp.verified, true);
  assert.strictEqual(admin.mfa.recoveryCodes.length, 8);
  assert.strictEqual(res.body.recoveryCodes.length, 8);
  const cookies = res.headers['set-cookie'] || [];
  assert.ok(cookies.some((c) => c.includes('jwt=') && c.includes('HttpOnly')));
});

test('24. resendMfaEmailOtp enforces 60-second cooldown during login challenge', async () => {
  const user = createMockUserDoc({
    email: 'resend.student@example.com',
    role: 'student',
    mfa: {
      emailOtp: {
        lastSentAt: new Date(), // Sent just now
      },
    },
  });
  mockUsers.push(user);

  const preAuthToken = signPreAuthToken(user, 'ch_resend', 'email_otp');

  const res = await request(app).post('/api/auth/mfa/resend-email-otp').send({
    preAuthToken,
  });

  assert.strictEqual(res.status, 429);
  assert.ok(res.body.message.includes('Please wait'));
});

test('25. Expired preAuthToken is rejected with 401', async () => {
  const jwt = require('jsonwebtoken');
  const expiredToken = jwt.sign(
    { id: 'user_1', purpose: 'mfa_pending', challengeId: 'ch_exp' },
    process.env.JWT_SECRET,
    { expiresIn: '-1s' }
  );

  const res = await request(app).post('/api/auth/mfa/verify-challenge').send({
    preAuthToken: expiredToken,
    code: '123456',
  });

  assert.strictEqual(res.status, 401);
  assert.ok(res.body.message.includes('expired'));
});

test('26. Missing preAuthToken returns 401 Unauthorized', async () => {
  const res = await request(app).post('/api/auth/mfa/verify-challenge').send({
    code: '123456',
  });

  assert.strictEqual(res.status, 401);
});
