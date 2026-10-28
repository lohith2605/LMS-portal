const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { app } = require('../server');
const User = require('../models/User');

const TEST_SECRET = 'test_jwt_secret_key_12345678901234567890';
process.env.JWT_SECRET = TEST_SECRET;
process.env.NODE_ENV = 'test';

// In-memory mock database of users for isolated test suite
let mockUsers = [];
let nextId = 1;

const resetMockDb = () => {
  mockUsers = [];
  nextId = 1;
};

// Helper to create a mock user object with Mongoose methods
const createMockUserDoc = (data) => {
  const salt = bcrypt.genSaltSync(10);
  const hashedPassword = bcrypt.hashSync(data.password, salt);

  const doc = {
    _id: data._id || `user_${nextId++}`,
    name: data.name,
    email: data.email.toLowerCase(),
    password: hashedPassword,
    role: data.role || 'student',
    accountStatus: data.accountStatus || 'active',
    emailVerified: Boolean(data.emailVerified),
    passwordChangedAt: data.passwordChangedAt,
    passwordResetTokenHash: data.passwordResetTokenHash,
    passwordResetExpiresAt: data.passwordResetExpiresAt,
    createdAt: new Date(),
    updatedAt: new Date(),
    async comparePassword(candidate) {
      if (!candidate || !this.password) return false;
      return bcrypt.compare(candidate, this.password);
    },
    changedPasswordAfter(jwtIat) {
      if (this.passwordChangedAt) {
        return jwtIat < parseInt(this.passwordChangedAt.getTime() / 1000, 10);
      }
      return false;
    },
    createPasswordResetToken() {
      const resetToken = crypto.randomBytes(32).toString('hex');
      this.passwordResetTokenHash = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');
      this.passwordResetExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
      return resetToken;
    },
    createEmailVerificationToken() {
      const verifyToken = crypto.randomBytes(32).toString('hex');
      this.emailVerificationTokenHash = crypto
        .createHash('sha256')
        .update(verifyToken)
        .digest('hex');
      this.emailVerificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      return verifyToken;
    },
    async save() {
      // If password changed, rehash
      if (this._newPassword) {
        this.password = bcrypt.hashSync(this._newPassword, 10);
        this.passwordChangedAt = new Date();
        delete this._newPassword;
      }
      const idx = mockUsers.findIndex((u) => u._id === this._id);
      if (idx !== -1) {
        mockUsers[idx] = this;
      } else {
        mockUsers.push(this);
      }
      return this;
    },
    toObject() {
      const copy = { ...this };
      delete copy.password;
      delete copy.passwordResetTokenHash;
      delete copy.passwordResetExpiresAt;
      return copy;
    },
  };

  // Setter for password property to mimic pre-save hashing
  let rawPassword = hashedPassword;
  Object.defineProperty(doc, 'password', {
    get() {
      return rawPassword;
    },
    set(newVal) {
      if (!newVal.startsWith('$2a$') && !newVal.startsWith('$2b$')) {
        rawPassword = bcrypt.hashSync(newVal, 10);
        doc.passwordChangedAt = new Date();
      } else {
        rawPassword = newVal;
      }
    },
    configurable: true,
  });

  return doc;
};

// Helper to create a chainable Mongoose query mock
const createMockQuery = (doc) => {
  const p = Promise.resolve(doc);
  p.select = () => p;
  return p;
};

// Mock User methods
test.beforeEach(() => {
  resetMockDb();

  User.findOne = (query) => {
    let found = null;
    if (query.email) {
      found = mockUsers.find((u) => u.email === query.email.toLowerCase());
    } else if (query.passwordResetTokenHash) {
      found = mockUsers.find((u) => {
        const matchesHash = u.passwordResetTokenHash === query.passwordResetTokenHash;
        const notExpired = u.passwordResetExpiresAt && u.passwordResetExpiresAt > (query.passwordResetExpiresAt?.$gt || new Date(0));
        return matchesHash && notExpired;
      });
    } else if (query.emailVerificationTokenHash) {
      found = mockUsers.find((u) => {
        const matchesHash = u.emailVerificationTokenHash === query.emailVerificationTokenHash;
        const notExpired = u.emailVerificationExpiresAt && u.emailVerificationExpiresAt > (query.emailVerificationExpiresAt?.$gt || new Date(0));
        return matchesHash && notExpired;
      });
    }

    return createMockQuery(found || null);
  };

  User.findById = (id) => {
    const targetId = id?._id || id?.id || id;
    const found = mockUsers.find((u) => u._id === targetId || u._id === targetId?.toString());
    return createMockQuery(found || null);
  };

  User.create = async (userData) => {
    const doc = createMockUserDoc(userData);
    mockUsers.push(doc);
    return doc;
  };
});

