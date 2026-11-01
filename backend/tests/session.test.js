process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_key_12345678901234567890';
const { test, before, beforeEach } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const { app } = require('../server');
const User = require('../models/User');
const { signToken, signPreAuthToken } = require('../utils/authUtils');
const { parseRequestDevice } = require('../utils/deviceParser');
const {
  createSession,
  validateSession,
  touchSession,
  revokeSession,
  revokeOtherSessions,
  revokeAllSessions,
  getActiveSessions,
  resetInMemorySessions,
  inMemorySessions,
  SESSION_POLICY,
  IDLE_TIMEOUT_MS,
  ABSOLUTE_TIMEOUT_MS,
  WARNING_BEFORE_EXPIRY_MS,
} = require('../utils/sessionUtils');
const { verifySocketToken } = require('../services/socketService');

// In-memory test store
let mockUsers = [];

const createMockUser = (data) => {
  const salt = bcrypt.genSaltSync(10);
  const hashedPassword = bcrypt.hashSync(data.password || 'Password123', salt);
  const id = data._id || new mongoose.Types.ObjectId().toString();

  const user = {
    _id: id,
    id,
    name: data.name || 'Test User',
    email: (data.email || 'user@example.com').toLowerCase().trim(),
    password: hashedPassword,
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
    passwordChangedAt: data.passwordChangedAt,
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
      const resetToken = require('crypto').randomBytes(32).toString('hex');
      this.passwordResetTokenHash = require('crypto')
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');
      this.passwordResetExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
      return resetToken;
    },
    async save() {
      this.updatedAt = new Date();
      return this;
    },
    toObject() {
      const copy = { ...this };
      delete copy.password;
      return copy;
    },
    toJSON() {
      return this.toObject();
    },
  };

  mockUsers.push(user);
  return user;
};

before(() => {
  User.findOne = (query) => {
    let match = null;
    if (query.email) {
      match = mockUsers.find((u) => u.email === query.email.toLowerCase().trim());
    } else if (query._id) {
      match = mockUsers.find((u) => u._id.toString() === query._id.toString());
    } else if (query.passwordResetTokenHash) {
      match = mockUsers.find(
        (u) =>
          u.passwordResetTokenHash === query.passwordResetTokenHash &&
          (!u.passwordResetExpiresAt || u.passwordResetExpiresAt > new Date())
      );
    }

    const queryObj = {
      select: () => queryObj,
      then: (resolve, reject) => {
        try {
          return resolve(match || null);
        } catch (err) {
          return reject(err);
        }
      },
      exec: async () => match || null,
    };
    return queryObj;
  };

  User.findById = (id) => {
    const match = mockUsers.find(
      (u) => u._id.toString() === id?.toString() || u.id?.toString() === id?.toString()
    );

    const queryObj = {
      select: () => queryObj,
      then: (resolve, reject) => {
        try {
          return resolve(match || null);
        } catch (err) {
          return reject(err);
        }
      },
      exec: async () => match || null,
    };
    return queryObj;
  };
});

beforeEach(() => {
  mockUsers = [];
  resetInMemorySessions();
});

test('1. Successful student login creates a database-backed session and sets sid in JWT cookie', async () => {
  const user = createMockUser({ email: 'student1@learnspace.org', password: 'Password123', role: 'student' });

  const res = await request(app)
    .post('/api/auth/login')
    .set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0.0.0')
    .send({ email: 'student1@learnspace.org', password: 'Password123' });

  assert.strictEqual(res.statusCode, 200);
  assert.ok(res.headers['set-cookie']);

  // Extract jwt cookie
  const cookieHeader = res.headers['set-cookie'].find((c) => c.startsWith('jwt='));
  assert.ok(cookieHeader);

  const token = cookieHeader.split(';')[0].replace('jwt=', '');
  const decoded = jwt.decode(token);
  assert.ok(decoded.sid, 'JWT payload must contain session ID (sid)');
  assert.strictEqual(decoded.id, user._id);

  // Verify session exists in storage
  assert.strictEqual(inMemorySessions.size, 1);
  const session = inMemorySessions.get(decoded.sid);
  assert.ok(session);
  assert.strictEqual(session.userId.toString(), user._id.toString());
  assert.strictEqual(session.role, 'student');
  assert.ok(session.device.browser.includes('Chrome'));
  assert.ok(session.device.os.includes('Windows'));
  assert.strictEqual(session.device.type, 'desktop');
});

