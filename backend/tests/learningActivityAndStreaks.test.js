const test = require('node:test');
const assert = require('node:assert');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const request = require('supertest');
const { app } = require('../server');

const User = require('../models/User');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const Session = require('../models/Session');
const LearningActivity = require('../models/LearningActivity');
const DailyStudySummary = require('../models/DailyStudySummary');
const streakService = require('../services/streakService');
const { createSession, resetInMemorySessions } = require('../utils/sessionUtils');

const TEST_SECRET = 'test_jwt_secret_key_12345678901234567890';
process.env.JWT_SECRET = TEST_SECRET;
process.env.NODE_ENV = 'test';

// In-memory mock store
let mockUsers = [];
let mockCourses = [];
let mockEnrollments = [];
let mockSessions = [];
let mockLearningActivities = [];
let mockDailyStudySummaries = [];
let idCounter = 5000;

const makeObjectId = () => {
  const hex = (idCounter++).toString(16).padStart(24, '0');
  return new mongoose.Types.ObjectId(hex);
};

const resetTestDb = () => {
  mockUsers = [];
  mockCourses = [];
  mockEnrollments = [];
  mockSessions = [];
  mockLearningActivities = [];
  mockDailyStudySummaries = [];
  idCounter = 5000;
  resetInMemorySessions();
};

// Wire Mongoose Model Mocks
User.findById = (id) => {
  const user = mockUsers.find((u) => u._id.toString() === id.toString());
  const queryObj = {
    select: () => queryObj,
    lean: () => Promise.resolve(user || null),
    then: (resolve, reject) => Promise.resolve(user || null).then(resolve, reject),
  };
  return queryObj;
};

User.findByIdAndUpdate = async (id, update) => {
  const user = mockUsers.find((u) => u._id.toString() === id.toString());
  if (user && update) {
    if (update.timezone) user.timezone = update.timezone;
    if (update.learningStreak) {
      user.learningStreak = { ...(user.learningStreak || {}), ...update.learningStreak };
    }
  }
  return user || null;
};

Course.findById = (id) => {
  const course = mockCourses.find((c) => c._id.toString() === id.toString());
  return {
    select: () => Promise.resolve(course || null),
    lean: () => Promise.resolve(course || null),
    then: (resolve) => Promise.resolve(course || null).then(resolve),
  };
};

Course.findOne = (query) => {
  const course = mockCourses.find((c) => {
    if (query._id && c._id.toString() === query._id.toString()) return true;
    if (query.slug && c.slug === query.slug) return true;
    return false;
  });
  return {
    populate: () => Promise.resolve(course || null),
    then: (resolve) => Promise.resolve(course || null).then(resolve),
  };
};

Enrollment.findOne = (query) => {
  const enrollment = mockEnrollments.find((e) => {
    let match = true;
    if (query.student && e.student.toString() !== query.student.toString()) match = false;
    if (query.course && e.course.toString() !== query.course.toString()) match = false;
    if (query.status) {
      if (typeof query.status === 'object' && query.status.$in) {
        if (!query.status.$in.includes(e.status)) match = false;
      } else if (e.status !== query.status) {
        match = false;
      }
    }
    return match;
  });
  return Promise.resolve(enrollment || null);
};

Enrollment.find = (query = {}) => {
  const filtered = mockEnrollments.filter((e) => {
    let match = true;
    if (query.student && e.student.toString() !== query.student.toString()) match = false;
    return match;
  });
  const queryObj = {
    populate: () => queryObj,
    sort: () => queryObj,
    lean: () => Promise.resolve(filtered),
    then: (resolve) => Promise.resolve(filtered).then(resolve),
  };
  return queryObj;
};

Session.findById = (id) => {
  const session = mockSessions.find((s) => s._id.toString() === id.toString());
  return Promise.resolve(session || null);
};

Session.findOne = (query) => {
  const session = mockSessions.find((s) => {
    let match = true;
    if (query._id && s._id.toString() !== query._id.toString()) match = false;
    if (query.user && s.user.toString() !== query.user.toString()) match = false;
    if (query.status && s.status !== query.status) match = false;
    return match;
  });
  return Promise.resolve(session || null);
};

LearningActivity.create = async (doc) => {
  const created = {
    _id: makeObjectId(),
    occurredAt: new Date(),
    ...doc,
  };
  mockLearningActivities.push(created);
  return created;
};

LearningActivity.findOne = async (query) => {
  const found = mockLearningActivities.find((a) => {
    let match = true;
    if (query.student && a.student.toString() !== query.student.toString()) match = false;
    if (query.course && a.course.toString() !== query.course.toString()) match = false;
    if (query.lessonId && a.lessonId?.toString() !== query.lessonId.toString()) match = false;
    if (query.activityType && a.activityType !== query.activityType) match = false;
    if (query.idempotencyKey && a.idempotencyKey !== query.idempotencyKey) match = false;
    return match;
  });
  return found || null;
};