// ============================================================================
// 1. Successful student registration
// ============================================================================
test('1. Successful student registration saves user and returns sanitized profile', async () => {
  const res = await request(app)
    .post('/api/auth/register')
    .send({
      name: 'Jane Doe',
      email: 'jane@example.com',
      password: 'Password123',
    });

  assert.strictEqual(res.status, 201);
  assert.strictEqual(res.body.user.email, 'jane@example.com');
  assert.strictEqual(res.body.user.role, 'student');
  assert.strictEqual(res.body.user.accountStatus, 'active');
  assert.strictEqual(res.body.user.password, undefined);

  // Cookie must be set
  const cookies = res.headers['set-cookie'];
  assert.ok(cookies);
  assert.ok(cookies.some((c) => c.includes('jwt=') && c.includes('HttpOnly')));
});

// ============================================================================
// 2. Missing required registration fields
// ============================================================================
test('2. Missing required registration fields returns 400', async () => {
  const res = await request(app)
    .post('/api/auth/register')
    .send({
      name: '',
      email: 'jane@example.com',
      password: 'Password123',
    });

  assert.strictEqual(res.status, 400);
  assert.ok(res.body.error.includes('name'));
});

// ============================================================================
// 3. Invalid email format
// ============================================================================
test('3. Invalid email format returns 400', async () => {
  const res = await request(app)
    .post('/api/auth/register')
    .send({
      name: 'Jane Doe',
      email: 'not-an-email',
      password: 'Password123',
    });

  assert.strictEqual(res.status, 400);
  assert.ok(res.body.error.includes('valid email'));
});

// ============================================================================
// 4. Weak or invalid password
// ============================================================================
test('4. Weak password (< 8 chars or missing digits) returns 400', async () => {
  const res1 = await request(app)
    .post('/api/auth/register')
    .send({
      name: 'Jane Doe',
      email: 'jane@example.com',
      password: 'short',
    });
  assert.strictEqual(res1.status, 400);

  const res2 = await request(app)
    .post('/api/auth/register')
    .send({
      name: 'Jane Doe',
      email: 'jane@example.com',
      password: 'allletterspassword',
    });
  assert.strictEqual(res2.status, 400);
  assert.ok(res2.body.error.includes('letter and one number'));
});

// ============================================================================
// 5. Duplicate email registration
// ============================================================================
test('5. Duplicate email registration returns 409 Conflict', async () => {
  await request(app).post('/api/auth/register').send({
    name: 'Jane Doe',
    email: 'jane@example.com',
    password: 'Password123',
  });

  const res = await request(app).post('/api/auth/register').send({
    name: 'Jane Two',
    email: 'jane@example.com',
    password: 'Password123',
  });

  assert.strictEqual(res.status, 409);
  assert.ok(res.body.error.includes('already exists'));
});

// ============================================================================
// 6. Password is stored as a hash, not plaintext
// ============================================================================
test('6. Password is stored as a bcrypt hash, not plaintext', async () => {
  await request(app).post('/api/auth/register').send({
    name: 'Jane Doe',
    email: 'jane@example.com',
    password: 'Password123',
  });

  const storedUser = mockUsers.find((u) => u.email === 'jane@example.com');
  assert.ok(storedUser);
  assert.notStrictEqual(storedUser.password, 'Password123');
  assert.ok(storedUser.password.startsWith('$2'));
  assert.strictEqual(await bcrypt.compare('Password123', storedUser.password), true);
});