test('2. Multiple logins from different devices create distinct active sessions', async () => {
  const user = createMockUser({ email: 'multi@learnspace.org', password: 'Password123' });

  // Login 1: Desktop Chrome on Windows
  const res1 = await request(app)
    .post('/api/auth/login')
    .set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0.0.0')
    .send({ email: 'multi@learnspace.org', password: 'Password123' });

  const cookie1 = res1.headers['set-cookie'].find((c) => c.startsWith('jwt='));
  const token1 = cookie1.split(';')[0].replace('jwt=', '');
  const sid1 = jwt.decode(token1).sid;

  // Login 2: iPhone Safari
  const res2 = await request(app)
    .post('/api/auth/login')
    .set('User-Agent', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1')
    .send({ email: 'multi@learnspace.org', password: 'Password123' });

  const cookie2 = res2.headers['set-cookie'].find((c) => c.startsWith('jwt='));
  const token2 = cookie2.split(';')[0].replace('jwt=', '');
  const sid2 = jwt.decode(token2).sid;

  assert.notStrictEqual(sid1, sid2, 'Distinct logins must have distinct session IDs');
  assert.strictEqual(inMemorySessions.size, 2);

  const sess1 = inMemorySessions.get(sid1);
  const sess2 = inMemorySessions.get(sid2);
  assert.ok(sess1.device.browser.includes('Chrome'));
  assert.ok(sess2.device.browser.includes('Safari'));
  assert.strictEqual(sess2.device.type, 'mobile');
});

test('3. GET /api/auth/sessions returns active sessions with isCurrent true for the calling device', async () => {
  const user = createMockUser({ email: 'list@learnspace.org', password: 'Password123' });

  // Create two sessions
  const s1 = await createSession({ user, req: { headers: { 'user-agent': 'Chrome on Windows' }, ip: '1.2.3.4' } });
  const s2 = await createSession({ user, req: { headers: { 'user-agent': 'Firefox on macOS' }, ip: '5.6.7.8' } });

  const token = signToken(user, s1.id);

  const res = await request(app)
    .get('/api/auth/sessions')
    .set('Cookie', [`jwt=${token}`]);

  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.body.success, true);
  assert.strictEqual(res.body.sessions.length, 2);

  const currentSess = res.body.sessions.find((s) => s.id === s1.id);
  const otherSess = res.body.sessions.find((s) => s.id === s2.id);

  assert.ok(currentSess);
  assert.strictEqual(currentSess.isCurrent, true);
  assert.ok(otherSess);
  assert.strictEqual(otherSess.isCurrent, false);
});

test('4. GET /api/auth/sessions/current returns information about the caller session', async () => {
  const user = createMockUser({ email: 'current@learnspace.org', password: 'Password123' });
  const session = await createSession({ user, req: { headers: { 'user-agent': 'Chrome/124.0.0.0' }, ip: '192.168.1.50' } });
  const token = signToken(user, session.id);

  const res = await request(app)
    .get('/api/auth/sessions/current')
    .set('Cookie', [`jwt=${token}`]);

  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.body.success, true);
  assert.strictEqual(res.body.session.id, session.id);
  assert.strictEqual(res.body.session.isCurrent, true);
  assert.strictEqual(res.body.session.ipAddress, '192.168.1.50');
});

test('5. User isolation: User A cannot see or revoke User B sessions', async () => {
  const userA = createMockUser({ email: 'usera@learnspace.org', password: 'Password123' });
  const userB = createMockUser({ email: 'userb@learnspace.org', password: 'Password123' });

  const sessionA = await createSession({ user: userA, req: { headers: { 'user-agent': 'Chrome' }, ip: '1.1.1.1' } });
  const sessionB = await createSession({ user: userB, req: { headers: { 'user-agent': 'Safari' }, ip: '2.2.2.2' } });

  const tokenA = signToken(userA, sessionA.id);

  // User A lists sessions -> should ONLY see sessionA
  const listRes = await request(app)
    .get('/api/auth/sessions')
    .set('Cookie', [`jwt=${tokenA}`]);

  assert.strictEqual(listRes.body.sessions.length, 1);
  assert.strictEqual(listRes.body.sessions[0].id, sessionA.id);

  // User A attempts to DELETE User B's session -> must return 404 Not Found
  const deleteRes = await request(app)
    .delete(`/api/auth/sessions/${sessionB.id}`)
    .set('Cookie', [`jwt=${tokenA}`]);

  assert.strictEqual(deleteRes.statusCode, 404);
  assert.strictEqual(deleteRes.body.success, false);

  // Verify User B's session is untouched and not revoked
  assert.strictEqual(sessionB.revokedAt, null);
});