LearningActivity.find = (query = {}) => {
  const filtered = mockLearningActivities.filter((a) => {
    let match = true;
    if (query.student && a.student.toString() !== query.student.toString()) match = false;
    if (query.localDateKey && a.localDateKey !== query.localDateKey) match = false;
    return match;
  });
  return {
    lean: () => Promise.resolve(filtered),
    then: (resolve) => Promise.resolve(filtered).then(resolve),
  };
};

DailyStudySummary.find = (query = {}) => {
  const filtered = mockDailyStudySummaries.filter((s) => {
    let match = true;
    if (query.student && s.student.toString() !== query.student.toString()) match = false;
    if (query.qualifyingActivitiesCount && query.qualifyingActivitiesCount.$gt !== undefined) {
      if (s.qualifyingActivitiesCount <= query.qualifyingActivitiesCount.$gt) match = false;
    }
    return match;
  });
  return {
    select: () => ({
      lean: () => Promise.resolve(filtered),
      then: (r) => Promise.resolve(filtered).then(r),
    }),
    lean: () => Promise.resolve(filtered),
    then: (resolve) => Promise.resolve(filtered).then(resolve),
  };
};

DailyStudySummary.findOne = async (query) => {
  const found = mockDailyStudySummaries.find((s) => {
    let match = true;
    if (query.student && s.student.toString() !== query.student.toString()) match = false;
    if (query.dateKey && s.dateKey !== query.dateKey) match = false;
    return match;
  });
  return found || null;
};

DailyStudySummary.findOneAndUpdate = async (query, update, options = {}) => {
  let summary = mockDailyStudySummaries.find((s) => {
    let match = true;
    if (query.student && s.student.toString() !== query.student.toString()) match = false;
    if (query.dateKey && s.dateKey !== query.dateKey) match = false;
    return match;
  });

  if (!summary && options.upsert) {
    summary = {
      _id: makeObjectId(),
      student: query.student,
      dateKey: query.dateKey,
      timezone: 'Asia/Kolkata',
      activeStudySeconds: 0,
      qualifyingActivitiesCount: 0,
      qualifyingActivities: [],
      coursesStudied: [],
      ...(options.setDefaultsOnInsert ? (update.$setOnInsert || {}) : {}),
    };
    mockDailyStudySummaries.push(summary);
  }

  if (summary && update) {
    if (update.$inc) {
      if (update.$inc.activeStudySeconds !== undefined) {
        summary.activeStudySeconds = (summary.activeStudySeconds || 0) + update.$inc.activeStudySeconds;
      }
      if (update.$inc.qualifyingActivitiesCount !== undefined) {
        summary.qualifyingActivitiesCount =
          (summary.qualifyingActivitiesCount || 0) + update.$inc.qualifyingActivitiesCount;
      }
    }
    if (update.$addToSet && update.$addToSet.coursesStudied) {
      if (!summary.coursesStudied.some((c) => c.toString() === update.$addToSet.coursesStudied.toString())) {
        summary.coursesStudied.push(update.$addToSet.coursesStudied);
      }
    }
    if (update.$push && update.$push.qualifyingActivities) {
      summary.qualifyingActivities.push(update.$push.qualifyingActivities);
    }
  }

  return summary;
};

// Fixture helpers
const createStudent = (overrides = {}) => {
  const student = {
    _id: makeObjectId(),
    name: 'Student Learner',
    email: 'learner@learnspace.org',
    role: 'student',
    accountStatus: 'active',
    emailVerified: true,
    timezone: 'Asia/Kolkata',
    learningStreak: { currentStreak: 0, longestStreak: 0, lastQualifiedDate: null },
    changedPasswordAfter: () => false,
    ...overrides,
  };
  mockUsers.push(student);
  return student;
};

const createActiveSession = async (user) => {
  return await createSession({
    user,
    req: {
      headers: { 'user-agent': 'Chrome/124.0.0.0' },
      ip: '127.0.0.1',
    },
  });
};

const makeAuthCookie = (user, session) => {
  return jwt.sign(
    {
      id: user._id.toString(),
      role: user.role,
      sid: session._id.toString(),
      purpose: 'authenticated',
    },
    TEST_SECRET,
    { expiresIn: '8h' }
  );
};

