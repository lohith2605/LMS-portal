const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { app } = require('../server');
const User = require('../models/User');
const firebaseAdmin = require('../config/firebaseAdmin');

const TEST_SECRET = 'test_jwt_secret_key_12345678901234567890';
process.env.JWT_SECRET = TEST_SECRET;
process.env.NODE_ENV = 'test';

let mockUsers = [];
let nextId = 1;

const resetMockDb = () => {
  mockUsers = [];
  nextId = 1;
};

// Helper to create mock user doc with methods
const createMockUserDoc = (data) => {
  const doc = {
    _id: data._id || `user_${nextId++}`,
    name: data.name,
    email: data.email.toLowerCase(),
    password: data.password ? bcrypt.hashSync(data.password, 10) : undefined,
    firebaseUid: data.firebaseUid,
    role: data.role || 'student',
    accountStatus: data.accountStatus || 'active',
    emailVerified: Boolean(data.emailVerified),
    avatar: data.avatar || '',
    lastLoginAt: data.lastLoginAt,
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
    async save() {
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

  return doc;
};

const createMockQuery = (doc) => {
  const p = Promise.resolve(doc);
  p.select = () => p;
  return p;
};

// Save original verifyFirebaseIdToken
const originalVerifyIdToken = firebaseAdmin.verifyFirebaseIdToken;

test.beforeEach(() => {
  resetMockDb();

  User.findOne = (query) => {
    let found = null;
    if (query.firebaseUid) {
      found = mockUsers.find((u) => u.firebaseUid === query.firebaseUid);
    }
    if (!found && query.email) {
      found = mockUsers.find((u) => u.email === query.email.toLowerCase());
    }
    return createMockQuery(found || null);
  };

  User.findById = (id) => {
    const targetId = id?._id || id?.id || id;
    const found = mockUsers.find((u) => u._id === targetId || u._id === targetId?.toString());
    return createMockQuery(found || null);
  };

  User.create = async (data) => {
    const userDoc = createMockUserDoc(data);
    mockUsers.push(userDoc);
    return userDoc;
  };
});

test.afterEach(() => {
  firebaseAdmin.verifyFirebaseIdToken = originalVerifyIdToken;
});

// =========================================================================
// 1. Token Validation and Edge Cases
// =========================================================================

test('1. Missing Firebase ID token returns 400 Bad Request', async () => {
  const res = await request(app)
    .post('/api/auth/google')
    .send({});

  assert.strictEqual(res.status, 400);
  assert.match(res.body.error, /Firebase ID token is required/i);
});

test('2. Empty string or whitespace ID token returns 400 Bad Request', async () => {
  const res = await request(app)
    .post('/api/auth/google')
    .send({ idToken: '   ' });

  assert.strictEqual(res.status, 400);
  assert.match(res.body.error, /Firebase ID token is required/i);
});

test('3. Invalid or expired Firebase ID token returns 401 Unauthorized', async () => {
  firebaseAdmin.verifyFirebaseIdToken = async () => {
    throw new Error('Decoding Firebase ID token failed. The token is expired.');
  };

  const res = await request(app)
    .post('/api/auth/google')
    .send({ idToken: 'invalid_expired_token' });

  assert.strictEqual(res.status, 401);
  assert.match(res.body.error, /invalid or expired token/i);
});

test('4. Google token with missing email claim returns 400 Bad Request', async () => {
  firebaseAdmin.verifyFirebaseIdToken = async () => ({
    uid: 'google_uid_no_email',
    name: 'Anonymous',
    email_verified: true,
  });

  const res = await request(app)
    .post('/api/auth/google')
    .send({ idToken: 'valid_token_no_email' });

  assert.strictEqual(res.status, 400);
  assert.match(res.body.error, /associated email address/i);
});

test('5. Unverified Google email returns 403 Forbidden', async () => {
  firebaseAdmin.verifyFirebaseIdToken = async () => ({
    uid: 'google_uid_unverified',
    email: 'unverified@example.com',
    email_verified: false,
    name: 'Unverified User',
  });

  const res = await request(app)
    .post('/api/auth/google')
    .send({ idToken: 'valid_unverified_token' });

  assert.strictEqual(res.status, 403);
  assert.match(res.body.error, /not verified/i);
});

// =========================================================================
// 2. New User Registration via Google
// =========================================================================

test('6. Valid new Google user creates student account with 201 Created and sets auth cookie', async () => {
  firebaseAdmin.verifyFirebaseIdToken = async () => ({
    uid: 'google_uid_1001',
    email: 'newstudent@example.com',
    email_verified: true,
    name: 'Alex Johnson',
    picture: 'https://lh3.googleusercontent.com/photo.jpg',
  });

  const res = await request(app)
    .post('/api/auth/google')
    .send({ idToken: 'valid_new_user_token' });

  assert.strictEqual(res.status, 201);
  assert.strictEqual(res.body.user.email, 'newstudent@example.com');
  assert.strictEqual(res.body.user.name, 'Alex Johnson');
  assert.strictEqual(res.body.user.role, 'student');
  assert.strictEqual(res.body.user.accountStatus, 'active');
  assert.strictEqual(res.body.user.emailVerified, true);
  assert.strictEqual(res.body.user.avatar.url, 'https://lh3.googleusercontent.com/photo.jpg');

  // Verify HttpOnly auth cookie is set
  const cookies = res.headers['set-cookie'];
  assert.ok(cookies, 'Cookie header must be present');
  const jwtCookie = cookies.find((c) => c.startsWith('jwt='));
  assert.ok(jwtCookie, 'jwt cookie must be present');
  assert.ok(jwtCookie.includes('HttpOnly'), 'jwt cookie must be HttpOnly');

  // Verify stored database record
  const savedUser = mockUsers.find((u) => u.email === 'newstudent@example.com');
  assert.ok(savedUser);
  assert.strictEqual(savedUser.firebaseUid, 'google_uid_1001');
  assert.strictEqual(savedUser.role, 'student');
  assert.ok(savedUser.lastLoginAt instanceof Date);
});

test('7. Client attempting role escalation in request body is strictly rejected (stays student)', async () => {
  firebaseAdmin.verifyFirebaseIdToken = async () => ({
    uid: 'google_uid_escalate',
    email: 'hacker@example.com',
    email_verified: true,
    name: 'Sneaky User',
  });

  const res = await request(app)
    .post('/api/auth/google')
    .send({
      idToken: 'token_with_role_attempt',
      role: 'admin',
      accountStatus: 'active',
    });

  assert.strictEqual(res.status, 201);
  assert.strictEqual(res.body.user.role, 'student', 'Role must remain student');

  const saved = mockUsers.find((u) => u.email === 'hacker@example.com');
  assert.strictEqual(saved.role, 'student');
});

// =========================================================================
// 3. Existing User Google Login & Account Linking
// =========================================================================

test('8. Existing Google user (matched by firebaseUid) logs in with 200 OK', async () => {
  const existingDoc = createMockUserDoc({
    name: 'Existing Google Student',
    email: 'existing.google@example.com',
    firebaseUid: 'google_uid_existing_2002',
    role: 'student',
    accountStatus: 'active',
    emailVerified: true,
  });
  mockUsers.push(existingDoc);

  firebaseAdmin.verifyFirebaseIdToken = async () => ({
    uid: 'google_uid_existing_2002',
    email: 'existing.google@example.com',
    email_verified: true,
    name: 'Existing Google Student',
  });

  const res = await request(app)
    .post('/api/auth/google')
    .send({ idToken: 'token_existing_uid' });

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.user.email, 'existing.google@example.com');
  assert.strictEqual(res.body.user.role, 'student');
  assert.match(res.body.message, /logged in successfully/i);

  // Cookie must be set
  assert.ok(res.headers['set-cookie'].some((c) => c.startsWith('jwt=')));
});

test('9. Existing account with email links firebaseUid safely and marks email verified', async () => {
  const legacyUser = createMockUserDoc({
    name: 'Legacy User',
    email: 'legacy@example.com',
    password: 'Password123!',
    role: 'student',
    accountStatus: 'active',
    emailVerified: false, // Previously unverified
  });
  mockUsers.push(legacyUser);

  firebaseAdmin.verifyFirebaseIdToken = async () => ({
    uid: 'google_uid_linked_3003',
    email: 'legacy@example.com',
    email_verified: true,
    name: 'Legacy User',
    picture: 'https://google.com/avatar.png',
  });

  const res = await request(app)
    .post('/api/auth/google')
    .send({ idToken: 'token_legacy_link' });

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.user.email, 'legacy@example.com');
  assert.strictEqual(res.body.user.emailVerified, true);
  assert.strictEqual(res.body.user.avatar.url, 'https://google.com/avatar.png');

  // Verify in mock DB that firebaseUid was linked
  assert.strictEqual(legacyUser.firebaseUid, 'google_uid_linked_3003');
  assert.strictEqual(legacyUser.emailVerified, true);
});