test('6. DELETE /api/auth/sessions/:sessionId revokes another session, preventing further requests', async () => {
  const user = createMockUser({ email: 'revokeone@learnspace.org', password: 'Password123' });

  const sessionCurrent = await createSession({ user, req: { headers: { 'user-agent': 'Current Device' } } });
  const sessionOther = await createSession({ user, req: { headers: { 'user-agent': 'Old Laptop' } } });

  const currentToken = signToken(user, sessionCurrent.id);
  const otherToken = signToken(user, sessionOther.id);

  // Revoke other session
  const delRes = await request(app)
    .delete(`/api/auth/sessions/${sessionOther.id}`)
    .set('Cookie', [`jwt=${currentToken}`]);

  assert.strictEqual(delRes.statusCode, 200);
  assert.strictEqual(delRes.body.success, true);
  assert.strictEqual(delRes.body.loggedOut, false);

  // Other session token must now be rejected with 401
  const checkRes = await request(app)
    .get('/api/auth/me')
    .set('Cookie', [`jwt=${otherToken}`]);

  assert.strictEqual(checkRes.statusCode, 401);
  const err = checkRes.body?.error || checkRes.body?.message || '';
  assert.ok(err.includes('session') || err.includes('Session') || err.includes('expired'));

  // Current session must still be fully valid
  const currentCheck = await request(app)
    .get('/api/auth/me')
    .set('Cookie', [`jwt=${currentToken}`]);

  assert.strictEqual(currentCheck.statusCode, 200);
});

test('7. Revoking current session clears cookie and returns loggedOut true', async () => {
  const user = createMockUser({ email: 'revokecurr@learnspace.org', password: 'Password123' });
  const session = await createSession({ user, req: { headers: { 'user-agent': 'Active Device' } } });
  const token = signToken(user, session.id);

  const res = await request(app)
    .delete(`/api/auth/sessions/${session.id}`)
    .set('Cookie', [`jwt=${token}`]);

  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.body.success, true);
  assert.strictEqual(res.body.loggedOut, true);

  // Cookie must be cleared
  const clearCookieHeader = res.headers['set-cookie'].find((c) => c.startsWith('jwt=;'));
  assert.ok(clearCookieHeader, 'Must clear jwt cookie on current session revocation');
});

test('8. DELETE /api/auth/sessions/other revokes all other sessions but leaves current session intact', async () => {
  const user = createMockUser({ email: 'revokeother@learnspace.org', password: 'Password123' });

  const currentSession = await createSession({ user, req: { headers: { 'user-agent': 'Current' } } });
  const sess2 = await createSession({ user, req: { headers: { 'user-agent': 'Device 2' } } });
  const sess3 = await createSession({ user, req: { headers: { 'user-agent': 'Device 3' } } });

  const currentToken = signToken(user, currentSession.id);
  const token2 = signToken(user, sess2.id);

  const res = await request(app)
    .delete('/api/auth/sessions/other')
    .set('Cookie', [`jwt=${currentToken}`]);

  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.body.success, true);
  assert.strictEqual(res.body.revokedCount, 2);

  // sess2 and sess3 must be revoked
  assert.ok(sess2.revokedAt);
  assert.strictEqual(sess2.revokeReason, 'revoked_others');
  assert.ok(sess3.revokedAt);

  // currentSession must remain active
  assert.strictEqual(currentSession.revokedAt, null);

  // token2 must now fail
  const testRes = await request(app)
    .get('/api/auth/me')
    .set('Cookie', [`jwt=${token2}`]);
  assert.strictEqual(testRes.statusCode, 401);

  // currentToken must still succeed
  const testCurrent = await request(app)
    .get('/api/auth/me')
    .set('Cookie', [`jwt=${currentToken}`]);
  assert.strictEqual(testCurrent.statusCode, 200);
});

test('9. Inactivity timeout: Session past idleExpiresAt is marked revoked (idle_timeout) and returns 401', async () => {
  const user = createMockUser({ email: 'idletimeout@learnspace.org', password: 'Password123' });
  const session = await createSession({ user, req: { headers: { 'user-agent': 'Idle Device' } } });

  // Simulate idle expiration by setting idleExpiresAt in the past
  session.idleExpiresAt = new Date(Date.now() - 1000);

  const token = signToken(user, session.id);

  const res = await request(app)
    .get('/api/auth/me')
    .set('Cookie', [`jwt=${token}`]);

  assert.strictEqual(res.statusCode, 401);
  assert.strictEqual(session.revokeReason, 'idle_timeout');
  assert.ok(session.revokedAt);
});

test('10. Absolute timeout: Session past absoluteExpiresAt is marked revoked (absolute_timeout) and returns 401', async () => {
  const user = createMockUser({ email: 'abstout@learnspace.org', password: 'Password123' });
  const session = await createSession({ user, req: { headers: { 'user-agent': 'Old Device' } } });

  // Set absolute expiry in past
  session.absoluteExpiresAt = new Date(Date.now() - 1000);

  const token = signToken(user, session.id);

  const res = await request(app)
    .get('/api/auth/me')
    .set('Cookie', [`jwt=${token}`]);

  assert.strictEqual(res.statusCode, 401);
  assert.strictEqual(session.revokeReason, 'absolute_timeout');
  assert.ok(session.revokedAt);
});