const createCourseWithLesson = (overrides = {}) => {
  const lessonId = makeObjectId();
  const sectionId = makeObjectId();
  const course = {
    _id: makeObjectId(),
    title: 'Full Stack JavaScript',
    slug: 'full-stack-javascript',
    status: 'published',
    sections: [
      {
        _id: sectionId,
        title: 'Module 1: Foundations',
        lessons: [
          {
            _id: lessonId,
            title: 'Lesson 1.1: Modern JS Intro',
            duration: '10 mins',
            contentType: 'video',
            isPublished: true,
          },
        ],
      },
    ],
    ...overrides,
  };
  mockCourses.push(course);
  return { course, sectionId, lessonId };
};

const createEnrollment = (user, course) => {
  const enrollment = {
    _id: makeObjectId(),
    student: user._id,
    course: course._id,
    status: 'active',
    completedLessons: [],
    async save() {
      return this;
    },
  };
  mockEnrollments.push(enrollment);
  return enrollment;
};

// ============================================================================
// PART D: LEARNING ACTIVITY TESTS (Tests 1-12)
// ============================================================================

test('1. An eligible lesson completion is persisted in LearningActivity and DailyStudySummary', async () => {
  resetTestDb();
  const student = createStudent();
  const { course, lessonId, sectionId } = createCourseWithLesson();
  createEnrollment(student, course);

  const res = await streakService.recordQualifyingActivity({
    userId: student._id,
    courseId: course._id,
    lessonId,
    sectionId,
    activityType: 'lesson_completion',
    timeZone: 'Asia/Kolkata',
  });

  assert.strictEqual(res.success, true);
  assert.strictEqual(res.qualifyingActivitiesCount, 1);
  assert.strictEqual(mockLearningActivities.length, 1);
  assert.strictEqual(mockLearningActivities[0].activityType, 'lesson_completion');
  assert.strictEqual(mockDailyStudySummaries.length, 1);
  assert.strictEqual(mockDailyStudySummaries[0].qualifyingActivitiesCount, 1);
});

test('2. An unauthenticated request cannot record learning activity or study time', async () => {
  resetTestDb();
  const { course } = createCourseWithLesson();

  const res = await request(app)
    .post('/api/learning-activity/heartbeat')
    .send({ courseId: course._id.toString(), durationSeconds: 60 });

  assert.strictEqual(res.status, 401);
});

test('3. A revoked or expired session cannot record learning activity', async () => {
  resetTestDb();
  const student = createStudent();
  const session = await createActiveSession(student);
  session.revokedAt = new Date();
  session.revokeReason = 'manual_logout';
  const token = makeAuthCookie(student, session);
  const { course } = createCourseWithLesson();

  const res = await request(app)
    .post('/api/learning-activity/heartbeat')
    .set('Cookie', [`jwt=${token}`])
    .send({ courseId: course._id.toString(), durationSeconds: 30 });

  assert.strictEqual(res.status, 401);
});

test('4. A student cannot record activity for another student account', async () => {
  resetTestDb();
  const studentA = createStudent({ email: 'studentA@learnspace.org' });
  const studentB = createStudent({ email: 'studentB@learnspace.org' });
  const sessionA = await createActiveSession(studentA);
  const tokenA = makeAuthCookie(studentA, sessionA);
  const { course } = createCourseWithLesson();
  createEnrollment(studentB, course); // Student B is enrolled, but Student A is not

  // Even if client attempts to pass studentId: studentB in body, API uses req.user.id
  const res = await request(app)
    .post('/api/learning-activity/heartbeat')
    .set('Cookie', [`jwt=${tokenA}`])
    .send({
      studentId: studentB._id.toString(),
      courseId: course._id.toString(),
      durationSeconds: 45,
    });

  // Student A is not enrolled in course, rejected with 403
  assert.strictEqual(res.status, 403);
});

test('5. A student cannot record completion for a course they are not enrolled in', async () => {
  resetTestDb();
  const student = createStudent();
  const { course, lessonId } = createCourseWithLesson();
  // Not enrolled!

  await assert.rejects(
    async () => {
      await streakService.recordQualifyingActivity({
        userId: student._id,
        courseId: course._id,
        lessonId,
        activityType: 'lesson_completion',
      });
    },
    (err) => {
      assert.strictEqual(err.statusCode, 403);
      assert.match(err.message, /enrolled in this course/);
      return true;
    }
  );
});

test('6. A lesson must belong to the specified course to record completion', async () => {
  resetTestDb();
  const student = createStudent();
  const { course } = createCourseWithLesson();
  createEnrollment(student, course);
  const alienLessonId = makeObjectId(); // Does not belong to this course

  await assert.rejects(
    async () => {
      await streakService.recordQualifyingActivity({
        userId: student._id,
        courseId: course._id,
        lessonId: alienLessonId,
        activityType: 'lesson_completion',
      });
    },
    (err) => {
      assert.strictEqual(err.statusCode, 400);
      assert.match(err.message, /belong to the specified course/);
      return true;
    }
  );
});