test('10. Existing instructor logging in with Google preserves instructor role', async () => {
  const instructorDoc = createMockUserDoc({
    name: 'Professor Smith',
    email: 'prof.smith@university.edu',
    firebaseUid: 'google_uid_instructor_4004',
    role: 'instructor',
    accountStatus: 'active',
    emailVerified: true,
  });
  mockUsers.push(instructorDoc);

  firebaseAdmin.verifyFirebaseIdToken = async () => ({
    uid: 'google_uid_instructor_4004',
    email: 'prof.smith@university.edu',
    email_verified: true,
    name: 'Professor Smith',
  });

  const res = await request(app)
    .post('/api/auth/google')
    .send({ idToken: 'token_instructor' });

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.user.role, 'instructor');
});

// =========================================================================
// 4. Status Enforcement (Suspended & Pending)
// =========================================================================

test('11. Suspended account logging in with Google is rejected (403 Forbidden)', async () => {
  const suspendedDoc = createMockUserDoc({
    name: 'Suspended Learner',
    email: 'suspended@example.com',
    firebaseUid: 'google_uid_suspended_5005',
    role: 'student',
    accountStatus: 'suspended',
    emailVerified: true,
  });
  mockUsers.push(suspendedDoc);

  firebaseAdmin.verifyFirebaseIdToken = async () => ({
    uid: 'google_uid_suspended_5005',
    email: 'suspended@example.com',
    email_verified: true,
  });

  const res = await request(app)
    .post('/api/auth/google')
    .send({ idToken: 'token_suspended' });

  assert.strictEqual(res.status, 403);
  assert.match(res.body.error, /suspended/i);
});