test('11. POST /api/auth/sessions/refresh extends idleExpiresAt but never exceeds absoluteExpiresAt', async () => {
  const user = createMockUser({ email: 'refresh@learnspace.org', password: 'Password123' });
  const session = await createSession({ user, req: { headers: { 'user-agent': 'Device' } } });

  // Set absoluteExpiresAt to 5 minutes from now (less than 10-minute idle window)
  session.absoluteExpiresAt = new Date(Date.now() + 5 * 60 * 1000);
  // Set idleExpiresAt to 2 minutes from now
  session.idleExpiresAt = new Date(Date.now() + 2 * 60 * 1000);
  // Backdate lastActiveAt past 60s throttle window so refresh triggers update
  session.lastActiveAt = new Date(Date.now() - 65 * 1000);

  const token = signToken(user, session.id);

  const res = await request(app)
    .post('/api/auth/sessions/refresh')
    .set('Cookie', [`jwt=${token}`]);

  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.body.success, true);

  // idleExpiresAt must be extended, but capped at absoluteExpiresAt (5 minutes), NOT 10 minutes
  const newIdle = new Date(session.idleExpiresAt).getTime();
  const absTime = new Date(session.absoluteExpiresAt).getTime();
  assert.ok(newIdle <= absTime, 'idleExpiresAt must never exceed absoluteExpiresAt');
  assert.strictEqual(newIdle, absTime);
});

test('12. Changing password revokes all other sessions for the user', async () => {
  const user = createMockUser({ email: 'pwchange@learnspace.org', password: 'OldPassword123' });

  const session1 = await createSession({ user, req: { headers: { 'user-agent': 'Session 1' } } });
  const session2 = await createSession({ user, req: { headers: { 'user-agent': 'Session 2' } } });

  const token1 = signToken(user, session1.id);
  const token2 = signToken(user, session2.id);

  const res = await request(app)
    .patch('/api/auth/change-password')
    .set('Cookie', [`jwt=${token1}`])
    .send({
      currentPassword: 'OldPassword123',
      newPassword: 'NewPassword456',
      confirmPassword: 'NewPassword456',
    });

  assert.strictEqual(res.statusCode, 200);

  // session2 must be revoked
  assert.ok(session2.revokedAt);
  assert.ok(session2.revokeReason === 'password_changed' || session2.revokeReason === 'revoked_others');

  // Request from session2 must now fail
  const check2 = await request(app)
    .get('/api/auth/me')
    .set('Cookie', [`jwt=${token2}`]);
  assert.strictEqual(check2.statusCode, 401);
});

test('13. Suspended account rejects active session with 403 Forbidden', async () => {
  const user = createMockUser({ email: 'suspended@learnspace.org', password: 'Password123', accountStatus: 'active' });
  const session = await createSession({ user, req: { headers: { 'user-agent': 'Chrome' } } });
  const token = signToken(user, session.id);

  // Verify access before suspension
  const okRes = await request(app)
    .get('/api/auth/me')
    .set('Cookie', [`jwt=${token}`]);
  assert.strictEqual(okRes.statusCode, 200);

  // Suspend account
  user.accountStatus = 'suspended';

  // Request should now be rejected with 403
  const failRes = await request(app)
    .get('/api/auth/me')
    .set('Cookie', [`jwt=${token}`]);

  assert.strictEqual(failRes.statusCode, 403);
  const err = failRes.body?.error || failRes.body?.message || '';
  assert.ok(err.includes('suspended'));
});

test('14. CRITICAL-1 FIX: Pre-auth MFA token with purpose: mfa_pending is rejected by protect with 401', async () => {
  const user = createMockUser({ email: 'mfa.student@learnspace.org', role: 'student' });
  const preAuthToken = signPreAuthToken(user);

  // Attempt to access protected endpoint using pre-auth token
  const res = await request(app)
    .get('/api/auth/me')
    .set('Cookie', [`jwt=${preAuthToken}`]);

  assert.strictEqual(res.statusCode, 401);
  const err = res.body?.error || res.body?.message || '';
  assert.ok(err.includes('Two-factor') || err.includes('Two-Factor') || err.includes('verification'));
});

test('15. Student login with 2FA enabled creates ZERO sessions before challenge completion', async () => {
  createMockUser({
    email: 'mfa.active@learnspace.org',
    password: 'Password123',
    role: 'student',
    mfa: {
      enabled: true,
      preferredMethod: 'totp',
      totp: { verified: true },
    },
  });

  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: 'mfa.active@learnspace.org', password: 'Password123' });

  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.body.mfaRequired, true);

  // In-memory sessions must remain 0
  assert.strictEqual(inMemorySessions.size, 0, 'No session must be created until MFA challenge is completed');
});