// ============================================================================
// 7. Successful login
// ============================================================================
test('7. Successful login returns 200 and sets HttpOnly cookie', async () => {
  await request(app).post('/api/auth/register').send({
    name: 'Jane Doe',
    email: 'jane@example.com',
    password: 'Password123',
  });

  const res = await request(app).post('/api/auth/login').send({
    email: 'jane@example.com',
    password: 'Password123',
  });

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.user.email, 'jane@example.com');
  assert.strictEqual(res.body.user.password, undefined);

  const cookies = res.headers['set-cookie'];
  assert.ok(cookies);
  assert.ok(cookies.some((c) => c.includes('jwt=') && c.includes('HttpOnly')));
});

// ============================================================================
// 8. Invalid password
// ============================================================================
test('8. Invalid password returns generic 401 error', async () => {
  await request(app).post('/api/auth/register').send({
    name: 'Jane Doe',
    email: 'jane@example.com',
    password: 'Password123',
  });

  const res = await request(app).post('/api/auth/login').send({
    email: 'jane@example.com',
    password: 'WrongPassword999',
  });

  assert.strictEqual(res.status, 401);
  assert.strictEqual(res.body.error, 'Invalid email address or password.');
});

// ============================================================================
// 9. Nonexistent account login
// ============================================================================
test('9. Nonexistent account login returns identical generic 401 error', async () => {
  const res = await request(app).post('/api/auth/login').send({
    email: 'nonexistent@example.com',
    password: 'Password123',
  });

  assert.strictEqual(res.status, 401);
  assert.strictEqual(res.body.error, 'Invalid email address or password.');
});

// ============================================================================
// 10. Current-user endpoint with valid session
// ============================================================================
test('10. GET /api/auth/me returns current sanitized profile with valid session', async () => {
  const registerRes = await request(app).post('/api/auth/register').send({
    name: 'Jane Doe',
    email: 'jane@example.com',
    password: 'Password123',
  });

  const cookie = registerRes.headers['set-cookie'];

  const meRes = await request(app)
    .get('/api/auth/me')
    .set('Cookie', cookie);

  assert.strictEqual(meRes.status, 200);
  assert.strictEqual(meRes.body.user.email, 'jane@example.com');
  assert.strictEqual(meRes.body.user.name, 'Jane Doe');
  assert.strictEqual(meRes.body.user.password, undefined);
});

// ============================================================================
// 11. Current-user endpoint without authentication
// ============================================================================
test('11. GET /api/auth/me returns 401 when unauthenticated', async () => {
  const res = await request(app).get('/api/auth/me');

  assert.strictEqual(res.status, 401);
  assert.ok(res.body.error.includes('Authentication required'));
});

// ============================================================================
// 12. Logout and subsequent unauthenticated access
// ============================================================================
test('12. POST /api/auth/logout clears session cookie', async () => {
  const res = await request(app).post('/api/auth/logout');

  assert.strictEqual(res.status, 200);
  const cookies = res.headers['set-cookie'];
  assert.ok(cookies);
  // Cleared cookie has empty value or expires in past
  assert.ok(cookies.some((c) => c.includes('jwt=;') || c.includes('Expires=')));
});

// ============================================================================
// 13. Expired or invalid token handling
// ============================================================================
test('13. Expired or forged token returns 401', async () => {
  const forgedToken = jwt.sign({ id: 'fake_user_id', role: 'student' }, 'wrong_secret');

  const res = await request(app)
    .get('/api/auth/me')
    .set('Cookie', [`jwt=${forgedToken}`]);

  assert.strictEqual(res.status, 401);
  assert.ok(res.body.error.includes('session'));
});

// ============================================================================
// 14. Student denied Admin access
// ============================================================================
test('14. Student denied access to admin-only endpoint (403 Forbidden)', async () => {
  const registerRes = await request(app).post('/api/auth/register').send({
    name: 'Student User',
    email: 'student@example.com',
    password: 'Password123',
  });

  const cookie = registerRes.headers['set-cookie'];

  const res = await request(app)
    .get('/api/auth/admin-only')
    .set('Cookie', cookie);

  assert.strictEqual(res.status, 403);
  assert.ok(res.body.error.includes('Forbidden'));
});