test('12. Pending instructor account logging in with Google is rejected (403 Forbidden)', async () => {
  const pendingDoc = createMockUserDoc({
    name: 'Applicant Instructor',
    email: 'pending.inst@example.com',
    firebaseUid: 'google_uid_pending_6006',
    role: 'instructor',
    accountStatus: 'pending',
    emailVerified: true,
  });
  mockUsers.push(pendingDoc);

  firebaseAdmin.verifyFirebaseIdToken = async () => ({
    uid: 'google_uid_pending_6006',
    email: 'pending.inst@example.com',
    email_verified: true,
  });

  const res = await request(app)
    .post('/api/auth/google')
    .send({ idToken: 'token_pending' });

  assert.strictEqual(res.status, 403);
  assert.match(res.body.error, /pending administrator approval/i);
});

// =========================================================================
// 5. Session Integration & Protected Route Access
// =========================================================================

test('13. Session cookie issued by Google login authenticates GET /api/auth/me', async () => {
  firebaseAdmin.verifyFirebaseIdToken = async () => ({
    uid: 'google_uid_session_7007',
    email: 'session.test@example.com',
    email_verified: true,
    name: 'Session Student',
  });

  const loginRes = await request(app)
    .post('/api/auth/google')
    .send({ idToken: 'token_session' });

  assert.strictEqual(loginRes.status, 201);
  const cookie = loginRes.headers['set-cookie'];

  // Access /api/auth/me using the cookie
  const meRes = await request(app)
    .get('/api/auth/me')
    .set('Cookie', cookie);

  assert.strictEqual(meRes.status, 200);
  assert.strictEqual(meRes.body.user.email, 'session.test@example.com');
  assert.strictEqual(meRes.body.user.role, 'student');
});

test('14. Logging out after Google login invalidates session access', async () => {
  firebaseAdmin.verifyFirebaseIdToken = async () => ({
    uid: 'google_uid_logout_8008',
    email: 'logout.test@example.com',
    email_verified: true,
    name: 'Logout Student',
  });

  const loginRes = await request(app)
    .post('/api/auth/google')
    .send({ idToken: 'token_logout' });

  const loginCookie = loginRes.headers['set-cookie'];

  // Logout
  const logoutRes = await request(app)
    .post('/api/auth/logout')
    .set('Cookie', loginCookie);

  assert.strictEqual(logoutRes.status, 200);
  const clearedCookie = logoutRes.headers['set-cookie'];

  // Attempting /api/auth/me with cleared cookie must fail
  const meRes = await request(app)
    .get('/api/auth/me')
    .set('Cookie', clearedCookie);

  assert.strictEqual(meRes.status, 401);
});