test('7. Duplicate completion events do not create duplicate streak credit', async () => {
  resetTestDb();
  const student = createStudent();
  const { course, lessonId, sectionId } = createCourseWithLesson();
  createEnrollment(student, course);

  const res1 = await streakService.recordQualifyingActivity({
    userId: student._id,
    courseId: course._id,
    lessonId,
    sectionId,
    activityType: 'lesson_completion',
  });
  assert.strictEqual(res1.success, true);
  assert.strictEqual(res1.duplicate, undefined);

  // Second submission for the same lesson
  const res2 = await streakService.recordQualifyingActivity({
    userId: student._id,
    courseId: course._id,
    lessonId,
    sectionId,
    activityType: 'lesson_completion',
  });
  assert.strictEqual(res2.success, true);
  assert.strictEqual(res2.duplicate, true);

  // Daily summary qualifyingActivitiesCount should remain 1, not 2
  const summary = mockDailyStudySummaries[0];
  assert.strictEqual(summary.qualifyingActivitiesCount, 1);
});

test('8. Invalid and oversized durations are rejected', async () => {
  resetTestDb();
  const student = createStudent();
  const { course } = createCourseWithLesson();
  createEnrollment(student, course);

  // Zero duration
  await assert.rejects(
    async () => {
      await streakService.recordActiveStudyTime({
        userId: student._id,
        courseId: course._id,
        durationSeconds: 0,
      });
    },
    (err) => err.statusCode === 400
  );

  // Negative duration
  await assert.rejects(
    async () => {
      await streakService.recordActiveStudyTime({
        userId: student._id,
        courseId: course._id,
        durationSeconds: -30,
      });
    },
    (err) => err.statusCode === 400
  );

  // Oversized duration (> 300 seconds)
  await assert.rejects(
    async () => {
      await streakService.recordActiveStudyTime({
        userId: student._id,
        courseId: course._id,
        durationSeconds: 301,
      });
    },
    (err) => err.statusCode === 400
  );
});

test('9. Duplicate interval submissions with same idempotencyKey do not double-count study time', async () => {
  resetTestDb();
  const student = createStudent();
  const { course } = createCourseWithLesson();
  createEnrollment(student, course);
  const idempotencyKey = 'interval-client-uuid-1234';

  const res1 = await streakService.recordActiveStudyTime({
    userId: student._id,
    courseId: course._id,
    durationSeconds: 60,
    idempotencyKey,
  });
  assert.strictEqual(res1.success, true);
  assert.strictEqual(res1.alreadyRecorded, undefined);

  const res2 = await streakService.recordActiveStudyTime({
    userId: student._id,
    courseId: course._id,
    durationSeconds: 60,
    idempotencyKey,
  });
  assert.strictEqual(res2.success, true);
  assert.strictEqual(res2.alreadyRecorded, true);

  // Study time should be exactly 60s, NOT 120s
  const summary = mockDailyStudySummaries[0];
  assert.strictEqual(summary.activeStudySeconds, 60);
});

test('10. Background polling does not generate study time or qualify streaks', async () => {
  resetTestDb();
  const student = createStudent();
  const session = await createActiveSession(student);
  const token = makeAuthCookie(student, session);

  // Background notifications polling
  const res = await request(app)
    .get('/api/notifications/unread-count')
    .set('Cookie', [`jwt=${token}`])
    .set('x-background-request', 'true');

  // Verify no learning activities or summaries were created
  assert.strictEqual(mockLearningActivities.length, 0);
  assert.strictEqual(mockDailyStudySummaries.length, 0);
});

test('11. Client can send bounded interval with visibility metadata', async () => {
  resetTestDb();
  const student = createStudent();
  const { course } = createCourseWithLesson();
  createEnrollment(student, course);

  const res = await streakService.recordActiveStudyTime({
    userId: student._id,
    courseId: course._id,
    durationSeconds: 45,
    metadata: { tabVisible: true, playbackRate: 1.0 },
  });

  assert.strictEqual(res.success, true);
  assert.strictEqual(res.durationSeconds, 45);
  assert.strictEqual(mockLearningActivities[0].metadata.tabVisible, true);
});