// ============================================================================
// 15. Instructor denied Admin access
// ============================================================================
test('15. Instructor denied access to admin-only endpoint (403 Forbidden)', async () => {
  const instructorDoc = createMockUserDoc({
    name: 'Prof Smith',
    email: 'prof@example.com',
    password: 'Password123',
    role: 'instructor',
    accountStatus: 'active',
  });
  mockUsers.push(instructorDoc);

  const token = jwt.sign({ id: instructorDoc._id, role: 'instructor' }, TEST_SECRET, { expiresIn: '1h' });

  const res = await request(app)
    .get('/api/auth/admin-only')
    .set('Cookie', [`jwt=${token}`]);

  assert.strictEqual(res.status, 403);
  assert.ok(res.body.error.includes('Forbidden'));
});

// ============================================================================
// 16. Client cannot self-assign Admin privileges
// ============================================================================
test('16. Client attempting to pass role=admin is rejected (403 Forbidden)', async () => {
  const res = await request(app).post('/api/auth/register').send({
    name: 'Hacker User',
    email: 'hacker@example.com',
    password: 'Password123',
    role: 'admin',
  });

  assert.strictEqual(res.status, 403);
  assert.ok(res.body.error.includes('Administrator accounts cannot be created'));
});

// ============================================================================
// 17. Suspended account denied access
// ============================================================================
test('17. Suspended account is rejected on login and protected endpoints (403)', async () => {
  const suspendedDoc = createMockUserDoc({
    name: 'Suspended User',
    email: 'suspended@example.com',
    password: 'Password123',
    accountStatus: 'suspended',
  });
  mockUsers.push(suspendedDoc);

  // Login attempt
  const loginRes = await request(app).post('/api/auth/login').send({
    email: 'suspended@example.com',
    password: 'Password123',
  });
  assert.strictEqual(loginRes.status, 403);
  assert.ok(loginRes.body.error.includes('suspended'));

  // Protected endpoint attempt with valid JWT
  const token = jwt.sign({ id: suspendedDoc._id, role: 'student' }, TEST_SECRET, { expiresIn: '1h' });
  const meRes = await request(app)
    .get('/api/auth/me')
    .set('Cookie', [`jwt=${token}`]);
  assert.strictEqual(meRes.status, 403);
  assert.ok(meRes.body.error.includes('suspended'));
});

// ============================================================================
// 18. Invalid or expired password-reset token rejected
// ============================================================================
test('18. Invalid or expired password-reset token is rejected (400)', async () => {
  const res = await request(app).post('/api/auth/reset-password').send({
    token: 'invalid_or_expired_token_hex',
    newPassword: 'NewPassword123',
  });

  assert.strictEqual(res.status, 400);
  assert.ok(res.body.error.includes('invalid or has expired'));
});

// ============================================================================
// 19. Valid reset token can only be used once
// ============================================================================
test('19. Valid password reset token resets password and cannot be reused', async () => {
  const user = createMockUserDoc({
    name: 'Reset Test',
    email: 'reset@example.com',
    password: 'OldPassword123',
  });
  mockUsers.push(user);

  const rawToken = user.createPasswordResetToken();

  // First use: should succeed
  const res1 = await request(app).post('/api/auth/reset-password').send({
    token: rawToken,
    newPassword: 'BrandNewPassword123',
  });

  assert.strictEqual(res1.status, 200);
  assert.ok(res1.body.message.includes('successfully'));

  // Second use: must fail
  const res2 = await request(app).post('/api/auth/reset-password').send({
    token: rawToken,
    newPassword: 'AnotherPassword123',
  });

  assert.strictEqual(res2.status, 400);
  assert.ok(res2.body.error.includes('invalid or has expired'));
});

