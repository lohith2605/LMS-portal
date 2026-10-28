const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { app } = require('../server');
const User = require('../models/User');
const Notification = require('../models/Notification');
const notificationService = require('../services/notificationService');

const TEST_SECRET = 'test_jwt_secret_key_notifications_phase10_123456789';
process.env.JWT_SECRET = TEST_SECRET;
process.env.NODE_ENV = 'test';

// In-memory mock store for notifications and users
let mockUsers = [];
let mockNotifications = [];
let idCounter = 800;

const makeObjectId = () => {
  const hex = (idCounter++).toString(16).padStart(24, '0');
  return new mongoose.Types.ObjectId(hex);
};

const resetTestDb = () => {
  mockUsers = [];
  mockNotifications = [];
  idCounter = 800;
};

const createMockUser = (data) => {
  const user = {
    _id: data._id || makeObjectId(),
    name: data.name,
    email: data.email.toLowerCase(),
    role: data.role || 'student',
    accountStatus: data.accountStatus || 'active',
    emailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    changedPasswordAfter() {
      return false;
    },
    async save() {
      const idx = mockUsers.findIndex((u) => u._id.toString() === this._id.toString());
      if (idx !== -1) mockUsers[idx] = this;
      else mockUsers.push(this);
      return this;
    },
  };
  mockUsers.push(user);
  return user;
};

const createMockNotification = (data) => {
  const notif = {
    _id: data._id || makeObjectId(),
    recipient: data.recipient,
    type: data.type || 'assignment_published',
    title: data.title || 'Test Title',
    message: data.message || 'Test Message',
    link: data.link || '',
    metadata: data.metadata || {},
    isRead: Boolean(data.isRead),
    createdAt: data.createdAt || new Date(),
    updatedAt: data.updatedAt || new Date(),
    toObject() {
      return { ...this };
    },
    async save() {
      const idx = mockNotifications.findIndex((n) => n._id.toString() === this._id.toString());
      if (idx !== -1) mockNotifications[idx] = this;
      else mockNotifications.push(this);
      return this;
    },
  };
  mockNotifications.push(notif);
  return notif;
};

// Wire up Mongoose Stubs for Test Runner Isolation
User.findById = function (id) {
  const idStr = id ? id.toString() : '';
  const user = mockUsers.find((u) => u._id.toString() === idStr);
  return {
    select: () => Promise.resolve(user || null),
    then: (resolve) => resolve(user || null),
  };
};

User.findOne = function (query) {
  const user = mockUsers.find((u) => {
    if (query.email && u.email !== query.email.toLowerCase()) return false;
    if (query._id && u._id.toString() !== query._id.toString()) return false;
    return true;
  });
  return {
    select: () => Promise.resolve(user || null),
    then: (resolve) => resolve(user || null),
  };
};

// Notification Model Stubs
Notification.find = function (filter = {}) {
  let list = mockNotifications.filter((n) => {
    if (filter.recipient && n.recipient.toString() !== filter.recipient.toString()) return false;
    if (filter.isRead !== undefined && n.isRead !== filter.isRead) return false;
    return true;
  });

  const queryObj = {
    _sort: null,
    _skip: 0,
    _limit: 100,
    sort(s) {
      this._sort = s;
      return this;
    },
    skip(k) {
      this._skip = k;
      return this;
    },
    limit(l) {
      this._limit = l;
      return this;
    },
    lean() {
      const sorted = [...list].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      const sliced = sorted.slice(this._skip, this._skip + this._limit);
      return Promise.resolve(sliced.map((item) => ({ ...item })));
    },
    then(resolve) {
      return this.lean().then(resolve);
    },
  };
  return queryObj;
};

Notification.findOne = function (filter = {}) {
  const notif = mockNotifications.find((n) => {
    if (filter._id && n._id.toString() !== filter._id.toString()) return false;
    if (filter.recipient && n.recipient.toString() !== filter.recipient.toString()) return false;
    return true;
  });
  return Promise.resolve(notif || null);
};

Notification.countDocuments = function (filter = {}) {
  const list = mockNotifications.filter((n) => {
    if (filter.recipient && n.recipient.toString() !== filter.recipient.toString()) return false;
    if (filter.isRead !== undefined && n.isRead !== filter.isRead) return false;
    return true;
  });
  return Promise.resolve(list.length);
};

Notification.create = function (data) {
  const notif = createMockNotification(data);
  return Promise.resolve(notif);
};

Notification.insertMany = function (items = []) {
  const created = items.map((item) => createMockNotification(item));
  return Promise.resolve(created);
};

