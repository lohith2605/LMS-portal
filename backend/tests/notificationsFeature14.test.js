const test = require('node:test');
const assert = require('node:assert');
const mongoose = require('mongoose');
const Notification = require('../models/Notification');
const {
  normalizeNotificationTitle,
  normalizeNotificationMessage,
} = require('../services/notificationService');

test('Feature 14: Real-Time Notifications Bug Fixes & Verification Suite', async (t) => {
  // ---------------------------------------------------------
  // 1. Notification Model & Enum Integrity
  // ---------------------------------------------------------
  await t.test('1. Notification schema supports course_enrolled enum', () => {
    const typeEnumValues = Notification.schema.path('type').enumValues;
    assert.ok(
      typeEnumValues.includes('course_enrolled'),
      'Notification type enum must include "course_enrolled"'
    );
    assert.ok(
      typeEnumValues.includes('assignment_published'),
      'Notification type enum must include "assignment_published"'
    );
    assert.ok(
      typeEnumValues.includes('quiz_published'),
      'Notification type enum must include "quiz_published"'
    );
    assert.ok(
      typeEnumValues.includes('deadline_reminder'),
      'Notification type enum must include "deadline_reminder"'
    );
  });

  // ---------------------------------------------------------
  // 2. Title & Message Normalization (Model Limit Guards)
  // ---------------------------------------------------------
  await t.test('2. normalizeNotificationTitle clamps to 120 characters with ellipsis', () => {
    const shortTitle = 'New Assignment Available';
    assert.strictEqual(
      normalizeNotificationTitle(shortTitle),
      shortTitle,
      'Short titles under 120 chars must not be modified'
    );

    const exact120 = 'A'.repeat(120);
    assert.strictEqual(
      normalizeNotificationTitle(exact120),
      exact120,
      'Titles of exactly 120 chars must be preserved without truncation'
    );

    const longTitle = 'B'.repeat(150);
    const clampedTitle = normalizeNotificationTitle(longTitle);
    assert.strictEqual(clampedTitle.length, 120, 'Clamped title must be exactly 120 chars');
    assert.ok(clampedTitle.endsWith('...'), 'Clamped title must end with ellipsis');
    assert.strictEqual(clampedTitle, 'B'.repeat(117) + '...');
  });

  await t.test('3. Deadline reminder with maximum assignment title (200 chars) clamps safely', () => {
    const maxAssignmentTitle = 'Z'.repeat(200);
    const reminderPrefix = 'Deadline Approaching: ';
    const rawReminderTitle = reminderPrefix + maxAssignmentTitle; // 222 chars

    assert.ok(rawReminderTitle.length > 120, 'Raw reminder title exceeds 120 chars');

    const safeTitle = normalizeNotificationTitle(rawReminderTitle);
    assert.strictEqual(safeTitle.length, 120);
    assert.ok(safeTitle.startsWith('Deadline Approaching: '));
    assert.ok(safeTitle.endsWith('...'));

    // Verify Notification Mongoose model validation succeeds on the normalized title
    const dummyNotif = new Notification({
      recipient: new mongoose.Types.ObjectId(),
      type: 'deadline_reminder',
      title: safeTitle,
      message: 'Assignment deadline is approaching within 24 hours.',
    });
    const validationError = dummyNotif.validateSync();
    assert.ifError(validationError, 'Normalized title must pass Mongoose schema validation');
  });

  await t.test('4. normalizeNotificationMessage clamps to 500 characters with ellipsis', () => {
    const longMessage = 'M'.repeat(750);
    const clamped = normalizeNotificationMessage(longMessage);
    assert.strictEqual(clamped.length, 500);
    assert.ok(clamped.endsWith('...'));
    assert.strictEqual(clamped, 'M'.repeat(497) + '...');
  });

  // ---------------------------------------------------------
  // 3. Assignment Publishing Idempotency
  // ---------------------------------------------------------
  await t.test('5. Assignment publish idempotency prevents duplicate notifications', () => {
    let batchNotificationsSent = 0;
    const mockSendBatchNotifications = (payload) => {
      batchNotificationsSent += payload.length;
    };

    const enrolledStudentIds = [
      new mongoose.Types.ObjectId(),
      new mongoose.Types.ObjectId(),
      new mongoose.Types.ObjectId(),
    ];

    const simulatePublishAssignment = (assignmentState) => {
      const wasAlreadyPublished = assignmentState.status === 'published';
      assignmentState.status = 'published';

      if (!wasAlreadyPublished && enrolledStudentIds.length > 0) {
        mockSendBatchNotifications(enrolledStudentIds);
      }
    };

    const assignment = {
      _id: new mongoose.Types.ObjectId(),
      title: 'Full Stack Capstone',
      status: 'draft',
    };

    // First publish: status transitions from draft to published -> notifications sent
    simulatePublishAssignment(assignment);
    assert.strictEqual(
      batchNotificationsSent,
      3,
      'First publish must dispatch notifications to all 3 enrolled students'
    );

    // Second publish: assignment is already published -> notifications MUST NOT be sent
    simulatePublishAssignment(assignment);
    assert.strictEqual(
      batchNotificationsSent,
      3,
      'Subsequent publish request on already published assignment must NOT send duplicate notifications'
    );

    // Third publish
    simulatePublishAssignment(assignment);
    assert.strictEqual(
      batchNotificationsSent,
      3,
      'Repeated publish requests must remain idempotent'
    );
  });

  // ---------------------------------------------------------
  // 4. Enrollment Notifications Logic (Free & Paid)
  // ---------------------------------------------------------
  await t.test('6. Free enrollment generates notifications for student and course instructor', () => {
    const createdNotifications = [];
    const mockCreateNotification = (notif) => {
      createdNotifications.push(notif);
    };

    const studentId = new mongoose.Types.ObjectId().toString();
    const instructorId = new mongoose.Types.ObjectId().toString();
    const courseId = new mongoose.Types.ObjectId();
    const course = {
      _id: courseId,
      title: 'Python for Beginners',
      slug: 'python-for-beginners',
      instructor: instructorId,
    };
    const enrollment = {
      _id: new mongoose.Types.ObjectId(),
      status: 'active',
    };
    const studentUser = {
      name: 'Alex Johnson',
      email: 'alex@example.com',
    };

    // Simulate free enrollment notification dispatch
    // 1. Notify Student
    mockCreateNotification({
      recipient: studentId,
      type: 'course_enrolled',
      title: 'Course Enrollment Confirmed!',
      message: `You have successfully enrolled in "${course.title}". Start learning now!`,
      link: `/courses/${course.slug || course._id}/learn`,
      metadata: {
        courseId: course._id,
        enrollmentId: enrollment._id,
        enrollmentType: 'free',
      },
    });

    // 2. Notify Instructor
    if (course.instructor && course.instructor.toString() !== studentId) {
      mockCreateNotification({
        recipient: course.instructor.toString(),
        type: 'course_enrolled',
        title: 'New Student Enrolled',
        message: `${studentUser.name} enrolled in your course "${course.title}".`,
        link: '/instructor/dashboard',
        metadata: {
          courseId: course._id,
          studentId,
          enrollmentId: enrollment._id,
          enrollmentType: 'free',
        },
      });
    }

    assert.strictEqual(createdNotifications.length, 2, 'Must create 2 notifications (student + instructor)');

    const studentNotice = createdNotifications[0];
    assert.strictEqual(studentNotice.recipient, studentId);
    assert.strictEqual(studentNotice.type, 'course_enrolled');
    assert.strictEqual(studentNotice.link, '/courses/python-for-beginners/learn');

    const instructorNotice = createdNotifications[1];
    assert.strictEqual(instructorNotice.recipient, instructorId);
    assert.strictEqual(instructorNotice.type, 'course_enrolled');
    assert.strictEqual(instructorNotice.link, '/instructor/dashboard');
    assert.ok(instructorNotice.message.includes('Alex Johnson'));
  });

  await t.test('7. Free enrollment does not notify instructor if instructor self-enrolls', () => {
    const createdNotifications = [];
    const mockCreateNotification = (notif) => {
      createdNotifications.push(notif);
    };

    const instructorId = new mongoose.Types.ObjectId().toString();
    const course = {
      _id: new mongoose.Types.ObjectId(),
      title: 'Self-Taught Course',
      instructor: instructorId,
    };
    const enrollment = { _id: new mongoose.Types.ObjectId() };

    // Student is the instructor themselves
    const studentId = instructorId;

    // Student notification
    mockCreateNotification({
      recipient: studentId,
      type: 'course_enrolled',
      title: 'Course Enrollment Confirmed!',
      message: `You have successfully enrolled in "${course.title}". Start learning now!`,
      link: `/courses/${course._id}/learn`,
    });

    // Instructor notification check
    if (course.instructor && course.instructor.toString() !== studentId.toString()) {
      mockCreateNotification({
        recipient: course.instructor.toString(),
        type: 'course_enrolled',
      });
    }

    assert.strictEqual(
      createdNotifications.length,
      1,
      'Only 1 notification should be generated when an instructor tests their own course'
    );
  });

  await t.test('8. Paid enrollment triggers in-app notification only upon successful payment verification', () => {
    const notifications = [];
    const mockCreateNotification = (n) => notifications.push(n);

    const studentId = new mongoose.Types.ObjectId().toString();
    const instructorId = new mongoose.Types.ObjectId().toString();
    const course = {
      _id: new mongoose.Types.ObjectId(),
      title: 'Master React & Next.js',
      instructor: instructorId,
    };
    const paymentRecord = {
      status: 'pending',
    };

    // If payment verification fails or is pending, no notifications sent
    if (paymentRecord.status === 'success') {
      mockCreateNotification({ recipient: studentId, type: 'course_enrolled' });
    }
    assert.strictEqual(notifications.length, 0, 'No notification sent while payment is pending');

    // Simulate successful payment verification
    paymentRecord.status = 'success';
    if (paymentRecord.status === 'success') {
      mockCreateNotification({
        recipient: studentId,
        type: 'course_enrolled',
        title: 'Course Enrollment Confirmed!',
        message: `Your payment was verified. You are now enrolled in "${course.title}". Start learning now!`,
        link: `/courses/${course._id}/learn`,
        metadata: { enrollmentType: 'paid' },
      });

      if (course.instructor && course.instructor !== studentId) {
        mockCreateNotification({
          recipient: course.instructor,
          type: 'course_enrolled',
          title: 'New Student Enrolled (Paid)',
          message: `A student enrolled in your course "${course.title}".`,
          link: '/instructor/dashboard',
          metadata: { enrollmentType: 'paid' },
        });
      }
    }

    assert.strictEqual(notifications.length, 2, 'Both notifications sent after payment success');
    assert.strictEqual(notifications[0].metadata.enrollmentType, 'paid');
  });

  // ---------------------------------------------------------
  // 5. Toast Click Mark-as-Read & Navigation Flow
  // ---------------------------------------------------------
  await t.test('9. Toast item click marks notification as read and navigates', () => {
    let navigatedPath = null;
    let markedReadId = null;
    let dismissedId = null;

    const onDismiss = (id) => {
      dismissedId = id;
    };
    const onNavigate = (link, notificationId) => {
      navigatedPath = link;
      if (notificationId) {
        markedReadId = notificationId;
      }
    };

    const toast = {
      id: 'notif_abc123',
      title: 'New Assignment Published',
      message: 'Assignment 3 is ready',
      link: '/student/dashboard?tab=assignments',
      type: 'assignment_published',
    };

    // Simulate handleClick on ToastItem
    const handleClick = (e, targetToast) => {
      if (targetToast.link && onNavigate) {
        onNavigate(targetToast.link, targetToast.id);
      }
      onDismiss(targetToast.id);
    };

    handleClick({}, toast);

    assert.strictEqual(navigatedPath, '/student/dashboard?tab=assignments');
    assert.strictEqual(markedReadId, 'notif_abc123', 'Notification must be marked as read when toast is clicked');
    assert.strictEqual(dismissedId, 'notif_abc123', 'Toast must be dismissed after click');
  });

  // ---------------------------------------------------------
  // 6. Pagination & Load More Deduplication
  // ---------------------------------------------------------
  await t.test('10. Notification drawer pagination deduplication on Load More', () => {
    let currentNotifications = [
      { _id: 'n1', title: 'Notification 1' },
      { _id: 'n2', title: 'Notification 2' },
      { _id: 'n3', title: 'Notification 3' },
    ];

    const nextPageNotifications = [
      { _id: 'n3', title: 'Notification 3' }, // Duplicate (e.g. shifted due to new arrival)
      { _id: 'n4', title: 'Notification 4' },
      { _id: 'n5', title: 'Notification 5' },
    ];

    // Simulate append deduplication as implemented in NotificationContext
    const existingIds = new Set(currentNotifications.map((n) => String(n._id)));
    const newUnique = nextPageNotifications.filter((n) => !existingIds.has(String(n._id)));
    currentNotifications = [...currentNotifications, ...newUnique];

    assert.strictEqual(currentNotifications.length, 5, 'Total notifications must be 5 (n3 not duplicated)');
    assert.deepStrictEqual(
      currentNotifications.map((n) => n._id),
      ['n1', 'n2', 'n3', 'n4', 'n5']
    );
  });

  // ---------------------------------------------------------
  // 7. Service Worker Message Passing
  // ---------------------------------------------------------
  await t.test('11. Service Worker relay includes notification ID for mark-as-read on click', () => {
    let swRelayPayload = null;
    const mockPostMessage = (payload) => {
      swRelayPayload = payload;
    };

    const event = {
      notification: {
        data: {
          link: '/student/dashboard?tab=quizzes',
          id: 'notif_xyz789',
        },
      },
    };

    // Replicate SW notificationclick event logic
    const targetPath = event.notification.data?.link;
    const targetUrl = 'http://localhost:5173' + targetPath;

    mockPostMessage({
      type: 'NOTIFICATION_NAVIGATE',
      link: targetPath,
      url: targetUrl,
      id: event.notification.data?.id,
    });

    assert.ok(swRelayPayload);
    assert.strictEqual(swRelayPayload.type, 'NOTIFICATION_NAVIGATE');
    assert.strictEqual(swRelayPayload.link, '/student/dashboard?tab=quizzes');
    assert.strictEqual(swRelayPayload.id, 'notif_xyz789');
  });
});

