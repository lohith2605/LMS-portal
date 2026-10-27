const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { app } = require('../server');
const User = require('../models/User');

const TEST_SECRET = 'test_jwt_secret_key_12345678901234567890';
process.env.JWT_SECRET = TEST_SECRET;
process.env.NODE_ENV = 'test';

let mockUsers = [];
let nextId = 100;

const resetMockDb = () => {
  mockUsers = [];
  nextId = 100;
};

const createMockUser = (data) => {
  const user = {
    _id: data._id || `user_${nextId++}`,
    name: data.name,
    email: data.email.toLowerCase(),
    role: data.role || 'student',
    accountStatus: data.accountStatus || 'active',
    emailVerified: Boolean(data.emailVerified),
    createdAt: data.createdAt || new Date(),
    updatedAt: new Date(),
    changedPasswordAfter() {
      return false;
    },
    async save() {
      const idx = mockUsers.findIndex((u) => u._id.toString() === this._id.toString());
      if (idx !== -1) {
        mockUsers[idx] = this;
      } else {
        mockUsers.push(this);
      }
      return this;
    },
    toObject() {
      return { ...this };
    },
  };
  mockUsers.push(user);
  return user;
};

const makeToken = (user) => {
  return jwt.sign(
    { id: user._id.toString(), role: user.role },
    TEST_SECRET,
    { expiresIn: '1h' }
  );
};

const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');

// Wire User, Course, and Enrollment model stubs for dashboard tests
test.beforeEach(() => {
  resetMockDb();

  User.findById = (id) => {
    const found = mockUsers.find((u) => u._id.toString() === id.toString());
    const p = Promise.resolve(found || null);
    p.select = () => p;
    return p;
  };

  User.countDocuments = (query = {}) => {
    let list = [...mockUsers];
    if (query.role) list = list.filter((u) => u.role === query.role);
    if (query.accountStatus) list = list.filter((u) => u.accountStatus === query.accountStatus);
    return Promise.resolve(list.length);
  };

  User.find = (query = {}) => {
    let list = [...mockUsers];
    if (query.role) list = list.filter((u) => u.role === query.role);
    if (query.accountStatus) list = list.filter((u) => u.accountStatus === query.accountStatus);

    const queryObj = {
      select: () => queryObj,
      sort: () => queryObj,
      skip: () => queryObj,
      limit: () => queryObj,
      lean: () => Promise.resolve(list),
      then: (resolve) => Promise.resolve(list).then(resolve),
    };
    return queryObj;
  };

  Course.countDocuments = () => Promise.resolve(0);
  Course.find = () => ({
    sort: () => ({
      limit: () => ({
        lean: () => Promise.resolve([]),
      }),
    }),
  });

  Enrollment.find = () => ({
    populate: () => ({
      sort: () => ({
        lean: () => Promise.resolve([]),
      }),
    }),
  });
  Enrollment.countDocuments = () => Promise.resolve(0);
  Enrollment.aggregate = () => Promise.resolve([]);
});

test('1. Student Dashboard requires authentication (401)', async () => {
  const res = await request(app).get('/api/dashboard/student');
  assert.strictEqual(res.statusCode, 401);
  assert.ok(res.body.error);
});

test('2. Student Dashboard returns 200 for authenticated student', async () => {
  const student = createMockUser({ name: 'Alice Student', email: 'alice@example.com', role: 'student' });
  const token = makeToken(student);

  const res = await request(app)
    .get('/api/dashboard/student')
    .set('Cookie', [`jwt=${token}`]);

  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(typeof res.body.overview.enrolledCount, 'number');
  assert.ok(Array.isArray(res.body.announcements));
});

test('3. Instructor Dashboard requires authentication (401)', async () => {
  const res = await request(app).get('/api/dashboard/instructor');
  assert.strictEqual(res.statusCode, 401);
});

test('4. Student is rejected from Instructor Dashboard (403)', async () => {
  const student = createMockUser({ name: 'Bob Student', email: 'bob@example.com', role: 'student' });
  const token = makeToken(student);

  const res = await request(app)
    .get('/api/dashboard/instructor')
    .set('Cookie', [`jwt=${token}`]);

  assert.strictEqual(res.statusCode, 403);
  assert.ok(res.body.error.includes('Forbidden'));
});

