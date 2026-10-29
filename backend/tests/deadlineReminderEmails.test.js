const test = require('node:test');
const assert = require('node:assert');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');

const User = require('../models/User');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const Assignment = require('../models/Assignment');
const AssignmentSubmission = require('../models/AssignmentSubmission');
const DeadlineReminderDelivery = require('../models/DeadlineReminderDelivery');
const Notification = require('../models/Notification');

const {
  processDeadlineReminders,
  startDeadlineReminderScheduler,
  stopDeadlineReminderScheduler,
} = require('../services/deadlineReminderScheduler');
const emailService = require('../services/emailService');

// In-memory mock stores
let mockUsers = [];
let mockCourses = [];
let mockEnrollments = [];
let mockAssignments = [];
let mockSubmissions = [];
let mockDeliveries = [];
let mockNotifications = [];
let idCounter = 1000;

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
  idCounter = 1000;
};

const createMockUser = (data) => {
  const user = {
    _id: data._id || makeObjectId(),
    name: data.name,
    email: data.email ? data.email.toLowerCase() : '',
    role: data.role || 'student',
    accountStatus: data.accountStatus || 'active',
    emailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
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
    instructions: data.instructions || 'Default instructions',
    dueDate: data.dueDate,
    maxMarks: data.maxMarks || 100,
    status: data.status || 'published',
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
    emailStatus: data.emailStatus || 'pending',
    notificationStatus: data.notificationStatus || 'pending',
    emailSentAt: data.emailSentAt || null,
    emailError: data.emailError || '',
    notificationError: data.notificationError || '',
    retryCount: data.retryCount || 0,
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

// Wire up Mongoose Model Stubs for Deadline Reminder Testing
User.findById = function (id) {
  const idStr = id ? id.toString() : '';
  const user = mockUsers.find((u) => u._id.toString() === idStr);
  return Promise.resolve(user || null);
};

Course.find = function (query = {}) {
  let list = mockCourses.filter((c) => {
    if (query._id && query._id.$in) {
      const ids = query._id.$in.map((i) => i.toString());
      if (!ids.includes(c._id.toString())) return false;
    }
    return true;
  });
  return Promise.resolve(list.map((c) => ({ ...c })));
};

Enrollment.find = function (query = {}) {
  let list = mockEnrollments.filter((e) => {
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
    if (query.status && a.status !== query.status) return false;
    if (query.dueDate) {
      const due = new Date(a.dueDate).getTime();
      if (isNaN(due)) return false;
      if (query.dueDate.$gt && due <= new Date(query.dueDate.$gt).getTime()) return false;
      if (query.dueDate.$lte && due > new Date(query.dueDate.$lte).getTime()) return false;
    }
    return true;
  });

  return {
    lean: () => Promise.resolve(list.map((item) => ({ ...item }))),
    then: (r) => r(list),
  };
};

AssignmentSubmission.find = function (query = {}) {
  let list = mockSubmissions.filter((s) => {
    if (query.assignment && s.assignment.toString() !== query.assignment.toString()) return false;
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
  const existing = mockDeliveries.find((d) => d.idempotencyKey === data.idempotencyKey);
  if (existing) {
    const err = new Error('E11000 duplicate key error collection: deadlinereminderdeliveries');
    err.code = 11000;
    return Promise.reject(err);
  }
  const delivery = createMockDelivery(data);
  return Promise.resolve(delivery);
};

DeadlineReminderDelivery.findOne = function (query = {}) {
  const delivery = mockDeliveries.find((d) => {
    if (query.idempotencyKey && d.idempotencyKey !== query.idempotencyKey) return false;
    return true;
  });
  return Promise.resolve(delivery || null);
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

test('Automated Assignment Deadline Reminder Emails Suite', async (t) => {
  resetTestDb();

  const origCreateTransport = nodemailer.createTransport;
  let sentMails = [];
  let shouldFailSend = false;

  const setupMockTransport = () => {
    sentMails = [];
    shouldFailSend = false;
    process.env.NODE_ENV = 'production';
    process.env.EMAIL_HOST = 'smtp.testserver.com';
    process.env.EMAIL_PORT = '587';
    process.env.EMAIL_USER = 'reminders@learnspace.io';
    process.env.EMAIL_PASS = 'secret123';
    process.env.EMAIL_FROM = '"LearnSpace Reminders" <reminders@learnspace.io>';
    process.env.CLIENT_URL = 'http://localhost:5173';

    nodemailer.createTransport = () => ({
      async sendMail(mailOptions) {
        if (shouldFailSend) {
          throw new Error('SMTP connection timed out');
        }
        sentMails.push(mailOptions);
        return { messageId: `msg-${Date.now()}` };
      },
    });

    delete require.cache[require.resolve('../services/emailService')];
  };

  const teardownMockTransport = () => {
    nodemailer.createTransport = origCreateTransport;
    process.env.NODE_ENV = 'test';
    delete process.env.EMAIL_HOST;
    delete process.env.EMAIL_USER;
    delete process.env.EMAIL_PASS;
    delete require.cache[require.resolve('../services/emailService')];
  };

  // Seed baseline entities
  const instructor = createMockUser({
    name: 'Professor Turing',
    email: 'turing@learnspace.org',
    role: 'instructor',
  });

  const admin = createMockUser({
    name: 'Admin User',
    email: 'admin@learnspace.org',
    role: 'admin',
  });

  const eligibleStudent1 = createMockUser({
    name: 'Alice Learner',
    email: 'alice@learnspace.org',
    role: 'student',
  });

  const eligibleStudent2 = createMockUser({
    name: 'Bob Learner',
    email: 'bob@learnspace.org',
    role: 'student',
  });

  const unenrolledStudent = createMockUser({
    name: 'Charlie Outsider',
    email: 'charlie@learnspace.org',
    role: 'student',
  });

  const course = createMockCourse({
    title: 'Cloud Architecture & Systems',
    instructor: instructor._id,
    status: 'published',
  });

  // Enroll Alice and Bob
  createMockEnrollment({ student: eligibleStudent1._id, course: course._id, status: 'active' });
  createMockEnrollment({ student: eligibleStudent2._id, course: course._id, status: 'active' });

  // Instructor and admin mistakenly enrolled
  createMockEnrollment({ student: instructor._id, course: course._id, status: 'active' });
  createMockEnrollment({ student: admin._id, course: course._id, status: 'active' });

  await t.test('1. Published assignment due in ~24h triggers 24h reminder email and notification', async () => {
    setupMockTransport();
    try {
      const now = new Date('2026-11-01T12:00:00.000Z');
      const due24h = new Date(now.getTime() + 23 * 60 * 60 * 1000); // 23h from now

      const assign24h = createMockAssignment({
        course: course._id,
        instructor: instructor._id,
        title: 'Microservices Architecture Design',
        dueDate: due24h,
        status: 'published',
      });

      const results = await processDeadlineReminders(now);

      assert.strictEqual(results.processedAssignments, 1);
      assert.strictEqual(results.remindersSent, 2, 'Alice and Bob should receive reminders');
      assert.strictEqual(sentMails.length, 2, 'Two emails should be sent via SMTP');

      const aliceMail = sentMails.find((m) => m.to === 'alice@learnspace.org');
      assert.ok(aliceMail);
      assert.strictEqual(
        aliceMail.subject,
        'Reminder: Assignment due tomorrow — Microservices Architecture Design'
      );
      assert.ok(aliceMail.text.includes('Alice Learner'));
      assert.ok(aliceMail.text.includes('Microservices Architecture Design'));
      assert.ok(aliceMail.text.includes('Cloud Architecture & Systems'));
      assert.ok(aliceMail.html.includes('24-Hour Deadline Reminder'));
      assert.ok(aliceMail.html.includes('Open Assignment in LearnSpace'));

      // Verify delivery record status
      const aliceDelivery = mockDeliveries.find(
        (d) => d.recipient.toString() === eligibleStudent1._id.toString() && d.assignment.toString() === assign24h._id.toString()
      );
      assert.ok(aliceDelivery);
      assert.strictEqual(aliceDelivery.status, 'delivered');
      assert.strictEqual(aliceDelivery.emailStatus, 'delivered');
      assert.strictEqual(aliceDelivery.notificationStatus, 'delivered');
      assert.strictEqual(aliceDelivery.reminderType, '24h');
    } finally {
      teardownMockTransport();
    }
  });

  await t.test('2. Published assignment due in ~1h triggers 1h reminder email with final warning subject', async () => {
    setupMockTransport();
    try {
      const now = new Date('2026-11-02T12:00:00.000Z');
      const due1h = new Date(now.getTime() + 45 * 60 * 1000); // 45 minutes from now

      const assign1h = createMockAssignment({
        course: course._id,
        instructor: instructor._id,
        title: 'Kubernetes Deployment Manifest',
        dueDate: due1h,
        status: 'published',
      });

      const results = await processDeadlineReminders(now);

      assert.strictEqual(results.processedAssignments, 1); // Only assign1h is in future window
      const assign1hMails = sentMails.filter((m) => m.subject.includes('Kubernetes Deployment Manifest'));
      assert.strictEqual(assign1hMails.length, 2);

      const bobMail = assign1hMails.find((m) => m.to === 'bob@learnspace.org');
      assert.ok(bobMail);
      assert.strictEqual(
        bobMail.subject,
        'Final Reminder: Assignment due in 1 hour — Kubernetes Deployment Manifest'
      );
      assert.ok(bobMail.text.includes('in less than 1 hour'));
      assert.ok(bobMail.html.includes('Final 1-Hour Reminder'));
    } finally {
      teardownMockTransport();
    }
  });

  await t.test('3. Idempotency: Repeated scheduler execution sends ZERO duplicate emails or notifications', async () => {
    setupMockTransport();
    try {
      const now = new Date('2026-11-02T12:00:00.000Z');
      const initialMailCount = sentMails.length;
      const initialNotifCount = mockNotifications.length;

      // Run reminder scheduler again with exact same timestamp
      const results = await processDeadlineReminders(now);

      assert.strictEqual(results.remindersSent, 0, 'No new reminders should be sent');
      assert.ok(results.duplicatesSuppressed >= 2, 'Deliveries must be suppressed by idempotencyKey');
      assert.strictEqual(sentMails.length, initialMailCount, 'Zero duplicate emails sent');
      assert.strictEqual(mockNotifications.length, initialNotifCount, 'Zero duplicate notifications dispatched');
    } finally {
      teardownMockTransport();
    }
  });

  await t.test('4. 24h and 1h reminders can each be sent once as deadline approaches', async () => {
    setupMockTransport();
    try {
      // Create fresh assignment due in 24 hours
      const t0 = new Date('2026-11-03T10:00:00.000Z');
      const dueDate = new Date(t0.getTime() + 20 * 60 * 60 * 1000); // 20 hours away

      const assignment = createMockAssignment({
        course: course._id,
        instructor: instructor._id,
        title: 'CI/CD Pipeline Security',
        dueDate,
        status: 'published',
      });

      // Sweep 1 at T0 (20h remaining) -> sends 24h reminder
      const resT0 = await processDeadlineReminders(t0);
      assert.strictEqual(resT0.remindersSent, 2);
      const mailT0 = sentMails.filter((m) => m.subject.includes('CI/CD Pipeline Security'));
      assert.strictEqual(mailT0.length, 2);
      assert.ok(mailT0[0].subject.includes('due tomorrow'));

      // Sweep 2 at T1 (40 minutes remaining) -> sends 1h reminder
      const t1 = new Date(dueDate.getTime() - 40 * 60 * 1000);
      const resT1 = await processDeadlineReminders(t1);
      assert.strictEqual(resT1.remindersSent, 2);
      const mailT1 = sentMails.filter((m) => m.subject.includes('Final Reminder') && m.subject.includes('CI/CD Pipeline Security'));
      assert.strictEqual(mailT1.length, 2);

      // Verify both 24h and 1h deliveries exist for Alice
      const aliceDeliveries = mockDeliveries.filter(
        (d) => d.recipient.toString() === eligibleStudent1._id.toString() && d.assignment.toString() === assignment._id.toString()
      );
      assert.strictEqual(aliceDeliveries.length, 2);
      assert.ok(aliceDeliveries.some((d) => d.reminderType === '24h'));
      assert.ok(aliceDeliveries.some((d) => d.reminderType === '1h'));
    } finally {
      teardownMockTransport();
    }
  });

  await t.test('5. Students who have already submitted are excluded', async () => {
    setupMockTransport();
    try {
      const now = new Date('2026-11-04T10:00:00.000Z');
      const dueDate = new Date(now.getTime() + 15 * 60 * 60 * 1000);

      const assignment = createMockAssignment({
        course: course._id,
        instructor: instructor._id,
        title: 'Observability & Distributed Tracing',
        dueDate,
        status: 'published',
      });

      // Alice submits her work
      createMockSubmission({
        assignment: assignment._id,
        student: eligibleStudent1._id,
        course: course._id,
        status: 'submitted',
      });

      const results = await processDeadlineReminders(now);

      // Bob should receive a reminder, Alice should be skipped as completed
      assert.strictEqual(results.completedSkipped, 1);
      assert.strictEqual(results.remindersSent, 1);

      const sentToAlice = sentMails.some((m) => m.to === 'alice@learnspace.org' && m.subject.includes('Observability'));
      const sentToBob = sentMails.some((m) => m.to === 'bob@learnspace.org' && m.subject.includes('Observability'));
      assert.strictEqual(sentToAlice, false, 'Submitted student Alice must not receive reminder');
      assert.strictEqual(sentToBob, true, 'Unsubmitted student Bob must receive reminder');
    } finally {
      teardownMockTransport();
    }
  });

  await t.test('6. Students not enrolled or with dropped enrollments are excluded', async () => {
    setupMockTransport();
    try {
      const now = new Date('2026-11-04T12:00:00.000Z');
      const dueDate = new Date(now.getTime() + 12 * 60 * 60 * 1000);

      const assignment = createMockAssignment({
        course: course._id,
        instructor: instructor._id,
        title: 'Terraform Infrastructure as Code',
        dueDate,
        status: 'published',
      });

      // Charlie has dropped enrollment
      createMockEnrollment({
        student: unenrolledStudent._id,
        course: course._id,
        status: 'dropped',
      });

      await processDeadlineReminders(now);

      const sentToCharlie = sentMails.some((m) => m.to === 'charlie@learnspace.org');
      assert.strictEqual(sentToCharlie, false, 'Dropped student must not receive reminders');
    } finally {
      teardownMockTransport();
    }
  });

  await t.test('7. Instructors and administrators do not receive student reminders', async () => {
    setupMockTransport();
    try {
      const sentToInstructor = sentMails.some((m) => m.to === 'turing@learnspace.org');
      const sentToAdmin = sentMails.some((m) => m.to === 'admin@learnspace.org');
      assert.strictEqual(sentToInstructor, false, 'Instructor must never receive deadline reminders');
      assert.strictEqual(sentToAdmin, false, 'Admin must never receive deadline reminders');
    } finally {
      teardownMockTransport();
    }
  });

  await t.test('8. Draft or archived assignments are excluded', async () => {
    setupMockTransport();
    try {
      const now = new Date('2026-11-05T10:00:00.000Z');
      const dueDate = new Date(now.getTime() + 8 * 60 * 60 * 1000);

      createMockAssignment({
        course: course._id,
        instructor: instructor._id,
        title: 'Secret Draft Research Project',
        dueDate,
        status: 'draft',
      });

      createMockAssignment({
        course: course._id,
        instructor: instructor._id,
        title: 'Archived Legacy Assignment',
        dueDate,
        status: 'archived',
      });

      await processDeadlineReminders(now);

      const draftMail = sentMails.some((m) => m.subject.includes('Secret Draft'));
      const archivedMail = sentMails.some((m) => m.subject.includes('Archived Legacy'));
      assert.strictEqual(draftMail, false);
      assert.strictEqual(archivedMail, false);
    } finally {
      teardownMockTransport();
    }
  });

  await t.test('9. Past-deadline assignments are excluded', async () => {
    setupMockTransport();
    try {
      const now = new Date('2026-11-05T12:00:00.000Z');
      const pastDueDate = new Date(now.getTime() - 2 * 60 * 60 * 1000); // 2 hours ago

      createMockAssignment({
        course: course._id,
        instructor: instructor._id,
        title: 'Expired Past Assignment',
        dueDate: pastDueDate,
        status: 'published',
      });

      const initialCount = sentMails.length;
      await processDeadlineReminders(now);

      const expiredMail = sentMails.slice(initialCount).some((m) => m.subject.includes('Expired Past'));
      assert.strictEqual(expiredMail, false, 'Past deadline assignments must never trigger reminders');
    } finally {
      teardownMockTransport();
    }
  });

  await t.test('10. Assignments without valid deadlines are handled safely', async () => {
    setupMockTransport();
    try {
      const now = new Date('2026-11-05T14:00:00.000Z');

      createMockAssignment({
        course: course._id,
        instructor: instructor._id,
        title: 'Corrupted Null Due Date Assignment',
        dueDate: null,
        status: 'published',
      });

      createMockAssignment({
        course: course._id,
        instructor: instructor._id,
        title: 'Invalid NaN Due Date Assignment',
        dueDate: 'not-a-valid-date-string',
        status: 'published',
      });

      // Should run without throwing uncaught exceptions
      const results = await processDeadlineReminders(now);
      assert.strictEqual(results.errors.length, 0);
    } finally {
      teardownMockTransport();
    }
  });

  await t.test('11. Missing SMTP configuration logs simulation and does not crash the server', async () => {
    teardownMockTransport(); // test mode with no credentials
    const now = new Date('2026-11-06T10:00:00.000Z');
    const dueDate = new Date(now.getTime() + 10 * 60 * 60 * 1000);

    createMockAssignment({
      course: course._id,
      instructor: instructor._id,
      title: 'Simulation Mode Assignment',
      dueDate,
      status: 'published',
    });

    const results = await processDeadlineReminders(now);
    assert.strictEqual(results.errors.length, 0, 'Missing SMTP must not cause fatal errors');
    assert.ok(results.remindersSent >= 1, 'In-app notification is delivered despite missing SMTP');
  });

  await t.test('12. SMTP failure does not stop processing other eligible students or crash backend', async () => {
    setupMockTransport();
    shouldFailSend = true; // force transporter.sendMail rejection

    try {
      const now = new Date('2026-11-07T10:00:00.000Z');
      const dueDate = new Date(now.getTime() + 16 * 60 * 60 * 1000);

      const assignErrorTest = createMockAssignment({
        course: course._id,
        instructor: instructor._id,
        title: 'Resilience Test Under SMTP Failure',
        dueDate,
        status: 'published',
      });

      const results = await processDeadlineReminders(now);
      assert.strictEqual(results.errors.length, 0, 'Recipient email error is caught gracefully');

      // Deliveries exist, and emailStatus indicates 'failed'
      const deliveries = mockDeliveries.filter((d) => d.assignment.toString() === assignErrorTest._id.toString());
      assert.strictEqual(deliveries.length, 2);
      assert.strictEqual(deliveries[0].emailStatus, 'failed');
      assert.strictEqual(deliveries[1].emailStatus, 'failed');
    } finally {
      teardownMockTransport();
    }
  });

  await t.test('13. Failed email attempts are not falsely marked as successfully sent', async () => {
    setupMockTransport();
    shouldFailSend = true;

    try {
      const now = new Date('2026-11-08T10:00:00.000Z');
      const dueDate = new Date(now.getTime() + 14 * 60 * 60 * 1000);

      const assignment = createMockAssignment({
        course: course._id,
        instructor: instructor._id,
        title: 'Verification of Unsent Email Status',
        dueDate,
        status: 'published',
      });

      await processDeadlineReminders(now);

      const delivery = mockDeliveries.find((d) => d.assignment.toString() === assignment._id.toString());
      assert.ok(delivery);
      assert.notStrictEqual(delivery.emailStatus, 'delivered', 'Failed email must NOT be marked delivered');
      assert.strictEqual(delivery.emailStatus, 'failed');
      assert.ok(delivery.emailError.length > 0, 'emailError must capture failure message');
    } finally {
      teardownMockTransport();
    }
  });

  await t.test('14. Deadline change generates new version timestamp allowing future reminders', async () => {
    const originalDeadline = new Date('2026-11-10T12:00:00.000Z');
    const extendedDeadline = new Date('2026-11-12T12:00:00.000Z');

    const key1 = `${eligibleStudent1._id}_assign999_24h_${originalDeadline.getTime()}`;
    const key2 = `${eligibleStudent1._id}_assign999_24h_${extendedDeadline.getTime()}`;

    assert.notStrictEqual(key1, key2, 'Extended deadline produces a new unique idempotencyKey');
  });

  await t.test('15. Background scheduler can be started and stopped cleanly as a singleton', () => {
    const timer1 = startDeadlineReminderScheduler(60000);
    assert.ok(timer1, 'Timer should be active');

    const timer2 = startDeadlineReminderScheduler(60000);
    assert.strictEqual(timer1, timer2, 'Scheduler should be a singleton');

    stopDeadlineReminderScheduler();
    stopDeadlineReminderScheduler(); // idempotent stop
  });

  await t.test('16. Existing assignment lifecycle, submissions, and grading models remain intact', () => {
    const assign = createMockAssignment({
      course: course._id,
      instructor: instructor._id,
      title: 'Lifecycle Verification Test',
      dueDate: new Date(Date.now() + 86400000),
      status: 'draft',
    });
    assert.strictEqual(assign.status, 'draft');

    // Publish
    assign.status = 'published';
    assert.strictEqual(assign.status, 'published');

    // Submit
    const sub = createMockSubmission({
      assignment: assign._id,
      student: eligibleStudent1._id,
      course: course._id,
      status: 'submitted',
    });
    assert.strictEqual(sub.status, 'submitted');

    // Grade
    sub.status = 'graded';
    sub.grade = 95;
    assert.strictEqual(sub.status, 'graded');
    assert.strictEqual(sub.grade, 95);
  });
});
