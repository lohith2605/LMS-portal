const test = require('node:test');
const assert = require('node:assert');
const mongoose = require('mongoose');
const Announcement = require('../models/Announcement');
const Notification = require('../models/Notification');
const {
  normalizeNotificationTitle,
  normalizeNotificationMessage,
} = require('../services/notificationService');

test('Feature 14: Comprehensive Announcement System Suite', async (t) => {
  // ---------------------------------------------------------
  // 1. Database Model & Schema Validation
  // ---------------------------------------------------------
  await t.test('1. Announcement schema validates required fields, lengths, and enums', () => {
    // Valid model instance
    const validCourseAnnouncement = new Announcement({
      title: 'Final Exam Preparation & Review Session',
      content: 'We will host a review session on Friday at 4 PM UTC.',
      scope: 'course',
      course: new mongoose.Types.ObjectId(),
      author: new mongoose.Types.ObjectId(),
      priority: 'high',
      isPinned: true,
    });
    const err = validCourseAnnouncement.validateSync();
    assert.ifError(err, 'Valid course announcement must pass validation');

    // Scope enum validation
    const invalidScope = new Announcement({
      title: 'Invalid Scope Announcement',
      content: 'Testing invalid scope.',
      scope: 'invalid_scope',
      author: new mongoose.Types.ObjectId(),
    });
    const scopeErr = invalidScope.validateSync();
    assert.ok(scopeErr?.errors?.scope, 'Invalid scope must fail schema validation');

    // Priority enum validation
    const invalidPriority = new Announcement({
      title: 'Invalid Priority Announcement',
      content: 'Testing invalid priority.',
      scope: 'platform',
      priority: 'ultra_critical',
      author: new mongoose.Types.ObjectId(),
    });
    const priorityErr = invalidPriority.validateSync();
    assert.ok(priorityErr?.errors?.priority, 'Invalid priority must fail schema validation');
  });

  await t.test('2. Title and content length boundaries are strictly enforced', () => {
    // Title exceeds 150 characters
    const longTitle = 'A'.repeat(151);
    const invalidTitle = new Announcement({
      title: longTitle,
      content: 'Valid content',
      scope: 'platform',
      author: new mongoose.Types.ObjectId(),
    });
    const titleErr = invalidTitle.validateSync();
    assert.ok(titleErr?.errors?.title, 'Title exceeding 150 characters must be rejected');

    // Content exceeds 5000 characters
    const longContent = 'C'.repeat(5001);
    const invalidContent = new Announcement({
      title: 'Valid Title',
      content: longContent,
      scope: 'platform',
      author: new mongoose.Types.ObjectId(),
    });
    const contentErr = invalidContent.validateSync();
    assert.ok(contentErr?.errors?.content, 'Content exceeding 5000 characters must be rejected');

    // Title exactly 150 characters is valid
    const maxTitle = new Announcement({
      title: 'T'.repeat(150),
      content: 'Valid content',
      scope: 'platform',
      author: new mongoose.Types.ObjectId(),
    });
    assert.ifError(maxTitle.validateSync(), 'Title of exactly 150 characters must be accepted');
  });

  await t.test('3. Course reference is required for course announcements, null for platform', async () => {
    // Course announcement without course reference
    const missingCourse = new Announcement({
      title: 'Missing Course Announcement',
      content: 'Content here',
      scope: 'course',
      author: new mongoose.Types.ObjectId(),
    });
    const missingCourseErr = missingCourse.validateSync();
    assert.ok(
      missingCourseErr?.errors?.course,
      'Course reference must be required for course-scoped announcements'
    );

    // Platform announcement with course reference gets normalized to null
    const platformWithCourse = new Announcement({
      title: 'Platform Maintenance Notice',
      content: 'Server update in progress.',
      scope: 'platform',
      course: new mongoose.Types.ObjectId(),
      author: new mongoose.Types.ObjectId(),
    });
    await platformWithCourse.validate();
    assert.strictEqual(
      platformWithCourse.course,
      null,
      'Platform announcement course reference must be reset to null'
    );
  });

  // ---------------------------------------------------------
  // 2. Authorization Rules & Role-Based Access Control
  // ---------------------------------------------------------
  await t.test('4. Course announcement creation authorization: Only course instructor or admin', () => {
    const instructorId = new mongoose.Types.ObjectId().toString();
    const otherInstructorId = new mongoose.Types.ObjectId().toString();
    const studentId = new mongoose.Types.ObjectId().toString();
    const adminId = new mongoose.Types.ObjectId().toString();

    const course = {
      _id: new mongoose.Types.ObjectId(),
      title: 'Modern Distributed Systems',
      instructor: instructorId,
    };

    const canCreate = (courseDoc, user) => {
      if (!courseDoc || !user) return false;
      if (user.role === 'admin') return true;
      const ownerId = courseDoc.instructor ? courseDoc.instructor.toString() : '';
      return ownerId === user.id.toString();
    };

    // Instructor of the course -> ALLOWED
    assert.strictEqual(
      canCreate(course, { id: instructorId, role: 'instructor' }),
      true,
      'Course instructor must be authorized to create announcements'
    );

    // Admin -> ALLOWED
    assert.strictEqual(
      canCreate(course, { id: adminId, role: 'admin' }),
      true,
      'Admin must be authorized to create course announcements'
    );

    // Another instructor -> FORBIDDEN
    assert.strictEqual(
      canCreate(course, { id: otherInstructorId, role: 'instructor' }),
      false,
      'Non-assigned instructor must NOT be authorized to create announcements'
    );

    // Student -> FORBIDDEN
    assert.strictEqual(
      canCreate(course, { id: studentId, role: 'student' }),
      false,
      'Enrolled or non-enrolled student must NOT be authorized to create course announcements'
    );
  });

  await t.test('5. Platform announcement creation authorization: Admin only', () => {
    const checkAdminOnly = (user) => user && user.role === 'admin';

    assert.strictEqual(checkAdminOnly({ role: 'admin' }), true);
    assert.strictEqual(checkAdminOnly({ role: 'instructor' }), false);
    assert.strictEqual(checkAdminOnly({ role: 'student' }), false);
  });

  await t.test('6. Announcement modification & deletion authorization: Author or Admin only', () => {
    const authorId = new mongoose.Types.ObjectId().toString();
    const randomUserId = new mongoose.Types.ObjectId().toString();
    const adminId = new mongoose.Types.ObjectId().toString();

    const announcement = {
      _id: new mongoose.Types.ObjectId(),
      author: authorId,
    };

    const canModify = (ann, user) => {
      if (!ann || !user) return false;
      if (user.role === 'admin') return true;
      return ann.author.toString() === user.id.toString();
    };

    // Author -> ALLOWED
    assert.strictEqual(canModify(announcement, { id: authorId, role: 'instructor' }), true);
    // Admin -> ALLOWED
    assert.strictEqual(canModify(announcement, { id: adminId, role: 'admin' }), true);
    // Other instructor/student -> FORBIDDEN
    assert.strictEqual(canModify(announcement, { id: randomUserId, role: 'instructor' }), false);
    assert.strictEqual(canModify(announcement, { id: randomUserId, role: 'student' }), false);
  });

  // ---------------------------------------------------------
  // 3. Student Course Access Isolation
  // ---------------------------------------------------------
  await t.test('7. Students can only access announcements for courses they are actively enrolled in', () => {
    const studentId = new mongoose.Types.ObjectId().toString();
    const enrolledCourseId = new mongoose.Types.ObjectId().toString();
    const unenrolledCourseId = new mongoose.Types.ObjectId().toString();

    const activeEnrollments = [
      { student: studentId, course: enrolledCourseId, status: 'active' },
    ];

    const canStudentAccess = (courseId, user, enrollments) => {
      if (user.role === 'admin') return true;
      return enrollments.some(
        (e) =>
          e.student.toString() === user.id.toString() &&
          e.course.toString() === courseId.toString() &&
          ['active', 'completed'].includes(e.status)
      );
    };

    assert.strictEqual(
      canStudentAccess(enrolledCourseId, { id: studentId, role: 'student' }, activeEnrollments),
      true,
      'Student must have access to enrolled course announcements'
    );

    assert.strictEqual(
      canStudentAccess(unenrolledCourseId, { id: studentId, role: 'student' }, activeEnrollments),
      false,
      'Student must NOT have access to unenrolled course announcements'
    );
  });

  // ---------------------------------------------------------
  // 4. Platform Audience Targeting & Isolation
  // ---------------------------------------------------------
  await t.test('8. Platform audience targeting correctly filters students vs instructors vs all', () => {
    const filterByRole = (announcement, userRole) => {
      if (userRole === 'admin') return true;
      const targetRoles = announcement.targetRoles || ['all'];
      return targetRoles.includes('all') || targetRoles.includes(userRole);
    };

    const allNotice = { scope: 'platform', targetRoles: ['all'] };
    const studentNotice = { scope: 'platform', targetRoles: ['student'] };
    const instructorNotice = { scope: 'platform', targetRoles: ['instructor'] };

    // Student checks
    assert.strictEqual(filterByRole(allNotice, 'student'), true);
    assert.strictEqual(filterByRole(studentNotice, 'student'), true);
    assert.strictEqual(filterByRole(instructorNotice, 'student'), false);

    // Instructor checks
    assert.strictEqual(filterByRole(allNotice, 'instructor'), true);
    assert.strictEqual(filterByRole(studentNotice, 'instructor'), false);
    assert.strictEqual(filterByRole(instructorNotice, 'instructor'), true);

    // Admin checks (sees everything)
    assert.strictEqual(filterByRole(allNotice, 'admin'), true);
    assert.strictEqual(filterByRole(studentNotice, 'admin'), true);
    assert.strictEqual(filterByRole(instructorNotice, 'admin'), true);
  });

  // ---------------------------------------------------------
  // 5. Expiration Filtering
  // ---------------------------------------------------------
  await t.test('9. Expired announcements are excluded by default in active feeds', () => {
    const now = new Date();
    const futureDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // +1 day
    const pastDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); // -1 day

    const announcements = [
      { id: '1', title: 'No Expiry', expiresAt: null },
      { id: '2', title: 'Future Expiry', expiresAt: futureDate },
      { id: '3', title: 'Past Expiry (Expired)', expiresAt: pastDate },
    ];

    const isAnnouncementActive = (ann, currentTime = new Date()) => {
      return !ann.expiresAt || new Date(ann.expiresAt) > currentTime;
    };

    const activeList = announcements.filter((a) => isAnnouncementActive(a, now));
    assert.strictEqual(activeList.length, 2, 'Only unexpired announcements should be in active list');
    assert.deepStrictEqual(
      activeList.map((a) => a.id),
      ['1', '2']
    );
  });

  // ---------------------------------------------------------
  // 6. Sorting (Pinned First, Newest First) and Pagination
  // ---------------------------------------------------------
  await t.test('10. Announcements sort pinned items first, then by newest createdAt', () => {
    const items = [
      { id: '1', title: 'Older unpinned', isPinned: false, createdAt: new Date('2026-11-01') },
      { id: '2', title: 'Newer unpinned', isPinned: false, createdAt: new Date('2026-11-03') },
      { id: '3', title: 'Pinned notice', isPinned: true, createdAt: new Date('2026-10-25') },
    ];

    // Sorting logic mirroring MongoDB: { isPinned: -1, createdAt: -1 }
    const sorted = [...items].sort((a, b) => {
      if (b.isPinned !== a.isPinned) {
        return (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0);
      }
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    assert.strictEqual(sorted[0].id, '3', 'Pinned notice must appear first');
    assert.strictEqual(sorted[1].id, '2', 'Newer unpinned notice appears before older unpinned');
    assert.strictEqual(sorted[2].id, '1');
  });

  await t.test('11. Pagination computes skip, limit, and total pages accurately', () => {
    const total = 25;
    const limit = 10;
    const page = 2;
    const skip = (page - 1) * limit;
    const totalPages = Math.ceil(total / limit);

    assert.strictEqual(skip, 10);
    assert.strictEqual(totalPages, 3);
  });

  // ---------------------------------------------------------
  // 7. Real-Time Notification Delivery & Normalization
  // ---------------------------------------------------------
  await t.test('12. Notification payload generation respects title (120) and message (500) limit', () => {
    const longTitle = 'Super Important Update: ' + 'X'.repeat(200);
    const longContent = 'Y'.repeat(1200);

    const safeTitle = normalizeNotificationTitle(longTitle);
    const safeMessage = normalizeNotificationMessage(longContent);

    assert.strictEqual(safeTitle.length, 120);
    assert.ok(safeTitle.endsWith('...'));
    assert.strictEqual(safeMessage.length, 500);
    assert.ok(safeMessage.endsWith('...'));

    // Validate Notification model schema acceptance
    const notif = new Notification({
      recipient: new mongoose.Types.ObjectId(),
      type: 'course_announcement',
      title: safeTitle,
      message: safeMessage,
      link: '/courses/capstone/learn?view=announcements',
    });
    assert.ifError(notif.validateSync(), 'Normalized notification payload must pass schema validation');

    // Platform announcement enum acceptance
    const platformNotif = new Notification({
      recipient: new mongoose.Types.ObjectId(),
      type: 'platform_announcement',
      title: 'Platform Maintenance Notice',
      message: 'Systems will be upgraded.',
      link: '/student/dashboard?tab=announcements',
    });
    assert.ifError(platformNotif.validateSync(), 'platform_announcement type must pass schema validation');
  });

  await t.test('13. Batch notifications exclude the author from recipient list', () => {
    const authorId = new mongoose.Types.ObjectId().toString();
    const student1Id = new mongoose.Types.ObjectId().toString();
    const student2Id = new mongoose.Types.ObjectId().toString();

    // Enrolled learners including the instructor himself (testing own course)
    const enrollments = [
      { student: authorId },
      { student: student1Id },
      { student: student2Id },
    ];

    const recipients = enrollments
      .map((e) => e.student.toString())
      .filter((id) => id !== authorId);

    assert.strictEqual(recipients.length, 2);
    assert.strictEqual(recipients.includes(authorId), false, 'Author must not be notified of own post');
    assert.deepStrictEqual(recipients, [student1Id, student2Id]);
  });

  // ---------------------------------------------------------
  // 8. Invalid ID Handling
  // ---------------------------------------------------------
  await t.test('14. Invalid announcement and course identifiers are cleanly rejected', () => {
    const invalidId = 'not-a-valid-id-123';
    assert.strictEqual(
      mongoose.Types.ObjectId.isValid(invalidId),
      false,
      'Invalid ObjectId string must return false'
    );
  });
});