test('5. Approved Instructor accesses Instructor Dashboard (200)', async () => {
  const instructor = createMockUser({ name: 'Dr. Smith', email: 'smith@example.com', role: 'instructor', accountStatus: 'active' });
  const token = makeToken(instructor);

  const res = await request(app)
    .get('/api/dashboard/instructor')
    .set('Cookie', [`jwt=${token}`]);

  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.body.isApproved, true);
  assert.strictEqual(res.body.accountStatus, 'active');
  assert.strictEqual(typeof res.body.overview.createdCoursesCount, 'number');
});

test('6. Non-admin is rejected from Admin Overview (403)', async () => {
  const instructor = createMockUser({ name: 'Teacher', email: 'teacher@example.com', role: 'instructor' });
  const token = makeToken(instructor);

  const res = await request(app)
    .get('/api/admin/overview')
    .set('Cookie', [`jwt=${token}`]);

  assert.strictEqual(res.statusCode, 403);
});

test('7. Admin accesses Admin Overview with real metrics (200)', async () => {
  createMockUser({ name: 'Student 1', email: 's1@example.com', role: 'student' });
  createMockUser({ name: 'Pending Inst', email: 'pinst@example.com', role: 'instructor', accountStatus: 'pending' });
  const admin = createMockUser({ name: 'Root Admin', email: 'admin@example.com', role: 'admin' });
  const token = makeToken(admin);

  const res = await request(app)
    .get('/api/admin/overview')
    .set('Cookie', [`jwt=${token}`]);

  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.body.metrics.totalUsers, 3);
  assert.strictEqual(res.body.metrics.totalStudents, 1);
  assert.strictEqual(res.body.metrics.pendingInstructors, 1);
});

test('8. Admin retrieves pending instructor queue (200)', async () => {
  createMockUser({ name: 'Applicant', email: 'app@example.com', role: 'instructor', accountStatus: 'pending' });
  const admin = createMockUser({ name: 'Admin', email: 'admin@example.com', role: 'admin' });
  const token = makeToken(admin);

  const res = await request(app)
    .get('/api/admin/instructors/pending')
    .set('Cookie', [`jwt=${token}`]);

  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.body.count, 1);
  assert.strictEqual(res.body.pendingInstructors[0].email, 'app@example.com');
});

test('9. Admin approves pending instructor application (200)', async () => {
  const pending = createMockUser({ _id: 'inst_to_approve', name: 'New Instructor', email: 'newinst@example.com', role: 'instructor', accountStatus: 'pending' });
  const admin = createMockUser({ name: 'Admin', email: 'admin@example.com', role: 'admin' });
  const token = makeToken(admin);

  const res = await request(app)
    .patch('/api/admin/instructors/inst_to_approve/approve')
    .set('Cookie', [`jwt=${token}`]);

  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(pending.accountStatus, 'active');
  assert.ok(res.body.message.includes('approved'));
});

test('10. Admin rejects instructor application (200)', async () => {
  const pending = createMockUser({ _id: 'inst_to_reject', name: 'Reject Inst', email: 'reject@example.com', role: 'instructor', accountStatus: 'pending' });
  const admin = createMockUser({ name: 'Admin', email: 'admin@example.com', role: 'admin' });
  const token = makeToken(admin);

  const res = await request(app)
    .patch('/api/admin/instructors/inst_to_reject/reject')
    .set('Cookie', [`jwt=${token}`]);

  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(pending.accountStatus, 'suspended');
});

test('11. Admin retrieves paginated user list (200)', async () => {
  createMockUser({ name: 'User 1', email: 'u1@example.com', role: 'student' });
  createMockUser({ name: 'User 2', email: 'u2@example.com', role: 'student' });
  const admin = createMockUser({ name: 'Admin', email: 'admin@example.com', role: 'admin' });
  const token = makeToken(admin);

  const res = await request(app)
    .get('/api/admin/users?page=1&limit=2')
    .set('Cookie', [`jwt=${token}`]);

  assert.strictEqual(res.statusCode, 200);
  assert.ok(Array.isArray(res.body.users));
  assert.ok(res.body.pagination);
});