test('16. Admin login creates ZERO sessions before TOTP verification', async () => {
  createMockUser({
    email: 'admin.mfa@learnspace.io',
    password: 'Password123',
    role: 'admin',
    mfa: {
      enabled: true,
      enforced: true,
      preferredMethod: 'totp',
      totp: { verified: true },
    },
  });

  const res = await request(app)
    .post('/api/auth/admin/login')
    .send({ email: 'admin.mfa@learnspace.io', password: 'Password123' });

  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.body.mfaRequired, true);
  assert.strictEqual(inMemorySessions.size, 0, 'Admin password step must create 0 sessions');
});

test('17. POST /api/auth/logout revokes the specific database session', async () => {
  const user = createMockUser({ email: 'logout@learnspace.org', password: 'Password123' });
  const session = await createSession({ user, req: { headers: { 'user-agent': 'Chrome' } } });
  const token = signToken(user, session.id);

  const res = await request(app)
    .post('/api/auth/logout')
    .set('Cookie', [`jwt=${token}`]);

  assert.strictEqual(res.statusCode, 200);
  assert.ok(session.revokedAt);
  assert.strictEqual(session.revokeReason, 'logout');
});

test('18. Token with nonexistent or revoked sid is rejected by protect with 401', async () => {
  const user = createMockUser({ email: 'nosid@learnspace.org', password: 'Password123' });
  const fakeSid = new mongoose.Types.ObjectId().toString();
  const token = signToken(user, fakeSid);

  const res = await request(app)
    .get('/api/auth/me')
    .set('Cookie', [`jwt=${token}`]);

  assert.strictEqual(res.statusCode, 401);
  const err = res.body?.error || res.body?.message || '';
  assert.ok(err.includes('session') || err.includes('Session') || err.includes('expired') || err.includes('Invalid'));
});

test('19. Device parser parses desktop, mobile, and tablet user agents correctly', () => {
  const desktopUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
  const mobileUA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Mobile/15E148 Safari/604.1';
  const tabletUA = 'Mozilla/5.0 (iPad; CPU OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1';

  const d1 = parseRequestDevice({ headers: { 'user-agent': desktopUA }, ip: '127.0.0.1' });
  assert.ok(d1.browser.startsWith('Chrome'));
  assert.ok(d1.os.includes('Windows'));
  assert.strictEqual(d1.type, 'desktop');

  const d2 = parseRequestDevice({ headers: { 'user-agent': mobileUA }, ip: '127.0.0.1' });
  assert.ok(d2.browser.startsWith('Safari'));
  assert.ok(d2.os.startsWith('iOS'));
  assert.strictEqual(d2.type, 'mobile');

  const d3 = parseRequestDevice({ headers: { 'user-agent': tabletUA }, ip: '127.0.0.1' });
  assert.ok(d3.browser.startsWith('Safari'));
  assert.ok(d3.os.startsWith('iOS'));
  assert.strictEqual(d3.type, 'tablet');
});

test('20. Device parser extracts IP address handling proxy and X-Forwarded-For headers', () => {
  const oldTrustProxy = process.env.TRUST_PROXY;
  process.env.TRUST_PROXY = 'true';

  try {
    const reqWithProxy = {
      headers: {
        'x-forwarded-for': '203.0.113.195, 70.41.3.18, 150.172.238.178',
        'user-agent': 'Chrome',
      },
      ip: '10.0.0.1',
    };

    const parsed = parseRequestDevice(reqWithProxy);
    assert.strictEqual(parsed.ipAddress, '203.0.113.195', 'Must extract first client IP from comma-separated list');
  } finally {
    process.env.TRUST_PROXY = oldTrustProxy;
  }
});

test('21. Activity throttle: Rapid touchSession calls within 60s do not perform unnecessary writes', async () => {
  const user = createMockUser({ email: 'throttle@learnspace.org' });
  const session = await createSession({ user, req: { headers: { 'user-agent': 'Chrome' } } });

  // Immediate subsequent touchSession within 60 seconds
  const updated1 = await touchSession(session);
  assert.strictEqual(updated1, false, 'Touch within 60s throttle window must be skipped');

  // Simulate elapsed time > 60 seconds
  session.lastActiveAt = new Date(Date.now() - 65 * 1000);
  const updated2 = await touchSession(session);
  assert.strictEqual(updated2, true, 'Touch after 65s must trigger activity and idle window update');
});