test('12. Existing lesson progress remains correct after completion integration', async () => {
  resetTestDb();
  const student = createStudent();
  const { course, lessonId } = createCourseWithLesson();
  const enrollment = createEnrollment(student, course);

  // Toggle complete in courseController
  const req = {
    user: { id: student._id.toString() },
    params: { courseId: course._id.toString(), lessonId: lessonId.toString() },
    body: {},
    headers: {},
  };
  let responseData = null;
  const res = {
    status: (code) => ({
      json: (data) => {
        responseData = data;
        return data;
      },
    }),
  };

  const { toggleLessonComplete } = require('../controllers/courseController');
  await toggleLessonComplete(req, res);

  assert.strictEqual(responseData.isCompleted, true);
  assert.strictEqual(enrollment.completedLessons.length, 1);
  assert.strictEqual(enrollment.completedLessons[0].toString(), lessonId.toString());
});

// ============================================================================
// PART D: STREAK TESTS (Tests 13-25)
// ============================================================================

test('13. A qualifying activity today creates a current streak of 1 when no previous day exists', () => {
  const today = '2026-11-01';
  const res = streakService.computeStreaksFromDates([today], today);

  assert.strictEqual(res.currentStreak, 1);
  assert.strictEqual(res.longestStreak, 1);
  assert.strictEqual(res.todayQualified, true);
  assert.strictEqual(res.lastQualifiedDate, today);
});

test('14. Two consecutive qualifying local dates produce a streak of 2', () => {
  const today = '2026-11-01';
  const yesterday = '2026-10-31';
  const res = streakService.computeStreaksFromDates([yesterday, today], today);

  assert.strictEqual(res.currentStreak, 2);
  assert.strictEqual(res.longestStreak, 2);
  assert.strictEqual(res.todayQualified, true);
});

test('15. Three consecutive qualifying local dates produce a streak of 3', () => {
  const today = '2026-11-01';
  const yesterday = '2026-10-31';
  const twoDaysAgo = '2026-10-30';
  const res = streakService.computeStreaksFromDates([twoDaysAgo, yesterday, today], today);

  assert.strictEqual(res.currentStreak, 3);
  assert.strictEqual(res.longestStreak, 3);
  assert.strictEqual(res.todayQualified, true);
});

test('16. A missed day breaks the current streak', () => {
  const today = '2026-11-01';
  const threeDaysAgo = '2026-10-29';
  const fourDaysAgo = '2026-10-28';
  // 10-30 and 10-31 are missing!
  const res = streakService.computeStreaksFromDates([fourDaysAgo, threeDaysAgo, today], today);

  // Since yesterday was missed, current streak only counts from today = 1
  assert.strictEqual(res.currentStreak, 1);
  // Longest streak from the 2-day historical run
  assert.strictEqual(res.longestStreak, 2);
});

test('17. Today absence does not immediately break yesterday active streak', () => {
  const today = '2026-11-01';
  const yesterday = '2026-10-31';
  const twoDaysAgo = '2026-10-30';
  // Qualified on twoDaysAgo and yesterday, but not yet today
  const res = streakService.computeStreaksFromDates([twoDaysAgo, yesterday], today);

  assert.strictEqual(res.todayQualified, false);
  // Streak remains active/ongoing at 2
  assert.strictEqual(res.currentStreak, 2);
  assert.strictEqual(res.longestStreak, 2);
});

test('18. Multiple completions on the same date count as 1 streak day', () => {
  const today = '2026-11-01';
  const dates = [today, today, today];
  const res = streakService.computeStreaksFromDates(dates, today);

  assert.strictEqual(res.currentStreak, 1);
  assert.strictEqual(res.longestStreak, 1);
});

test('19. Duplicate events do not inflate streak values', () => {
  const today = '2026-11-01';
  const yesterday = '2026-10-31';
  const dates = [yesterday, yesterday, today, today, yesterday];
  const res = streakService.computeStreaksFromDates(dates, today);

  assert.strictEqual(res.currentStreak, 2);
  assert.strictEqual(res.longestStreak, 2);
});

test('20. Longest streak remains correct after current streak breaks', () => {
  const today = '2026-11-01';
  // Historical 5-day streak: 2026-10-01 to 2026-10-05
  // Current 2-day streak: 2026-10-31 to 2026-11-01
  const dates = [
    '2026-10-01',
    '2026-10-02',
    '2026-10-03',
    '2026-10-04',
    '2026-10-05',
    '2026-10-31',
    '2026-11-01',
  ];
  const res = streakService.computeStreaksFromDates(dates, today);

  assert.strictEqual(res.currentStreak, 2);
  assert.strictEqual(res.longestStreak, 5);
});

test('21. Longest streak updates when a new historical maximum is reached', () => {
  const today = '2026-11-04';
  const dates = [
    '2026-10-01',
    '2026-10-02', // 2-day run
    '2026-11-01',
    '2026-11-02',
    '2026-11-03',
    '2026-11-04', // 4-day run
  ];
  const res = streakService.computeStreaksFromDates(dates, today);

  assert.strictEqual(res.currentStreak, 4);
  assert.strictEqual(res.longestStreak, 4);
});