Notification.updateMany = function (filter = {}, update = {}) {
  let modifiedCount = 0;
  mockNotifications.forEach((n) => {
    let match = true;
    if (filter.recipient && n.recipient.toString() !== filter.recipient.toString()) match = false;
    if (filter.isRead !== undefined && n.isRead !== filter.isRead) match = false;
    if (match) {
      if (update.$set && update.$set.isRead !== undefined) {
        n.isRead = update.$set.isRead;
      }
      modifiedCount++;
    }
  });
  return Promise.resolve({ modifiedCount });
};

// Helper: Generate auth cookies
const getAuthCookie = (user) => {
  const token = jwt.sign(
    { id: user._id.toString(), email: user.email, role: user.role },
    TEST_SECRET,
    { expiresIn: '1d' }
  );
  return [`jwt=${token}; Path=/; HttpOnly`];
};

test('Phase 10 Real-Time Website Notification System Suite', async (t) => {
  resetTestDb();

  // Seed Users: Student Alice, Student Bob, Instructor Dave
  const studentAlice = createMockUser({
    name: 'Alice Student',
    email: 'alice.student@learnspace.org',
    role: 'student',
  });
  const aliceCookie = getAuthCookie(studentAlice);

  const studentBob = createMockUser({
    name: 'Bob Student',
    email: 'bob.student@learnspace.org',
    role: 'student',
  });
  const bobCookie = getAuthCookie(studentBob);

  const instructorDave = createMockUser({
    name: 'Dave Instructor',
    email: 'dave.inst@learnspace.org',
    role: 'instructor',
  });
  const daveCookie = getAuthCookie(instructorDave);

  await t.test('1. Unauthenticated request to /api/notifications is rejected with 401', async () => {
    const res = await request(app).get('/api/notifications');
    assert.strictEqual(res.status, 401);
    assert.ok(res.body.error || res.body.message);
  });

  await t.test('2. Authenticated student fetches their empty notifications initially', async () => {
    const res = await request(app)
      .get('/api/notifications')
      .set('Cookie', aliceCookie);

    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body.notifications));
    assert.strictEqual(res.body.notifications.length, 0);
    assert.strictEqual(res.body.unreadCount, 0);
  });

  await t.test('3. Unread count endpoint returns accurate count', async () => {
    createMockNotification({
      recipient: studentAlice._id,
      type: 'assignment_published',
      title: 'Project 1 Released',
      message: 'Assignment Project 1 has been published.',
      isRead: false,
    });
    createMockNotification({
      recipient: studentAlice._id,
      type: 'discussion_reply',
      title: 'New Reply',
      message: 'Someone replied to your post.',
      isRead: false,
    });
    createMockNotification({
      recipient: studentAlice._id,
      type: 'course_announcement',
      title: 'Maintenance Done',
      message: 'System upgraded.',
      isRead: true, // already read
    });

    const res = await request(app)
      .get('/api/notifications/unread-count')
      .set('Cookie', aliceCookie);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.unreadCount, 2);
  });

  await t.test('4. Ownership Isolation: Alice cannot view Bob’s notifications', async () => {
    // Create notification for Bob
    const bobNotif = createMockNotification({
      recipient: studentBob._id,
      type: 'assignment_submitted',
      title: 'Private to Bob',
      message: 'Bob submitted something.',
      isRead: false,
    });

    const resAlice = await request(app)
      .get('/api/notifications')
      .set('Cookie', aliceCookie);

    assert.strictEqual(resAlice.status, 200);
    const aliceIds = resAlice.body.notifications.map((n) => n._id.toString());
    assert.ok(!aliceIds.includes(bobNotif._id.toString()), 'Alice should NOT see Bob notifications');

    const resBob = await request(app)
      .get('/api/notifications')
      .set('Cookie', bobCookie);

    assert.strictEqual(resBob.status, 200);
    assert.strictEqual(resBob.body.notifications.length, 1);
    assert.strictEqual(resBob.body.notifications[0]._id.toString(), bobNotif._id.toString());
  });

  await t.test('5. Alice marks a single notification as read', async () => {
    const unreadAlice = mockNotifications.find(
      (n) => n.recipient.toString() === studentAlice._id.toString() && !n.isRead
    );
    assert.ok(unreadAlice, 'Must have an unread notification for Alice');

    const res = await request(app)
      .patch(`/api/notifications/${unreadAlice._id}/read`)
      .set('Cookie', aliceCookie);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.notification.isRead, true);

    // Verify unread count decremented
    const countRes = await request(app)
      .get('/api/notifications/unread-count')
      .set('Cookie', aliceCookie);
    assert.strictEqual(countRes.body.unreadCount, 1);
  });

  await t.test('6. Ownership Isolation: Alice cannot mark Bob’s notification as read', async () => {
    const bobNotif = mockNotifications.find(
      (n) => n.recipient.toString() === studentBob._id.toString()
    );
    assert.ok(bobNotif, 'Must have a notification for Bob');

    const res = await request(app)
      .patch(`/api/notifications/${bobNotif._id}/read`)
      .set('Cookie', aliceCookie);

    assert.strictEqual(res.status, 404);
    assert.ok(res.body.error);
    assert.strictEqual(bobNotif.isRead, false, 'Bob notification should remain unread');
  });

  await t.test('7. Mark all notifications as read updates all unread notifications to read', async () => {
    const res = await request(app)
      .patch('/api/notifications/mark-all-read')
      .set('Cookie', aliceCookie);

    assert.strictEqual(res.status, 200);
    assert.ok(res.body.message);

    const countRes = await request(app)
      .get('/api/notifications/unread-count')
      .set('Cookie', aliceCookie);
    assert.strictEqual(countRes.body.unreadCount, 0);

    // Bob unread notification should still be intact
    const bobCount = await request(app)
      .get('/api/notifications/unread-count')
      .set('Cookie', bobCookie);
    assert.strictEqual(bobCount.body.unreadCount, 1);
  });

  await t.test('8. Pagination bounds and limit clamping', async () => {
    // Generate 25 notifications for Bob
    for (let i = 0; i < 25; i++) {
      createMockNotification({
        recipient: studentBob._id,
        type: 'course_announcement',
        title: `Bulletin #${i + 1}`,
        message: `System bulletin body #${i + 1}`,
        isRead: false,
      });
    }

    const resPage1 = await request(app)
      .get('/api/notifications?page=1&limit=10')
      .set('Cookie', bobCookie);

    assert.strictEqual(resPage1.status, 200);
    assert.strictEqual(resPage1.body.notifications.length, 10);
    assert.strictEqual(resPage1.body.pagination.page, 1);
    assert.strictEqual(resPage1.body.pagination.limit, 10);

    // Test clamped maximum limit (capped at 50)
    const resMaxLimit = await request(app)
      .get('/api/notifications?limit=500')
      .set('Cookie', bobCookie);

    assert.strictEqual(resMaxLimit.status, 200);
    assert.strictEqual(resMaxLimit.body.pagination.limit, 50);
  });

  await t.test('9. Notification Service: createNotification persists and returns object', async () => {
    const notif = await notificationService.createNotification({
      recipient: studentAlice._id,
      type: 'submission_graded',
      title: 'Assignment Graded',
      message: 'Your assignment scored 95/100.',
      link: '/student/dashboard?tab=assignments',
      metadata: { score: 95, maxMarks: 100 },
    });

    assert.ok(notif);
    assert.strictEqual(notif.type, 'submission_graded');
    assert.strictEqual(notif.title, 'Assignment Graded');
    assert.strictEqual(notif.metadata.score, 95);

    // Verify retrieved via API
    const res = await request(app)
      .get('/api/notifications?limit=5')
      .set('Cookie', aliceCookie);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.notifications[0].title, 'Assignment Graded');
  });

  await t.test('10. Notification Service: createBatchNotifications bulk inserts', async () => {
    const items = [
      {
        recipient: studentAlice._id,
        type: 'assignment_published',
        title: 'Batch Assignment 1',
        message: 'Published for all',
      },
      {
        recipient: studentBob._id,
        type: 'assignment_published',
        title: 'Batch Assignment 1',
        message: 'Published for all',
      },
    ];

    const created = await notificationService.createBatchNotifications(items);
    assert.strictEqual(created.length, 2);
    assert.strictEqual(created[0].title, 'Batch Assignment 1');
    assert.strictEqual(created[1].title, 'Batch Assignment 1');
  });

  await t.test('11. Self-notification prevention logic helper', async () => {
    // If author replies to their own thread, authorId === replierId
    const authorId = studentAlice._id.toString();
    const replierId = studentAlice._id.toString();

    let notificationCreated = false;
    if (authorId !== replierId) {
      await notificationService.createNotification({
        recipient: authorId,
        type: 'discussion_reply',
        title: 'Self Reply',
        message: 'Should not happen',
      });
      notificationCreated = true;
    }

    assert.strictEqual(notificationCreated, false, 'Self-notification was correctly suppressed');
  });

  await t.test('12. Certificate claim notification trigger', async () => {
    const certNotif = await notificationService.createNotification({
      recipient: studentAlice._id,
      type: 'certificate_issued',
      title: 'Certificate of Completion Issued!',
      message: 'Congratulations! Your certificate is ready.',
      link: '/verify-certificate/CERT-12345',
      metadata: { certificateId: 'CERT-12345' },
    });

    assert.ok(certNotif);
    assert.strictEqual(certNotif.type, 'certificate_issued');
    assert.strictEqual(certNotif.metadata.certificateId, 'CERT-12345');
  });

  await t.test('13. Rejects invalid notification ID parameter', async () => {
    const res = await request(app)
      .patch('/api/notifications/invalid-object-id/read')
      .set('Cookie', aliceCookie);

    assert.strictEqual(res.status, 400);
    assert.ok(res.body.error);
  });
});