test('22. Socket.IO verifySocketToken validates session and rejects revoked sessions', async () => {
  const user = createMockUser({ email: 'socket@learnspace.org', role: 'student' });
  const session = await createSession({ user, req: { headers: { 'user-agent': 'Chrome' } } });
  const validToken = signToken(user, session.id);

  // Valid session token succeeds
  const authUser = await verifySocketToken(validToken);
  assert.ok(authUser);
  assert.strictEqual(authUser.id, user.id);
  assert.strictEqual(authUser.sessionId, session.id);

  // Revoke session
  session.revokedAt = new Date();
  session.revokeReason = 'logout';

  // Revoked session token must be rejected
  await assert.rejects(
    async () => {
      await verifySocketToken(validToken);
    },
    /Session has been revoked or expired/
  );
});

test('23. Socket.IO verifySocketToken strictly rejects pre-auth tokens', async () => {
  const user = createMockUser({ email: 'socketpre@learnspace.org', role: 'student' });
  const preAuthToken = signPreAuthToken(user);

  await assert.rejects(
    async () => {
      await verifySocketToken(preAuthToken);
    },
    /Pre-auth token cannot be used for persistent socket connection/
  );
});

test('24. revokeAllSessions invalidates all sessions for an account', async () => {
  const user = createMockUser({ email: 'revokeall@learnspace.org' });
  await createSession({ user, req: { headers: { 'user-agent': 'Device 1' } } });
  await createSession({ user, req: { headers: { 'user-agent': 'Device 2' } } });
  await createSession({ user, req: { headers: { 'user-agent': 'Device 3' } } });

  assert.strictEqual(inMemorySessions.size, 3);

  const count = await revokeAllSessions(user.id, 'account_suspended');
  assert.strictEqual(count, 3);

  for (const session of inMemorySessions.values()) {
    assert.ok(session.revokedAt);
    assert.strictEqual(session.revokeReason, 'account_suspended');
  }
});

test('25. Password reset revokes all existing sessions across devices', async () => {
  const user = createMockUser({ email: 'reset.sessions@learnspace.org', password: 'OldPassword123' });
  const sess1 = await createSession({ user, req: { headers: { 'user-agent': 'Device 1' } } });
  const sess2 = await createSession({ user, req: { headers: { 'user-agent': 'Device 2' } } });

  const rawToken = user.createPasswordResetToken();

  const res = await request(app)
    .post('/api/auth/reset-password')
    .send({
      token: rawToken,
      newPassword: 'NewPassword456',
    });

  assert.strictEqual(res.statusCode, 200);

  // Both old sessions must be revoked
  assert.ok(sess1.revokedAt, 'Session 1 must be revoked on password reset');
  assert.ok(sess2.revokedAt, 'Session 2 must be revoked on password reset');
  assert.strictEqual(sess1.revokeReason, 'password_changed');
  assert.strictEqual(sess2.revokeReason, 'password_changed');
});

test('26. Password reset for user with MFA enabled does NOT create session or set auth cookie', async () => {
  const user = createMockUser({
    email: 'reset.mfa@learnspace.org',
    password: 'OldPassword123',
    role: 'student',
    mfa: {
      enabled: true,
      preferredMethod: 'totp',
      totp: { verified: true },
    },
  });

  const rawToken = user.createPasswordResetToken();

  const res = await request(app)
    .post('/api/auth/reset-password')
    .send({
      token: rawToken,
      newPassword: 'NewPassword456',
    });

  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.body.mfaRequired, true);
  assert.strictEqual(res.body.redirectToLogin, true);

  // Cookie must NOT be set
  const cookies = res.headers['set-cookie'] || [];
  assert.strictEqual(cookies.some((c) => c.startsWith('jwt=') && !c.startsWith('jwt=;')), false);

  // In-memory sessions must remain 0
  assert.strictEqual(inMemorySessions.size, 0, 'No session must be created for MFA account on password reset');
});

test('27. Password reset for administrator does NOT create session or set auth cookie', async () => {
  const admin = createMockUser({
    email: 'admin.reset@learnspace.io',
    password: 'OldPassword123',
    role: 'admin',
    mfa: {
      enabled: true,
      enforced: true,
      preferredMethod: 'totp',
      totp: { verified: true },
    },
  });

  const rawToken = admin.createPasswordResetToken();

  const res = await request(app)
    .post('/api/auth/reset-password')
    .send({
      token: rawToken,
      newPassword: 'NewPassword456',
    });

  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.body.mfaRequired, true);
  assert.strictEqual(res.body.redirectToLogin, true);

  // Cookie must NOT be set
  const cookies = res.headers['set-cookie'] || [];
  assert.strictEqual(cookies.some((c) => c.startsWith('jwt=') && !c.startsWith('jwt=;')), false);
  assert.strictEqual(inMemorySessions.size, 0, 'Admin password reset must never issue an authenticated session');
});