test('22. Local midnight boundaries and timezone identifiers are handled correctly', () => {
  // Midnight boundary test: UTC 18:30 on 2026-10-31 is 00:00 on 2026-11-01 in Asia/Kolkata
  const dateAtMidnightKolkata = new Date('2026-10-31T18:30:00.000Z');
  const kolkataDateKey = streakService.getLocalDateKey(dateAtMidnightKolkata, 'Asia/Kolkata');
  const utcDateKey = streakService.getLocalDateKey(dateAtMidnightKolkata, 'UTC');

  assert.strictEqual(kolkataDateKey, '2026-11-01');
  assert.strictEqual(utcDateKey, '2026-10-31');
  assert.strictEqual(streakService.isValidTimeZone('Asia/Kolkata'), true);
  assert.strictEqual(streakService.isValidTimeZone('America/New_York'), true);
  assert.strictEqual(streakService.isValidTimeZone('Invalid/Not_Real_TZ'), false);
});

test('23. Weekly totals use local week boundaries and return 7 days', async () => {
  resetTestDb();
  const student = createStudent({ timezone: 'Asia/Kolkata' });

  // Today is Sunday 2026-11-01 in our local timezone
  // Add activity for today and yesterday
  mockDailyStudySummaries.push({
    _id: makeObjectId(),
    student: student._id,
    dateKey: streakService.getLocalDateKey(new Date(), 'Asia/Kolkata'),
    activeStudySeconds: 1200,
    qualifyingActivitiesCount: 2,
  });

  const summary = await streakService.getLearningSummary(student._id, 'Asia/Kolkata');

  assert.strictEqual(summary.dailySummaries.length, 7);
  assert.strictEqual(summary.todayStudySeconds, 1200);
  assert.strictEqual(summary.weekStudySeconds, 1200);
  assert.strictEqual(summary.todayQualified, true);
  assert.strictEqual(summary.currentStreak, 1);
});

test('24. A user with no activity receives a valid zero-state response', async () => {
  resetTestDb();
  const student = createStudent();

  const summary = await streakService.getLearningSummary(student._id, 'Asia/Kolkata');

  assert.strictEqual(summary.currentStreak, 0);
  assert.strictEqual(summary.longestStreak, 0);
  assert.strictEqual(summary.todayStudySeconds, 0);
  assert.strictEqual(summary.weekStudySeconds, 0);
  assert.strictEqual(summary.todayQualified, false);
  assert.strictEqual(summary.lastQualifiedDate, null);
  assert.strictEqual(summary.dailySummaries.length, 7);
  summary.dailySummaries.forEach((d) => {
    assert.strictEqual(d.studySeconds, 0);
    assert.strictEqual(d.qualifyingCount, 0);
  });
});

test('25. User A cannot retrieve User B activity summaries', async () => {
  resetTestDb();
  const studentA = createStudent({ email: 'studentA@learnspace.org' });
  const studentB = createStudent({ email: 'studentB@learnspace.org' });
  const sessionA = await createActiveSession(studentA);
  const tokenA = makeAuthCookie(studentA, sessionA);

  // Student B has 3600 seconds of study
  const todayKey = streakService.getLocalDateKey(new Date(), 'Asia/Kolkata');
  mockDailyStudySummaries.push({
    _id: makeObjectId(),
    student: studentB._id,
    dateKey: todayKey,
    activeStudySeconds: 3600,
    qualifyingActivitiesCount: 1,
  });

  // Student A requests summary
  const res = await request(app)
    .get('/api/learning-activity/summary')
    .set('Cookie', [`jwt=${tokenA}`]);

  assert.strictEqual(res.status, 200);
  // Student A should see 0 study seconds, NOT Student B's 3600
  assert.strictEqual(res.body.todayStudySeconds, 0);
  assert.strictEqual(res.body.currentStreak, 0);
});

// ============================================================================
// PART D: INTEGRATION TESTS (Tests 26-29)
// ============================================================================

test('26. Existing authentication and session management continue to work', async () => {
  resetTestDb();
  const student = createStudent();
  const session = await createActiveSession(student);
  const token = makeAuthCookie(student, session);

  const res = await request(app)
    .get('/api/auth/me')
    .set('Cookie', [`jwt=${token}`]);

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.user.email, student.email);
});

test('27. Existing course progress and student routes remain compatible', async () => {
  resetTestDb();
  const student = createStudent();
  const session = await createActiveSession(student);
  const token = makeAuthCookie(student, session);

  const res = await request(app)
    .get('/api/student/enrollments')
    .set('Cookie', [`jwt=${token}`]);

  assert.strictEqual(res.status, 200);
});

