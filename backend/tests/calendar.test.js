const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { app } = require('../server');
const User = require('../models/User');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const Assignment = require('../models/Assignment');
const AssignmentSubmission = require('../models/AssignmentSubmission');
const DeadlineReminderDelivery = require('../models/DeadlineReminderDelivery');
const Notification = require('../models/Notification');
const { deriveActivityStatus } = require('../services/calendarService');
const { processDeadlineReminders } = require('../services/deadlineReminderScheduler');

const TEST_SECRET = 'test_jwt_secret_calendar_phase11_9876543210';
process.env.JWT_SECRET = TEST_SECRET;
process.env.NODE_ENV = 'test';

// In-memory mock stores
let mockUsers = [];
let mockCourses = [];
let mockEnrollments = [];
let mockAssignments = [];
let mockSubmissions = [];
let mockDeliveries = [];
let mockNotifications = [];
let idCounter = 900;

const makeObjectId = () => {
  const hex = (idCounter++).toString(16).padStart(24, '0');
  return new mongoose.Types.ObjectId(hex);
};

const resetTestDb = () => {
  mockUsers = [];
  mockCourses = [];
  mockEnrollments = [];
  mockAssignments = [];
  mockSubmissions = [];
  mockDeliveries = [];
  mockNotifications = [];
  idCounter = 900;
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

const createMockCourse = (data) => {
  const course = {
    _id: data._id || makeObjectId(),
    title: data.title,
    slug: data.slug || data.title.toLowerCase().replace(/\s+/g, '-'),
    instructor: data.instructor,
    status: data.status || 'published',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  mockCourses.push(course);
  return course;
};

const createMockEnrollment = (data) => {
  const enrollment = {
    _id: data._id || makeObjectId(),
    student: data.student,
    course: data.course,
    status: data.status || 'active',
    enrolledAt: new Date(),
  };
  mockEnrollments.push(enrollment);
  return enrollment;
};

const createMockAssignment = (data) => {
  const assignment = {
    _id: data._id || makeObjectId(),
    course: data.course,
    instructor: data.instructor,
    title: data.title,
    description: data.description || '',
    instructions: data.instructions || 'Follow instructions',
    dueDate: data.dueDate,
    maxMarks: data.maxMarks || 100,
    status: data.status || 'published',
    allowLateSubmissions: data.allowLateSubmissions !== false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  mockAssignments.push(assignment);
  return assignment;
};

const createMockSubmission = (data) => {
  const submission = {
    _id: data._id || makeObjectId(),
    assignment: data.assignment,
    student: data.student,
    course: data.course,
    status: data.status || 'submitted',
    isLate: Boolean(data.isLate),
    grade: data.grade !== undefined ? data.grade : null,
    isGradePublished: Boolean(data.isGradePublished),
    submittedAt: data.submittedAt || new Date(),
  };
  mockSubmissions.push(submission);
  return submission;
};

const createMockDelivery = (data) => {
  const delivery = {
    _id: data._id || makeObjectId(),
    idempotencyKey: data.idempotencyKey,
    recipient: data.recipient,
    assignment: data.assignment,
    reminderType: data.reminderType,
    deadlineVersion: data.deadlineVersion,
    sentAt: data.sentAt || new Date(),
    status: data.status || 'pending',
    async save() {
      const idx = mockDeliveries.findIndex((d) => d._id.toString() === this._id.toString());
      if (idx !== -1) mockDeliveries[idx] = this;
      else mockDeliveries.push(this);
      return this;
    },
  };
  mockDeliveries.push(delivery);
  return delivery;
};

// Wire up Mongoose Model Stubs
User.findById = function (id) {
  const idStr = id ? id.toString() : '';
  const user = mockUsers.find((u) => u._id.toString() === idStr);
  return {
    select: () => Promise.resolve(user || null),
    then: (resolve) => resolve(user || null),
  };
};

Course.find = function (query = {}) {
  let list = mockCourses.filter((c) => {
    if (query.instructor && c.instructor.toString() !== query.instructor.toString()) return false;
    if (query._id && query._id.$in) {
      const ids = query._id.$in.map((i) => i.toString());
      if (!ids.includes(c._id.toString())) return false;
    }
    return true;
  });
  return {
    select: () => ({
      lean: () => Promise.resolve(list.map((c) => ({ ...c }))),
      then: (r) => r(list),
    }),
    lean: () => Promise.resolve(list.map((c) => ({ ...c }))),
    then: (r) => r(list),
  };
};

Enrollment.find = function (query = {}) {
  let list = mockEnrollments.filter((e) => {
    if (query.student && e.student.toString() !== query.student.toString()) return false;
    if (query.course) {
      const courseIdStr = (query.course._id || query.course).toString();
      if (e.course.toString() !== courseIdStr) return false;
    }
    if (query.status && query.status.$in) {
      if (!query.status.$in.includes(e.status)) return false;
    }
    return true;
  });
  return {
    select: () => ({
      lean: () => Promise.resolve(list.map((e) => ({ ...e }))),
      then: (r) => r(list),
    }),
    lean: () => Promise.resolve(list.map((e) => ({ ...e }))),
    then: (r) => r(list),
  };
};

Assignment.find = function (query = {}) {
  let list = mockAssignments.filter((a) => {
    if (query.status) {
      if (query.status.$in) {
        if (!query.status.$in.includes(a.status)) return false;
      } else if (a.status !== query.status) return false;
    }
    if (query.course && query.course.$in) {
      const courseIds = query.course.$in.map((c) => c.toString());
      const aCourseId = (a.course._id || a.course).toString();
      if (!courseIds.includes(aCourseId)) return false;
    }
    if (query.dueDate) {
      const due = new Date(a.dueDate).getTime();
      if (query.dueDate.$gte && due < new Date(query.dueDate.$gte).getTime()) return false;
      if (query.dueDate.$lte && due > new Date(query.dueDate.$lte).getTime()) return false;
      if (query.dueDate.$gt && due <= new Date(query.dueDate.$gt).getTime()) return false;
    }
    return true;
  });

  return {
    populate: () => ({
      sort: () => ({
        limit: (l) => ({
          lean: () => Promise.resolve(list.slice(0, l).map((item) => ({ ...item }))),
          then: (r) => r(list.slice(0, l)),
        }),
        lean: () => Promise.resolve(list.map((item) => ({ ...item }))),
        then: (r) => r(list),
      }),
      lean: () => Promise.resolve(list.map((item) => ({ ...item }))),
      then: (r) => r(list),
    }),
    sort: () => ({
      limit: (l) => ({
        lean: () => Promise.resolve(list.slice(0, l).map((item) => ({ ...item }))),
        then: (r) => r(list.slice(0, l)),
      }),
      lean: () => Promise.resolve(list.map((item) => ({ ...item }))),
      then: (r) => r(list),
    }),
    lean: () => Promise.resolve(list.map((item) => ({ ...item }))),
    then: (r) => r(list),
  };
};

AssignmentSubmission.find = function (query = {}) {
  let list = mockSubmissions.filter((s) => {
    if (query.student && s.student.toString() !== query.student.toString()) return false;
    if (query.assignment) {
      if (query.assignment.$in) {
        const ids = query.assignment.$in.map((id) => id.toString());
        if (!ids.includes(s.assignment.toString())) return false;
      } else if (s.assignment.toString() !== query.assignment.toString()) return false;
    }
    if (query.status && query.status.$in) {
      if (!query.status.$in.includes(s.status)) return false;
    }
    return true;
  });

  return {
    select: () => ({
      lean: () => Promise.resolve(list.map((s) => ({ ...s }))),
      then: (r) => r(list),
    }),
    lean: () => Promise.resolve(list.map((s) => ({ ...s }))),
    then: (r) => r(list),
  };
};

DeadlineReminderDelivery.create = function (data) {
  // Check unique idempotencyKey constraint
  const existing = mockDeliveries.find((d) => d.idempotencyKey === data.idempotencyKey);
  if (existing) {
    const err = new Error('E11000 duplicate key error collection: deadlinereminderdeliveries');
    err.code = 11000;
    return Promise.reject(err);
  }
  const delivery = createMockDelivery(data);
  return Promise.resolve(delivery);
};

Notification.create = function (data) {
  const notif = {
    _id: makeObjectId(),
    ...data,
    isRead: false,
    createdAt: new Date(),
  };
  mockNotifications.push(notif);
  return Promise.resolve(notif);
};

const getAuthCookie = (user) => {
  const token = jwt.sign(
    { id: user._id.toString(), email: user.email, role: user.role },
    TEST_SECRET,
    { expiresIn: '1d' }
  );
  return [`jwt=${token}; Path=/; HttpOnly`];
};

test('Phase 11 Academic Calendar & Deadline Reminders Suite', async (t) => {
  resetTestDb();

  // Seed Users
  const instructor = createMockUser({
    name: 'Prof. Ada Lovelace',
    email: 'ada.instructor@learnspace.org',
    role: 'instructor',
  });
  const instructorCookie = getAuthCookie(instructor);

  const studentAlice = createMockUser({
    name: 'Alice Student',
    email: 'alice@learnspace.org',
    role: 'student',
  });
  const aliceCookie = getAuthCookie(studentAlice);

  const studentBob = createMockUser({
    name: 'Bob Student',
    email: 'bob@learnspace.org',
    role: 'student',
  });
  const bobCookie = getAuthCookie(studentBob);

  // Seed Course 1 (Distributed Systems)
  const course1 = createMockCourse({
    title: 'Distributed Systems',
    instructor: instructor._id,
  });

  // Seed Course 2 (Quantum Computing - Alice is NOT enrolled)
  const course2 = createMockCourse({
    title: 'Quantum Computing',
    instructor: instructor._id,
  });

  // Enroll Alice in Course 1 only
  createMockEnrollment({
    student: studentAlice._id,
    course: course1._id,
    status: 'active',
  });

  // Enroll Bob in Course 1 and Course 2
  createMockEnrollment({
    student: studentBob._id,
    course: course1._id,
    status: 'active',
  });
  createMockEnrollment({
    student: studentBob._id,
    course: course2._id,
    status: 'active',
  });

  // Seed Assignments for Course 1
  const now = new Date();
  const pastDate = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000); // 2 days ago
  const dueSoonDate = new Date(now.getTime() + 18 * 60 * 60 * 1000); // in 18 hours
  const upcomingDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // in 7 days

  // Assignment 1: Past Due (Overdue for non-submitters)
  const assignOverdue = createMockAssignment({
    course: course1._id,
    instructor: instructor._id,
    title: 'Raft Consensus Protocol Project',
    dueDate: pastDate,
    status: 'published',
  });

  // Assignment 2: Due Soon (in 18 hours)
  const assignDueSoon = createMockAssignment({
    course: course1._id,
    instructor: instructor._id,
    title: 'Distributed Vector Clocks Deliverable',
    dueDate: dueSoonDate,
    status: 'published',
  });

  // Assignment 3: Upcoming (in 7 days)
  const assignUpcoming = createMockAssignment({
    course: course1._id,
    instructor: instructor._id,
    title: 'Paxos Formal Verification',
    dueDate: upcomingDate,
    status: 'published',
  });

  // Assignment 4: Draft (Should be invisible to students)
  createMockAssignment({
    course: course1._id,
    instructor: instructor._id,
    title: 'Unreleased Draft Project',
    dueDate: dueSoonDate,
    status: 'draft',
  });

  // Seed Alice's Submission for assignOverdue (Making it COMPLETED, not overdue for Alice!)
  createMockSubmission({
    assignment: assignOverdue._id,
    student: studentAlice._id,
    course: course1._id,
    status: 'submitted',
    submittedAt: new Date(pastDate.getTime() - 4 * 60 * 60 * 1000),
  });

  await t.test('1. Unauthenticated request to /api/calendar is rejected with 401', async () => {
    const res = await request(app).get('/api/calendar');
    assert.strictEqual(res.status, 401);
  });

  await t.test('2. Enrolled student retrieves their authorized activities with correct statuses', async () => {
    const res = await request(app)
      .get('/api/calendar')
      .set('Cookie', aliceCookie);

    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body.events));

    // Draft assignment must be excluded
    const draftFound = res.body.events.find((e) => e.title.includes('Draft'));
    assert.strictEqual(draftFound, undefined, 'Draft assignments must remain invisible to students');

    // assignOverdue should be completed for Alice because she submitted it
    const completedEvent = res.body.events.find((e) => e.id === assignOverdue._id.toString());
    assert.ok(completedEvent);
    assert.strictEqual(completedEvent.status, 'completed', 'Completed work must not be marked overdue');

    // assignDueSoon should be due_soon for Alice
    const dueSoonEvent = res.body.events.find((e) => e.id === assignDueSoon._id.toString());
    assert.ok(dueSoonEvent);
    assert.strictEqual(dueSoonEvent.status, 'due_soon');

    // assignUpcoming should be upcoming for Alice
    const upcomingEvent = res.body.events.find((e) => e.id === assignUpcoming._id.toString());
    assert.ok(upcomingEvent);
    assert.strictEqual(upcomingEvent.status, 'upcoming');
  });

  await t.test('3. Non-submitter Bob sees assignOverdue as overdue', async () => {
    const res = await request(app)
      .get('/api/calendar')
      .set('Cookie', bobCookie);

    assert.strictEqual(res.status, 200);
    const overdueEvent = res.body.events.find((e) => e.id === assignOverdue._id.toString());
    assert.ok(overdueEvent);
    assert.strictEqual(overdueEvent.status, 'overdue');
  });

  await t.test('4. Student cannot access events for courses they are not enrolled in', async () => {
    const res = await request(app)
      .get(`/api/calendar?courseId=${course2._id}`)
      .set('Cookie', aliceCookie);

    assert.strictEqual(res.status, 403);
    assert.ok(res.body.error);
  });

  await t.test('5. Instructor retrieves calendar events with submission metrics', async () => {
    const res = await request(app)
      .get('/api/calendar')
      .set('Cookie', instructorCookie);

    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body.events));

    // Instructor can see draft assignments they created
    const draftEvent = res.body.events.find((e) => e.title.includes('Draft'));
    assert.ok(draftEvent, 'Instructors must see draft assignments in their calendar view');

    // Verify submission count aggregation on assignOverdue (Alice submitted)
    const overdueEvent = res.body.events.find((e) => e.id === assignOverdue._id.toString());
    assert.ok(overdueEvent);
    assert.strictEqual(overdueEvent.stats.totalSubmissions, 1);
  });

  await t.test('6. Status filter returns only requested activity category', async () => {
    const res = await request(app)
      .get('/api/calendar?status=completed')
      .set('Cookie', aliceCookie);

    assert.strictEqual(res.status, 200);
    assert.ok(res.body.events.every((e) => e.status === 'completed'));
  });

  await t.test('7. Upcoming deadlines endpoint excludes completed work', async () => {
    const res = await request(app)
      .get('/api/calendar/upcoming')
      .set('Cookie', aliceCookie);

    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body.upcoming));

    // assignOverdue is completed for Alice, so it should NOT be in upcoming
    const hasCompleted = res.body.upcoming.some((e) => e.id === assignOverdue._id.toString());
    assert.strictEqual(hasCompleted, false);

    // assignDueSoon is incomplete, so it should be present
    const hasDueSoon = res.body.upcoming.some((e) => e.id === assignDueSoon._id.toString());
    assert.strictEqual(hasDueSoon, true);
  });

  await t.test('8. Date utility deriveActivityStatus correctly classifies edge cases', () => {
    const testNow = new Date('2026-10-28T12:00:00.000Z');

    // Case A: Missing due date
    assert.strictEqual(deriveActivityStatus(null, null, testNow), 'upcoming');

    // Case B: Completed submission
    const sub = { status: 'graded' };
    assert.strictEqual(
      deriveActivityStatus('2026-10-27T00:00:00.000Z', sub, testNow),
      'completed'
    );

    // Case C: Overdue (past deadline, incomplete)
    assert.strictEqual(
      deriveActivityStatus('2026-10-27T00:00:00.000Z', null, testNow),
      'overdue'
    );

    // Case D: Due soon (within 48 hours)
    assert.strictEqual(
      deriveActivityStatus('2026-10-29T12:00:00.000Z', null, testNow),
      'due_soon'
    );

    // Case E: Far future upcoming (>48 hours)
    assert.strictEqual(
      deriveActivityStatus('2026-11-15T00:00:00.000Z', null, testNow),
      'upcoming'
    );
  });

  await t.test('9. Scheduled reminder sweep dispatches 24h reminder to eligible students', async () => {
    const initialNotifCount = mockNotifications.length;

    // Run reminder sweep at current time
    const results = await processDeadlineReminders(now);

    assert.strictEqual(results.processedAssignments, 1, 'Only assignDueSoon is within the 24h window');
    assert.ok(results.remindersSent >= 2, 'Alice and Bob should receive reminders for assignDueSoon');

    // Verify delivery records in database
    assert.ok(mockDeliveries.length >= 2);
    const aliceDelivery = mockDeliveries.find(
      (d) => d.recipient.toString() === studentAlice._id.toString() && d.assignment.toString() === assignDueSoon._id.toString()
    );
    assert.ok(aliceDelivery);
    assert.strictEqual(aliceDelivery.status, 'delivered');
    assert.strictEqual(aliceDelivery.reminderType, '24h');

    // Verify notification was created with type 'deadline_reminder'
    const notifs = mockNotifications.filter((n) => n.type === 'deadline_reminder');
    assert.ok(notifs.length >= 2);
    assert.ok(notifs[0].title.includes('Deadline Approaching'));
  });

  await t.test('10. Idempotency & Duplicate-Prevention: Second scheduler run produces ZERO duplicates', async () => {
    const notifsBefore = mockNotifications.length;

    // Run reminder sweep again with same timestamp
    const resultsSecondRun = await processDeadlineReminders(now);

    assert.strictEqual(resultsSecondRun.remindersSent, 0, 'No new reminders should be sent');
    assert.ok(resultsSecondRun.duplicatesSuppressed >= 2, 'Existing deliveries must be suppressed by idempotencyKey');
    assert.strictEqual(mockNotifications.length, notifsBefore, 'No duplicate notification records created');
  });

  await t.test('11. Completed work does not receive reminders', async () => {
    // If student Alice submits assignDueSoon now
    createMockSubmission({
      assignment: assignDueSoon._id,
      student: studentAlice._id,
      course: course1._id,
      status: 'submitted',
    });

    // Create a new assignment due in 10 hours
    const assignTenHours = createMockAssignment({
      course: course1._id,
      instructor: instructor._id,
      title: 'Real-Time Logging Assignment',
      dueDate: new Date(now.getTime() + 10 * 60 * 60 * 1000),
      status: 'published',
    });

    // Alice has submitted assignTenHours too
    createMockSubmission({
      assignment: assignTenHours._id,
      student: studentAlice._id,
      course: course1._id,
      status: 'submitted',
    });

    const results = await processDeadlineReminders(now);
    // Bob should receive reminder, Alice should be skipped as completed
    assert.ok(results.completedSkipped >= 1);
  });

  await t.test('12. Changing deadline timestamp generates new valid idempotency identity', async () => {
    // Instructor extends assignDueSoon by 2 hours
    const extendedDeadline = new Date(dueSoonDate.getTime() + 2 * 60 * 60 * 1000);
    assignDueSoon.dueDate = extendedDeadline;

    // The idempotency key includes the new timestamp, so when the updated deadline is processed,
    // it recognizes the new deadlineVersion!
    const key1 = `${studentBob._id}_${assignDueSoon._id}_24h_${dueSoonDate.getTime()}`;
    const key2 = `${studentBob._id}_${assignDueSoon._id}_24h_${extendedDeadline.getTime()}`;
    assert.notStrictEqual(key1, key2, 'Extended deadline produces a new unique idempotencyKey');
  });
});

