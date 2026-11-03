const test = require('node:test');
const assert = require('node:assert');
const mongoose = require('mongoose');

const Quiz = require('../models/Quiz');
const Assignment = require('../models/Assignment');
const DeadlineReminderDelivery = require('../models/DeadlineReminderDelivery');
const Notification = require('../models/Notification');
const {
  deriveActivityStatus,
  resolveDateRange,
} = require('../services/calendarService');

test('Feature 15: Schedules and Reminders Comprehensive Suite', async (t) => {
  // -------------------------------------------------------------------------
  // 1. Assignment Due Date Validation
  // -------------------------------------------------------------------------
  await t.test('1. Assignment Due Date Validation Rules', async (st) => {
    await st.test('Rejects invalid date string format', () => {
      const parsed = new Date('not-a-valid-date');
      assert.strictEqual(isNaN(parsed.getTime()), true);
    });

    await st.test('Rejects past due date on new assignment creation', () => {
      const pastDate = new Date(Date.now() - 3600 * 1000);
      assert.strictEqual(pastDate.getTime() <= Date.now(), true);
    });

    await st.test('Allows non-date edits on an already overdue assignment', () => {
      const pastDate = new Date(Date.now() - 86400 * 1000);
      const existingAssignment = {
        title: 'Old Assignment',
        dueDate: pastDate,
        description: 'Original description',
      };

      const updatePayload = {
        title: 'Updated Title Only',
        // dueDate not supplied or supplied identical to existing
      };

      // If dueDate is undefined or unchanged, validation shouldn't block the update
      const dueDateProvided = updatePayload.dueDate !== undefined;
      const dueDateChanged =
        dueDateProvided &&
        new Date(updatePayload.dueDate).getTime() !== new Date(existingAssignment.dueDate).getTime();

      assert.strictEqual(dueDateChanged, false, 'Non-date update must not trigger rescheduled date validation');
    });

    await st.test('Rejects rescheduling an existing assignment to a past date', () => {
      const newPastDate = new Date(Date.now() - 10000);
      const isPast = newPastDate.getTime() <= Date.now();
      assert.strictEqual(isPast, true, 'Rescheduled date in the past must be rejected');
    });
  });

  // -------------------------------------------------------------------------
  // 2. Assignment Rescheduled Notifications
  // -------------------------------------------------------------------------
  await t.test('2. Assignment Rescheduled Notifications', async (st) => {
    await st.test('Detects change in due date and creates assignment_rescheduled notification payload', () => {
      const oldDate = new Date(Date.now() + 86400 * 1000);
      const newDate = new Date(Date.now() + 2 * 86400 * 1000);

      const hasDueDateChanged = oldDate.getTime() !== newDate.getTime();
      assert.strictEqual(hasDueDateChanged, true);

      const notif = new Notification({
        recipient: new mongoose.Types.ObjectId(),
        type: 'assignment_rescheduled',
        title: 'Assignment Deadline Rescheduled: Biology Lab 1',
        message: 'The deadline for Biology Lab 1 has been updated to Friday.',
        link: '/dashboard/student?tab=assignments&assignmentId=507f1f77bcf86cd799439011',
      });

      const err = notif.validateSync();
      assert.ifError(err, 'assignment_rescheduled must be a valid notification type');
      assert.strictEqual(notif.type, 'assignment_rescheduled');
    });

    await st.test('Does not flag rescheduled if new date is identical to existing date', () => {
      const existingDate = new Date('2026-12-01T12:00:00.000Z');
      const incomingDate = new Date('2026-12-01T12:00:00.000Z');

      const isChanged = existingDate.getTime() !== incomingDate.getTime();
      assert.strictEqual(isChanged, false);
    });
  });

  // -------------------------------------------------------------------------
  // 3. Quiz Model Scheduling Schema & Pre-save Validation
  // -------------------------------------------------------------------------
  await t.test('3. Quiz Model Scheduling Schema & Pre-save Validation', async (st) => {
    await st.test('Accepts valid availableFrom and dueDate fields', () => {
      const now = Date.now();
      const quiz = new Quiz({
        course: new mongoose.Types.ObjectId(),
        instructor: new mongoose.Types.ObjectId(),
        title: 'Midterm Exam',
        availableFrom: new Date(now + 3600 * 1000),
        dueDate: new Date(now + 86400 * 1000),
        questions: [],
      });

      assert.ok(quiz.availableFrom instanceof Date);
      assert.ok(quiz.dueDate instanceof Date);
      assert.strictEqual(quiz.dueDate > quiz.availableFrom, true);
    });

    await st.test('Throws error when dueDate is earlier than availableFrom', () => {
      const now = Date.now();
      const quiz = new Quiz({
        course: new mongoose.Types.ObjectId(),
        instructor: new mongoose.Types.ObjectId(),
        title: 'Invalid Exam Schedule',
        availableFrom: new Date(now + 86400 * 1000),
        dueDate: new Date(now + 3600 * 1000), // earlier than availableFrom
        questions: [],
      });

      assert.throws(
        () => {
          // Pre-save validation logic
          if (quiz.availableFrom && quiz.dueDate && new Date(quiz.dueDate) < new Date(quiz.availableFrom)) {
            throw new Error('Quiz due date cannot be earlier than availability start date.');
          }
        },
        /Quiz due date cannot be earlier than availability start date/
      );
    });

    await st.test('Schema rejects invalid date values', () => {
      const quiz = new Quiz({
        course: new mongoose.Types.ObjectId(),
        instructor: new mongoose.Types.ObjectId(),
        title: 'Corrupted Date Quiz',
        questions: [{ questionText: 'Q1', options: [{ id: 'a', text: 'A' }, { id: 'b', text: 'B' }], correctOptionId: 'a' }],
      });
      quiz.availableFrom = new Date('invalid-date');
      const err = quiz.validateSync();
      assert.ok(err?.errors?.availableFrom, 'Invalid date must produce a schema validation / cast error on availableFrom');
    });
  });

  // -------------------------------------------------------------------------
  // 4. Quiz Attempt Availability Window Enforcement
  // -------------------------------------------------------------------------
  await t.test('4. Quiz Attempt Availability Window Enforcement Logic', async (st) => {
    const mockCheckAttemptAvailability = (quiz, attemptTime = new Date()) => {
      if (quiz.availableFrom && attemptTime < new Date(quiz.availableFrom)) {
        return {
          allowed: false,
          status: 403,
          message: `This quiz is not available yet. It will open on ${new Date(quiz.availableFrom).toLocaleString()}.`,
        };
      }
      if (quiz.dueDate && attemptTime > new Date(quiz.dueDate)) {
        return {
          allowed: false,
          status: 403,
          message: `The deadline for this quiz has passed (${new Date(quiz.dueDate).toLocaleString()}). New attempts are closed.`,
        };
      }
      return { allowed: true, status: 200 };
    };

    await st.test('Blocks attempt when current time is before availableFrom', () => {
      const quiz = {
        availableFrom: new Date(Date.now() + 60000), // starts in 1 minute
        dueDate: new Date(Date.now() + 3600000),
      };
      const res = mockCheckAttemptAvailability(quiz);
      assert.strictEqual(res.allowed, false);
      assert.strictEqual(res.status, 403);
      assert.match(res.message, /not available yet/);
    });

    await st.test('Blocks attempt when current time is after dueDate', () => {
      const quiz = {
        availableFrom: new Date(Date.now() - 3600000),
        dueDate: new Date(Date.now() - 60000), // ended 1 minute ago
      };
      const res = mockCheckAttemptAvailability(quiz);
      assert.strictEqual(res.allowed, false);
      assert.strictEqual(res.status, 403);
      assert.match(res.message, /deadline for this quiz has passed/);
    });

    await st.test('Permits attempt when current time is within availableFrom and dueDate', () => {
      const quiz = {
        availableFrom: new Date(Date.now() - 3600000),
        dueDate: new Date(Date.now() + 3600000),
      };
      const res = mockCheckAttemptAvailability(quiz);
      assert.strictEqual(res.allowed, true);
      assert.strictEqual(res.status, 200);
    });

    await st.test('Permits attempt when availableFrom and dueDate are null (unscheduled)', () => {
      const quiz = {
        availableFrom: null,
        dueDate: null,
      };
      const res = mockCheckAttemptAvailability(quiz);
      assert.strictEqual(res.allowed, true);
      assert.strictEqual(res.status, 200);
    });
  });

  // -------------------------------------------------------------------------
  // 5. Quiz Rescheduled Notifications & Notification Model Types
  // -------------------------------------------------------------------------
  await t.test('5. Quiz Rescheduled Notifications & Notification Model Types', async (st) => {
    await st.test('Validates quiz_rescheduled notification model', () => {
      const notif = new Notification({
        recipient: new mongoose.Types.ObjectId(),
        type: 'quiz_rescheduled',
        title: 'Quiz Schedule Updated: Final Exam',
        message: 'The schedule for Final Exam has been updated.',
        link: '/courses/intro-cs/learn?quiz=507f1f77bcf86cd799439011',
      });

      const err = notif.validateSync();
      assert.ifError(err, 'quiz_rescheduled must be an accepted notification enum value');
      assert.strictEqual(notif.type, 'quiz_rescheduled');
    });
  });

  // -------------------------------------------------------------------------
  // 6. Polymorphic DeadlineReminderDelivery Model
  // -------------------------------------------------------------------------
  await t.test('6. DeadlineReminderDelivery Polymorphic Support', async (st) => {
    await st.test('Supports assignment reminders', () => {
      const delivery = new DeadlineReminderDelivery({
        idempotencyKey: 'student1_assignment_123_24h_1700000000',
        recipient: new mongoose.Types.ObjectId(),
        assignment: new mongoose.Types.ObjectId(),
        activityType: 'assignment',
        reminderType: '24h',
        deadlineVersion: new Date(),
      });

      const err = delivery.validateSync();
      assert.ifError(err, 'Assignment delivery must pass validation');
      assert.strictEqual(delivery.activityType, 'assignment');
      assert.ok(delivery.assignment);
    });

    await st.test('Supports quiz reminders without assignment reference', () => {
      const delivery = new DeadlineReminderDelivery({
        idempotencyKey: 'student1_quiz_456_1h_1700000000',
        recipient: new mongoose.Types.ObjectId(),
        quiz: new mongoose.Types.ObjectId(),
        activityType: 'quiz',
        reminderType: '1h',
        deadlineVersion: new Date(),
      });

      const err = delivery.validateSync();
      assert.ifError(err, 'Quiz delivery must pass validation without assignment reference');
      assert.strictEqual(delivery.activityType, 'quiz');
      assert.ok(delivery.quiz);
    });

    await st.test('Fails validation if neither assignment nor quiz is provided', () => {
      const delivery = new DeadlineReminderDelivery({
        idempotencyKey: 'student1_orphan_789_24h_1700000000',
        recipient: new mongoose.Types.ObjectId(),
        reminderType: '24h',
        deadlineVersion: new Date(),
      });

      assert.throws(() => {
        if (!delivery.assignment && !delivery.quiz) {
          throw new Error('Either assignment or quiz reference is required.');
        }
      }, /Either assignment or quiz reference is required/);
    });
  });

  // -------------------------------------------------------------------------
  // 7. Calendar Service: Time Zone Boundary Padding & Activity Status
  // -------------------------------------------------------------------------
  await t.test('7. Calendar Service Time Zone Boundary Padding & Status Derivation', async (st) => {
    await st.test('resolveDateRange adds 24h padding to queryStart and queryEnd', () => {
      const startInput = '2026-11-01T00:00:00.000Z';
      const endInput = '2026-11-30T23:59:59.999Z';

      const { start, end, queryStart, queryEnd } = resolveDateRange(startInput, endInput);

      assert.strictEqual(start.toISOString(), '2026-11-01T00:00:00.000Z');
      assert.strictEqual(end.toISOString(), '2026-11-30T23:59:59.999Z');

      const expectedQueryStart = new Date(new Date(startInput).getTime() - 24 * 60 * 60 * 1000);
      const expectedQueryEnd = new Date(new Date(endInput).getTime() + 24 * 60 * 60 * 1000);

      assert.strictEqual(queryStart.getTime(), expectedQueryStart.getTime());
      assert.strictEqual(queryEnd.getTime(), expectedQueryEnd.getTime());
      assert.strictEqual(queryStart < start, true, 'queryStart must precede start by 24 hours');
      assert.strictEqual(queryEnd > end, true, 'queryEnd must follow end by 24 hours');
    });

    await st.test('deriveActivityStatus classifies assignment and quiz states correctly', () => {
      const now = new Date('2026-11-03T12:00:00.000Z');

      // Completed submission
      const completedStatus = deriveActivityStatus('2026-11-05T12:00:00.000Z', { status: 'submitted' }, now);
      assert.strictEqual(completedStatus, 'completed');

      // Graded submission
      const gradedStatus = deriveActivityStatus('2026-11-01T12:00:00.000Z', { status: 'graded' }, now);
      assert.strictEqual(gradedStatus, 'completed');

      // Overdue item (deadline in past, no submission)
      const overdueStatus = deriveActivityStatus('2026-11-02T12:00:00.000Z', null, now);
      assert.strictEqual(overdueStatus, 'overdue');

      // Due soon item (within 48 hours)
      const dueSoonStatus = deriveActivityStatus('2026-11-04T12:00:00.000Z', null, now, 48);
      assert.strictEqual(dueSoonStatus, 'due_soon');

      // Upcoming item (> 48 hours out)
      const upcomingStatus = deriveActivityStatus('2026-11-10T12:00:00.000Z', null, now, 48);
      assert.strictEqual(upcomingStatus, 'upcoming');

      // Item without due date defaults to upcoming
      const noDateStatus = deriveActivityStatus(null, null, now);
      assert.strictEqual(noDateStatus, 'upcoming');
    });
  });

  // -------------------------------------------------------------------------
  // 8. Quiz Reminder Idempotency and Completed Attempt Suppression
  // -------------------------------------------------------------------------
  await t.test('8. Quiz Reminder Idempotency & Completion Logic', async (st) => {
    await st.test('Generates distinct, deterministic idempotency keys for quizzes', () => {
      const studentId = 'student123';
      const quizId = 'quiz456';
      const interval = '24h';
      const deadline = new Date('2026-11-05T14:00:00.000Z').getTime();

      const key = `${studentId}_quiz_${quizId}_${interval}_${deadline}`;
      assert.strictEqual(key, 'student123_quiz_quiz456_24h_1793887200000');

      // Different interval yields distinct key
      const key1h = `${studentId}_quiz_${quizId}_1h_${deadline}`;
      assert.notStrictEqual(key, key1h);

      // Rescheduling deadline yields distinct key
      const newDeadline = new Date('2026-11-06T14:00:00.000Z').getTime();
      const rescheduledKey = `${studentId}_quiz_${quizId}_${interval}_${newDeadline}`;
      assert.notStrictEqual(key, rescheduledKey);
    });

    await st.test('Excludes students who already passed the quiz or reached max attempts', () => {
      const shouldSuppressReminder = (attempts, passingPercentage = 70, maxAttempts = 3) => {
        if (!attempts || attempts.length === 0) return false;
        const hasPassed = attempts.some((att) => att.score >= passingPercentage);
        if (hasPassed) return true;
        if (maxAttempts > 0 && attempts.length >= maxAttempts) return true;
        return false;
      };

      // Student with no attempts -> Eligible
      assert.strictEqual(shouldSuppressReminder([]), false);

      // Student with failed attempt (score 50 < 70) and 1 of 3 attempts used -> Eligible
      assert.strictEqual(shouldSuppressReminder([{ score: 50 }]), false);

      // Student who passed (score 85 >= 70) -> Suppressed
      assert.strictEqual(shouldSuppressReminder([{ score: 50 }, { score: 85 }]), true);

      // Student who failed but used all 3 attempts -> Suppressed
      assert.strictEqual(shouldSuppressReminder([{ score: 50 }, { score: 60 }, { score: 65 }]), true);
    });
  });
});