test('28. Automatic tracking requests do not extend the authentication idle timeout', async () => {
  resetTestDb();
  const student = createStudent();
  const initialIdleExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 mins left
  const session = await createActiveSession(student);
  session.idleExpiresAt = initialIdleExpiresAt;
  const token = makeAuthCookie(student, session);
  const { course } = createCourseWithLesson();
  createEnrollment(student, course);

  // Heartbeat endpoint has isBackgroundPolling detection
  await request(app)
    .post('/api/learning-activity/heartbeat')
    .set('Cookie', [`jwt=${token}`])
    .send({ courseId: course._id.toString(), durationSeconds: 30 });

  // Session idleExpiresAt must NOT have been refreshed
  assert.strictEqual(session.idleExpiresAt.getTime(), initialIdleExpiresAt.getTime());
});

test('29. Both /api/learning-activity/summary and /api/student/learning-activity/summary resolve correctly', async () => {
  resetTestDb();
  const student = createStudent();
  const session = await createActiveSession(student);
  const token = makeAuthCookie(student, session);

  const res1 = await request(app)
    .get('/api/learning-activity/summary')
    .set('Cookie', [`jwt=${token}`]);

  const res2 = await request(app)
    .get('/api/student/learning-activity/summary')
    .set('Cookie', [`jwt=${token}`]);

  assert.strictEqual(res1.status, 200);
  assert.strictEqual(res2.status, 200);
  assert.strictEqual(res1.body.currentStreak, 0);
  assert.strictEqual(res2.body.currentStreak, 0);
});

test('30. GET /api/learning-activity/monthly returns monthly calendar history and enforces isolation', async () => {
  resetTestDb();
  const student = createStudent({ email: 'monthly@learnspace.org' });
  const otherStudent = createStudent({ email: 'other@learnspace.org' });
  const session = await createActiveSession(student);
  const token = makeAuthCookie(student, session);

  // Add records in November 2026
  mockDailyStudySummaries.push(
    {
      _id: makeObjectId(),
      student: student._id,
      dateKey: '2026-11-01',
      activeStudySeconds: 1800,
      qualifyingActivitiesCount: 2,
    },
    {
      _id: makeObjectId(),
      student: student._id,
      dateKey: '2026-11-02',
      activeStudySeconds: 900,
      qualifyingActivitiesCount: 1,
    },
    {
      _id: makeObjectId(),
      student: otherStudent._id,
      dateKey: '2026-11-03',
      activeStudySeconds: 7200,
      qualifyingActivitiesCount: 5,
    }
  );

  const res = await request(app)
    .get('/api/learning-activity/monthly?month=2026-11')
    .set('Cookie', [`jwt=${token}`]);

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.month, '2026-11');
  assert.strictEqual(res.body.days.length, 2);
  // Student should only see their own 2 days, not otherStudent's day
  assert.strictEqual(res.body.days.some((d) => d.date === '2026-11-03'), false);
  assert.strictEqual(res.body.days.find((d) => d.date === '2026-11-01')?.studySeconds, 1800);
});

test('31. GET /api/learning-activity/summary returns todayQualifyingCount accurately', async () => {
  resetTestDb();
  const student = createStudent();
  const session = await createActiveSession(student);
  const token = makeAuthCookie(student, session);
  const todayKey = streakService.getLocalDateKey(new Date(), 'Asia/Kolkata');

  mockDailyStudySummaries.push({
    _id: makeObjectId(),
    student: student._id,
    dateKey: todayKey,
    activeStudySeconds: 2400,
    qualifyingActivitiesCount: 3,
  });

  const res = await request(app)
    .get('/api/learning-activity/summary')
    .set('Cookie', [`jwt=${token}`]);

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.todayStudySeconds, 2400);
  assert.strictEqual(res.body.todayQualifyingCount, 3);
  assert.strictEqual(res.body.todayQualified, true);
  assert.strictEqual(res.body.isGoalCompleted, true);
  assert.strictEqual(res.body.dailyGoalSeconds, 900);
  assert.strictEqual(res.body.dailyGoalMinutes, 15);
});