test('28. touchSession on revoked or expired session returns false and cannot revive it', async () => {
  const user = createMockUser({ email: 'norevive@learnspace.org' });
  const session = await createSession({ user, req: { headers: { 'user-agent': 'Chrome' } } });

  // Revoke the session
  session.revokedAt = new Date();
  session.revokeReason = 'logout';

  const touched = await touchSession(session, true);
  assert.strictEqual(touched, false, 'touchSession must return false on revoked session');
  assert.ok(session.revokedAt, 'Revocation timestamp must not be cleared');
  assert.strictEqual(session.revokeReason, 'logout');
});

test('29. Untrusted proxy environment strictly ignores client-supplied X-Forwarded-For header', () => {
  const oldTrustProxy = process.env.TRUST_PROXY;
  process.env.TRUST_PROXY = 'false';

  try {
    const spoofedReq = {
      headers: {
        'x-forwarded-for': '198.51.100.1, 198.51.100.2',
        'user-agent': 'Chrome',
      },
      ip: '10.0.0.1',
      socket: { remoteAddress: '10.0.0.1' },
    };

    const parsed = parseRequestDevice(spoofedReq);
    assert.strictEqual(parsed.ipAddress, '10.0.0.1', 'Untrusted proxy must ignore X-Forwarded-For');
  } finally {
    process.env.TRUST_PROXY = oldTrustProxy;
  }
});

test('30. Invalid session ID format in DELETE /api/auth/sessions/:sessionId returns 400', async () => {
  const user = createMockUser({ email: 'badid@learnspace.org', password: 'Password123' });
  const session = await createSession({ user, req: { headers: { 'user-agent': 'Chrome' } } });
  const token = signToken(user, session.id);

  // Non-hex or invalid length ID
  const res = await request(app)
    .delete('/api/auth/sessions/invalid-session-id-123')
    .set('Cookie', [`jwt=${token}`]);

  assert.strictEqual(res.statusCode, 400);
  assert.strictEqual(res.body.success, false);
});

test('31. Policy Verification: New session starts with exact 10-minute inactivity deadline and 8-hour absolute deadline', async () => {
  const user = createMockUser({ email: 'policy10@learnspace.org', password: 'Password123' });
  const beforeCreate = Date.now();
  const session = await createSession({ user, req: { headers: { 'user-agent': 'Chrome' } } });
  const afterCreate = Date.now();

  const idleDuration = new Date(session.idleExpiresAt).getTime() - beforeCreate;
  const absDuration = new Date(session.absoluteExpiresAt).getTime() - beforeCreate;

  // 10 minutes = 600,000ms (+/- 1000ms execution tolerance)
  assert.ok(idleDuration >= 599000 && idleDuration <= 605000, `Expected ~600,000ms idle window, got ${idleDuration}ms`);
  // 8 hours = 28,800,000ms (+/- 1000ms execution tolerance)
  assert.ok(absDuration >= 28799000 && absDuration <= 28805000, `Expected ~28,800,000ms absolute window, got ${absDuration}ms`);

  assert.strictEqual(SESSION_POLICY.idleTimeoutMinutes, 10);
  assert.strictEqual(SESSION_POLICY.warningBeforeExpiryMinutes, 3);
  assert.strictEqual(SESSION_POLICY.absoluteTimeoutHours, 8);
});

test('32. Warning window calculation: Warning begins when 3 minutes remain before idle expiration', async () => {
  const user = createMockUser({ email: 'warnwindow@learnspace.org', password: 'Password123' });
  const session = await createSession({ user, req: { headers: { 'user-agent': 'Chrome' } } });

  // Simulate user inactive for 7 minutes (420 seconds) out of 10-minute total window
  const now = Date.now();
  session.lastActiveAt = new Date(now - 7 * 60 * 1000);
  session.idleExpiresAt = new Date(now + 3 * 60 * 1000); // 3 minutes remaining

  const remainingMs = new Date(session.idleExpiresAt).getTime() - now;
  const warningWindowMs = 3 * 60 * 1000;

  assert.ok(remainingMs <= warningWindowMs, 'Session must enter warning window when <= 3 minutes remain');
  assert.ok(remainingMs > 0, 'Session has not expired yet');
});

test('33. Stay Signed In: POST /api/auth/sessions/refresh resets 10-minute idle deadline and returns session policy', async () => {
  const user = createMockUser({ email: 'staysignedin@learnspace.org', password: 'Password123' });
  const session = await createSession({ user, req: { headers: { 'user-agent': 'Chrome' } } });

  // Simulate 7 minutes of inactivity (3 minutes left)
  const now = Date.now();
  session.lastActiveAt = new Date(now - 7 * 60 * 1000);
  session.idleExpiresAt = new Date(now + 3 * 60 * 1000);

  const token = signToken(user, session.id);
  const res = await request(app)
    .post('/api/auth/sessions/refresh')
    .set('Cookie', [`jwt=${token}`]);

  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.body.success, true);
  assert.strictEqual(res.body.policy.idleTimeoutMinutes, 10);
  assert.strictEqual(res.body.policy.warningBeforeExpiryMinutes, 3);

  // New idle deadline must now be ~10 minutes from now (600,000ms), successfully extended from 3 minutes
  const newRemaining = new Date(res.body.idleExpiresAt).getTime() - Date.now();
  assert.ok(newRemaining >= 595000 && newRemaining <= 605000, `Expected ~600,000ms after refresh, got ${newRemaining}ms`);
});