// ============================================================================
// 20. Password change requires correct current password
// ============================================================================
test('20. Change password verifies current password before updating', async () => {
  const user = createMockUserDoc({
    name: 'Change Password User',
    email: 'change@example.com',
    password: 'CurrentPassword123',
  });
  mockUsers.push(user);

  const token = jwt.sign({ id: user._id, role: 'student' }, TEST_SECRET, { expiresIn: '1h' });

  // Incorrect current password
  const failRes = await request(app)
    .patch('/api/auth/change-password')
    .set('Cookie', [`jwt=${token}`])
    .send({
      currentPassword: 'WrongPassword999',
      newPassword: 'UpdatedPassword123',
    });

  assert.strictEqual(failRes.status, 400);
  assert.ok(failRes.body.error.includes('Current password does not match'));

  // Correct current password
  const successRes = await request(app)
    .patch('/api/auth/change-password')
    .set('Cookie', [`jwt=${token}`])
    .send({
      currentPassword: 'CurrentPassword123',
      newPassword: 'UpdatedPassword123',
    });

  assert.strictEqual(successRes.status, 200);
  assert.ok(successRes.body.message.includes('updated successfully'));
});

// ============================================================================
// 21. Email Verification with valid token
// ============================================================================
test('21. Valid email verification token marks user as emailVerified', async () => {
  const user = createMockUserDoc({
    name: 'Unverified Student',
    email: 'unverified@example.com',
    password: 'Password123',
    emailVerified: false,
  });
  mockUsers.push(user);

  const rawToken = user.createEmailVerificationToken();

  const res = await request(app)
    .post('/api/auth/verify-email')
    .send({ token: rawToken });

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.user.emailVerified, true);
  assert.strictEqual(user.emailVerified, true);
});

// ============================================================================
// 22. Verification token cannot be reused (single-use)
// ============================================================================
test('22. Email verification token cannot be reused', async () => {
  const user = createMockUserDoc({
    name: 'Single Use Test',
    email: 'singleuse@example.com',
    password: 'Password123',
    emailVerified: false,
  });
  mockUsers.push(user);

  const rawToken = user.createEmailVerificationToken();

  // First verification succeeds
  const res1 = await request(app)
    .post('/api/auth/verify-email')
    .send({ token: rawToken });
  assert.strictEqual(res1.status, 200);

  // Second verification with same token fails
  const res2 = await request(app)
    .post('/api/auth/verify-email')
    .send({ token: rawToken });
  assert.strictEqual(res2.status, 400);
  assert.ok(res2.body.error.includes('invalid or has expired'));
});

// ============================================================================
// 23. Invalid or expired verification token rejected
// ============================================================================
test('23. Invalid or expired email verification token is rejected (400)', async () => {
  const res = await request(app)
    .post('/api/auth/verify-email')
    .send({ token: 'nonexistent_token_hex_123456789' });

  assert.strictEqual(res.status, 400);
  assert.ok(res.body.error.includes('invalid or has expired'));
});

// ============================================================================
// 24. Missing verification token rejected
// ============================================================================
test('24. Missing verification token returns 400 Bad Request', async () => {
  const res = await request(app)
    .post('/api/auth/verify-email')
    .send({});

  assert.strictEqual(res.status, 400);
  assert.ok(res.body.error.includes('token is required'));
});

// ============================================================================
// 25. Authenticated user can request resend of verification email
// ============================================================================
test('25. Authenticated user can request resend of verification email', async () => {
  const user = createMockUserDoc({
    name: 'Needs Resend',
    email: 'resend@example.com',
    password: 'Password123',
    emailVerified: false,
  });
  mockUsers.push(user);

  const token = jwt.sign({ id: user._id, role: 'student' }, TEST_SECRET, { expiresIn: '1h' });

  const res = await request(app)
    .post('/api/auth/resend-verification')
    .set('Cookie', [`jwt=${token}`]);

  assert.strictEqual(res.status, 200);
  assert.ok(res.body.message.includes('verification email has been sent'));
  assert.ok(user.emailVerificationTokenHash);
});

// ============================================================================
// 26. Already verified user cannot request resend
// ============================================================================
test('26. Already verified user is rejected when requesting resend', async () => {
  const user = createMockUserDoc({
    name: 'Already Verified',
    email: 'verified@example.com',
    password: 'Password123',
    emailVerified: true,
  });
  mockUsers.push(user);

  const token = jwt.sign({ id: user._id, role: 'student' }, TEST_SECRET, { expiresIn: '1h' });

  const res = await request(app)
    .post('/api/auth/resend-verification')
    .set('Cookie', [`jwt=${token}`]);

  assert.strictEqual(res.status, 400);
  assert.ok(res.body.error.includes('already verified'));
});