test('32. Active study time reaching 15 minutes (900s) qualifies today without lesson completion', async () => {
  resetTestDb();
  const student = createStudent();
  const session = await createActiveSession(student);
  const token = makeAuthCookie(student, session);
  const todayKey = streakService.getLocalDateKey(new Date(), 'Asia/Kolkata');

  // Study time reaches 900 seconds (15 minutes), with 0 completed lessons
  mockDailyStudySummaries.push({
    _id: makeObjectId(),
    student: student._id,
    dateKey: todayKey,
    activeStudySeconds: 900,
    qualifyingActivitiesCount: 0,
  });

  const res = await request(app)
    .get('/api/learning-activity/summary')
    .set('Cookie', [`jwt=${token}`]);

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.todayStudySeconds, 900);
  assert.strictEqual(res.body.todayQualifyingCount, 0);
  assert.strictEqual(res.body.isGoalCompleted, true);
  assert.strictEqual(res.body.todayQualified, true);
  assert.strictEqual(res.body.currentStreak, 1);
});

test('33. Study time under 15 minutes (e.g. 480s / 8 min) keeps flame muted and goal in-progress', async () => {
  resetTestDb();
  const student = createStudent();
  const session = await createActiveSession(student);
  const token = makeAuthCookie(student, session);
  const todayKey = streakService.getLocalDateKey(new Date(), 'Asia/Kolkata');

  // 480 seconds (8 mins), 0 qualifying activities
  mockDailyStudySummaries.push({
    _id: makeObjectId(),
    student: student._id,
    dateKey: todayKey,
    activeStudySeconds: 480,
    qualifyingActivitiesCount: 0,
  });

  const res = await request(app)
    .get('/api/learning-activity/summary')
    .set('Cookie', [`jwt=${token}`]);

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.todayStudySeconds, 480);
  assert.strictEqual(res.body.isGoalCompleted, false);
  assert.strictEqual(res.body.todayQualified, false);
  assert.strictEqual(res.body.currentStreak, 0);
});

test('34. Returning student with streak from yesterday retains streak count today while goal is in progress', async () => {
  resetTestDb();
  const student = createStudent();
  const session = await createActiveSession(student);
  const token = makeAuthCookie(student, session);
  const todayKey = streakService.getLocalDateKey(new Date(), 'Asia/Kolkata');
  const yesterdayKey = streakService.getOffsetDateKey(todayKey, -1);
  const twoDaysAgoKey = streakService.getOffsetDateKey(todayKey, -2);

  // Student qualified 2 days ago and yesterday (2-day streak). Today has 300s (5m) study time, not yet 15m
  mockDailyStudySummaries.push(
    {
      _id: makeObjectId(),
      student: student._id,
      dateKey: twoDaysAgoKey,
      activeStudySeconds: 1200,
      qualifyingActivitiesCount: 1,
    },
    {
      _id: makeObjectId(),
      student: student._id,
      dateKey: yesterdayKey,
      activeStudySeconds: 1000,
      qualifyingActivitiesCount: 1,
    },
    {
      _id: makeObjectId(),
      student: student._id,
      dateKey: todayKey,
      activeStudySeconds: 300,
      qualifyingActivitiesCount: 0,
    }
  );

  const res = await request(app)
    .get('/api/learning-activity/summary')
    .set('Cookie', [`jwt=${token}`]);

  assert.strictEqual(res.status, 200);
  // Current streak is preserved as 2 (consecutive from yesterday)
  assert.strictEqual(res.body.currentStreak, 2);
  // Goal is in-progress, not completed yet
  assert.strictEqual(res.body.todayStudySeconds, 300);
  assert.strictEqual(res.body.isGoalCompleted, false);
  assert.strictEqual(res.body.todayQualified, false);
});

test('35. Completing goal today advances returning student streak from 2 to 3', async () => {
  resetTestDb();
  const student = createStudent();
  const session = await createActiveSession(student);
  const token = makeAuthCookie(student, session);
  const todayKey = streakService.getLocalDateKey(new Date(), 'Asia/Kolkata');
  const yesterdayKey = streakService.getOffsetDateKey(todayKey, -1);
  const twoDaysAgoKey = streakService.getOffsetDateKey(todayKey, -2);

  mockDailyStudySummaries.push(
    {
      _id: makeObjectId(),
      student: student._id,
      dateKey: twoDaysAgoKey,
      activeStudySeconds: 1200,
      qualifyingActivitiesCount: 1,
    },
    {
      _id: makeObjectId(),
      student: student._id,
      dateKey: yesterdayKey,
      activeStudySeconds: 1000,
      qualifyingActivitiesCount: 1,
    },
    {
      _id: makeObjectId(),
      student: student._id,
      dateKey: todayKey,
      activeStudySeconds: 950, // Reached 15 minutes!
      qualifyingActivitiesCount: 0,
    }
  );

  const res = await request(app)
    .get('/api/learning-activity/summary')
    .set('Cookie', [`jwt=${token}`]);

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.currentStreak, 3);
  assert.strictEqual(res.body.isGoalCompleted, true);
  assert.strictEqual(res.body.todayQualified, true);
});