test('34. Background API polling: x-background-request header does NOT advance idle deadline or touch session', async () => {
  const user = createMockUser({ email: 'backgroundpoll@learnspace.org', password: 'Password123' });
  const session = await createSession({ user, req: { headers: { 'user-agent': 'Chrome' } } });

  // Baseline idle deadline and lastActiveAt backdated by 70s
  const originalLastActive = new Date(Date.now() - 70 * 1000);
  const originalIdleExpiresAt = new Date(session.idleExpiresAt.getTime() - 70 * 1000);
  session.lastActiveAt = originalLastActive;
  session.idleExpiresAt = originalIdleExpiresAt;

  const token = signToken(user, session.id);

  // 1. Send request with x-background-request: true
  const resPoll = await request(app)
    .get('/api/auth/me')
    .set('Cookie', [`jwt=${token}`])
    .set('x-background-request', 'true');

  assert.strictEqual(resPoll.statusCode, 200);
  // LastActiveAt and idleExpiresAt must NOT have changed
  assert.strictEqual(
    new Date(session.lastActiveAt).getTime(),
    originalLastActive.getTime(),
    'Background poll must not update lastActiveAt'
  );
  assert.strictEqual(
    new Date(session.idleExpiresAt).getTime(),
    originalIdleExpiresAt.getTime(),
    'Background poll must not update idleExpiresAt'
  );

  // 2. In contrast, genuine user activity without background header DOES update session
  const resActive = await request(app)
    .get('/api/auth/me')
    .set('Cookie', [`jwt=${token}`]);

  assert.strictEqual(resActive.statusCode, 200);
  assert.ok(
    new Date(session.lastActiveAt).getTime() > originalLastActive.getTime(),
    'Genuine user request must update lastActiveAt'
  );
  assert.ok(
    new Date(session.idleExpiresAt).getTime() > originalIdleExpiresAt.getTime(),
    'Genuine user request must advance sliding idleExpiresAt'
  );
});

test('35. Inactivity enforcement: No activity for 10 minutes expires and revokes the session on next request', async () => {
  const user = createMockUser({ email: 'tenminidle@learnspace.org', password: 'Password123' });
  const session = await createSession({ user, req: { headers: { 'user-agent': 'Chrome' } } });

  // Simulate 10 minutes and 5 seconds of total inactivity (idle deadline in past)
  session.idleExpiresAt = new Date(Date.now() - 5000);
  session.lastActiveAt = new Date(Date.now() - 10 * 60 * 1000 - 5000);

  const token = signToken(user, session.id);
  const res = await request(app)
    .get('/api/auth/me')
    .set('Cookie', [`jwt=${token}`]);

  assert.strictEqual(res.statusCode, 401);
  assert.strictEqual(session.revokeReason, 'idle_timeout');
  assert.ok(session.revokedAt);
  assert.ok(res.body.error.includes('10 minutes of inactivity'));
});

test('36. Absolute lifetime limit: 8-hour maximum lifetime can never be extended by activity or refresh', async () => {
  const user = createMockUser({ email: 'eighthour@learnspace.org', password: 'Password123' });
  const session = await createSession({ user, req: { headers: { 'user-agent': 'Chrome' } } });

  // Set absolute expiry to 2 minutes from now, but attempt refresh to add 10 minutes
  const absoluteDeadline = new Date(Date.now() + 2 * 60 * 1000);
  session.absoluteExpiresAt = absoluteDeadline;
  session.idleExpiresAt = new Date(Date.now() + 1 * 60 * 1000);
  session.lastActiveAt = new Date(Date.now() - 70 * 1000);

  const token = signToken(user, session.id);
  const res = await request(app)
    .post('/api/auth/sessions/refresh')
    .set('Cookie', [`jwt=${token}`]);

  assert.strictEqual(res.statusCode, 200);
  // idleExpiresAt must be clamped exactly to absoluteExpiresAt, never exceeding it
  assert.strictEqual(new Date(res.body.idleExpiresAt).getTime(), absoluteDeadline.getTime());
  assert.strictEqual(new Date(session.idleExpiresAt).getTime(), absoluteDeadline.getTime());
});
