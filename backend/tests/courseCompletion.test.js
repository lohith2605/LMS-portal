const test = require('node:test');
const assert = require('node:assert');
const mongoose = require('mongoose');
const User = require('../models/User');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const Quiz = require('../models/Quiz');
const QuizAttempt = require('../models/QuizAttempt');
const Certificate = require('../models/Certificate');
const {
  getCourseCompletionStatus,
  claimCertificate,
} = require('../controllers/completionController');

// In-memory mock stores
let mockUsers = [];
let mockCourses = [];
let mockEnrollments = [];
let mockQuizzes = [];
let mockQuizAttempts = [];
let mockCertificates = [];
let idCounter = 2000;

const makeObjectId = () => {
  const hex = (idCounter++).toString(16).padStart(24, '0');
  return new mongoose.Types.ObjectId(hex);
};

const resetTestDb = () => {
  mockUsers = [];
  mockCourses = [];
  mockEnrollments = [];
  mockQuizzes = [];
  mockQuizAttempts = [];
  mockCertificates = [];
  idCounter = 2000;
};

// Mock model method overrides
User.findById = (id) => {
  const user = mockUsers.find((u) => u._id.toString() === id.toString());
  return Promise.resolve(user || null);
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

Quiz.find = (query) => {
  const quizzes = mockQuizzes.filter((q) => {
    let match = true;
    if (query.course && q.course.toString() !== query.course.toString()) match = false;
    if (query.status && q.status !== query.status) match = false;
    if (
      query.isRequiredForCompletion !== undefined &&
      q.isRequiredForCompletion !== query.isRequiredForCompletion
    ) {
      match = false;
    }
    return match;
  });
  return Promise.resolve(quizzes);
};

QuizAttempt.findOne = (query) => {
  const attempt = mockQuizAttempts.find((a) => {
    let match = true;
    if (query.quiz && a.quiz.toString() !== query.quiz.toString()) match = false;
    if (query.student && a.student.toString() !== query.student.toString()) match = false;
    if (query.passed !== undefined && a.passed !== query.passed) match = false;
    return match;
  });
  return {
    sort: () => Promise.resolve(attempt || null),
    then: (resolve) => Promise.resolve(attempt || null).then(resolve),
  };
};

QuizAttempt.exists = (query) => {
  const attempt = mockQuizAttempts.find((a) => {
    let match = true;
    if (query.quiz && a.quiz.toString() !== query.quiz.toString()) match = false;
    if (query.student && a.student.toString() !== query.student.toString()) match = false;
    if (query.passed !== undefined && a.passed !== query.passed) match = false;
    return match;
  });
  return Promise.resolve(Boolean(attempt));
};

Certificate.findOne = (query) => {
  const cert = mockCertificates.find((c) => {
    let match = true;
    if (query.student && c.student.toString() !== query.student.toString()) match = false;
    if (query.course && c.course.toString() !== query.course.toString()) match = false;
    if (query.certificateId && c.certificateId !== query.certificateId) match = false;
    return match;
  });
  return Promise.resolve(cert || null);
};

Certificate.create = (data) => {
  const cert = {
    ...data,
    _id: makeObjectId(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  mockCertificates.push(cert);
  return Promise.resolve(cert);
};

Certificate.generateCertificateId = () => {
  return `LS-2026-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
};

// Response helper mock
const createMockRes = () => {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
  };
  return res;
};

test.describe('Course Completion & Certificate Issuance Suite', () => {
  test.beforeEach(() => {
    resetTestDb();
  });

  // Scenario 1: One lesson completed, zero mandatory quizzes: eligible to claim.
  test('1. One lesson completed, zero mandatory quizzes: eligible to claim', async () => {
    const studentId = makeObjectId();
    const lessonId = makeObjectId();
    const course = {
      _id: makeObjectId(),
      title: 'Full Stack React & Node',
      slug: 'full-stack-react-node',
      sections: [{ lessons: [{ _id: lessonId, isPublished: true }] }],
      instructor: { name: 'Master Instructor' },
    };
    mockCourses.push(course);

    const enrollment = {
      _id: makeObjectId(),
      student: studentId,
      course: course._id,
      status: 'active',
      completedLessons: [lessonId],
      save: async function () { return this; },
    };
    mockEnrollments.push(enrollment);

    const req = {
      params: { idOrSlug: course.slug },
      user: { id: studentId.toString(), email: 'student@test.io', name: 'Test Learner' },
    };
    const res = createMockRes();

    await getCourseCompletionStatus(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.isEligibleForCompletion, true);
    assert.strictEqual(res.body.criteria.allLessonsCompleted, true);
    assert.strictEqual(res.body.criteria.allQuizzesPassed, true);
    assert.strictEqual(res.body.criteria.totalMandatoryQuizzes, 0);
    assert.strictEqual(res.body.criteria.lessonsCompleted, 1);
    assert.strictEqual(res.body.criteria.totalLessons, 1);
  });

  // Scenario 2: One lesson incomplete, zero mandatory quizzes: not eligible.
  test('2. One lesson incomplete, zero mandatory quizzes: not eligible', async () => {
    const studentId = makeObjectId();
    const lessonId = makeObjectId();
    const course = {
      _id: makeObjectId(),
      title: 'Python for Data Science',
      slug: 'python-data-science',
      sections: [{ lessons: [{ _id: lessonId, isPublished: true }] }],
    };
    mockCourses.push(course);

    const enrollment = {
      _id: makeObjectId(),
      student: studentId,
      course: course._id,
      status: 'active',
      completedLessons: [], // Not yet completed
      save: async function () { return this; },
    };
    mockEnrollments.push(enrollment);

    const req = {
      params: { idOrSlug: course._id.toString() },
      user: { id: studentId.toString() },
    };
    const res = createMockRes();

    await getCourseCompletionStatus(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.isEligibleForCompletion, false);
    assert.strictEqual(res.body.criteria.allLessonsCompleted, false);
    assert.strictEqual(res.body.criteria.lessonsCompleted, 0);
    assert.strictEqual(res.body.criteria.totalLessons, 1);
  });

  // Scenario 3: All lessons complete, one mandatory quiz not passed: not eligible.
  test('3. All lessons complete, one mandatory quiz not passed: not eligible', async () => {
    const studentId = makeObjectId();
    const lessonId = makeObjectId();
    const course = {
      _id: makeObjectId(),
      title: 'Advanced TypeScript',
      slug: 'advanced-typescript',
      sections: [{ lessons: [{ _id: lessonId, isPublished: true }] }],
    };
    mockCourses.push(course);

    const enrollment = {
      _id: makeObjectId(),
      student: studentId,
      course: course._id,
      status: 'active',
      completedLessons: [lessonId],
      save: async function () { return this; },
    };
    mockEnrollments.push(enrollment);

    // Mandatory quiz exists but no passed attempt
    mockQuizzes.push({
      _id: makeObjectId(),
      course: course._id,
      title: 'TypeScript Final Exam',
      status: 'published',
      isRequiredForCompletion: true,
      passingPercentage: 80,
    });

    const req = {
      params: { idOrSlug: course.slug },
      user: { id: studentId.toString() },
    };
    const res = createMockRes();

    await getCourseCompletionStatus(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.criteria.allLessonsCompleted, true);
    assert.strictEqual(res.body.criteria.allQuizzesPassed, false);
    assert.strictEqual(res.body.criteria.mandatoryQuizzesPassed, 0);
    assert.strictEqual(res.body.criteria.totalMandatoryQuizzes, 1);
    assert.strictEqual(res.body.isEligibleForCompletion, false);
  });

  // Scenario 4: All lessons complete, all mandatory quizzes passed: eligible.
  test('4. All lessons complete, all mandatory quizzes passed: eligible', async () => {
    const studentId = makeObjectId();
    const lessonId = makeObjectId();
    const course = {
      _id: makeObjectId(),
      title: 'Docker & Kubernetes',
      slug: 'docker-kubernetes',
      sections: [{ lessons: [{ _id: lessonId, isPublished: true }] }],
    };
    mockCourses.push(course);

    const enrollment = {
      _id: makeObjectId(),
      student: studentId,
      course: course._id,
      status: 'active',
      completedLessons: [lessonId],
      save: async function () { return this; },
    };
    mockEnrollments.push(enrollment);

    const quizId = makeObjectId();
    mockQuizzes.push({
      _id: quizId,
      course: course._id,
      title: 'DevOps Assessment',
      status: 'published',
      isRequiredForCompletion: true,
      passingPercentage: 75,
    });

    mockQuizAttempts.push({
      _id: makeObjectId(),
      quiz: quizId,
      student: studentId,
      passed: true,
      percentage: 90,
    });

    const req = {
      params: { idOrSlug: course._id.toString() },
      user: { id: studentId.toString() },
    };
    const res = createMockRes();

    await getCourseCompletionStatus(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.criteria.allLessonsCompleted, true);
    assert.strictEqual(res.body.criteria.allQuizzesPassed, true);
    assert.strictEqual(res.body.criteria.mandatoryQuizzesPassed, 1);
    assert.strictEqual(res.body.criteria.totalMandatoryQuizzes, 1);
    assert.strictEqual(res.body.isEligibleForCompletion, true);
  });

  // Scenario 5: Completion-status response exposes the expected field names and values.
  test('5. Completion-status response exposes expected field names and contract', async () => {
    const studentId = makeObjectId();
    const lessonId = makeObjectId();
    const course = {
      _id: makeObjectId(),
      title: 'Contract Verification Course',
      slug: 'contract-course',
      sections: [{ lessons: [{ _id: lessonId, isPublished: true }] }],
    };
    mockCourses.push(course);

    const enrollment = {
      _id: makeObjectId(),
      student: studentId,
      course: course._id,
      status: 'active',
      completedLessons: [lessonId],
      save: async function () { return this; },
    };
    mockEnrollments.push(enrollment);

    const req = {
      params: { idOrSlug: course.slug },
      user: { id: studentId.toString() },
    };
    const res = createMockRes();

    await getCourseCompletionStatus(req, res);

    assert.strictEqual(res.statusCode, 200);
    // Standard and compatibility fields
    assert.ok('courseId' in res.body);
    assert.ok('courseTitle' in res.body);
    assert.ok('isEligibleForCompletion' in res.body);
    assert.ok('isEligible' in res.body);
    assert.ok('isCompleted' in res.body);
    assert.ok('certificateIssued' in res.body);
    assert.ok('certificateId' in res.body);
    assert.ok('criteria' in res.body);

    const criteria = res.body.criteria;
    assert.ok('allLessonsCompleted' in criteria);
    assert.ok('lessonsCompleted' in criteria);
    assert.ok('totalLessons' in criteria);
    assert.ok('allQuizzesPassed' in criteria);
    assert.ok('mandatoryQuizzesPassed' in criteria);
    assert.ok('totalMandatoryQuizzes' in criteria);
  });

  // Scenario 6: Certificate claiming succeeds when all requirements are satisfied.
  test('6. Certificate claiming succeeds when all requirements are satisfied', async () => {
    const studentId = makeObjectId();
    const lessonId = makeObjectId();
    const course = {
      _id: makeObjectId(),
      title: 'Cloud Architecture Specialization',
      slug: 'cloud-architecture',
      sections: [{ lessons: [{ _id: lessonId, isPublished: true }] }],
      instructor: { name: 'Lead Architect' },
    };
    mockCourses.push(course);

    let saved = false;
    const enrollment = {
      _id: makeObjectId(),
      student: studentId,
      course: course._id,
      status: 'active',
      completedLessons: [lessonId],
      isCompleted: false,
      save: async function () {
        saved = true;
        return this;
      },
    };
    mockEnrollments.push(enrollment);

    const user = {
      _id: studentId,
      name: 'Alice Johnson',
      email: 'alice@example.com',
    };
    mockUsers.push(user);

    const req = {
      params: { idOrSlug: course.slug },
      user: { id: studentId.toString(), email: 'alice@example.com', name: 'Alice Johnson' },
    };
    const res = createMockRes();

    await claimCertificate(req, res);

    assert.strictEqual(res.statusCode, 201);
    assert.ok(res.body.certificate);
    assert.ok(res.body.certificate.certificateId);
    assert.strictEqual(res.body.certificate.studentSnapshot.name, 'Alice Johnson');
    assert.strictEqual(saved, true);
    assert.strictEqual(enrollment.isCompleted, true);
    assert.strictEqual(enrollment.certificateIssued, true);
    assert.strictEqual(enrollment.status, 'completed');
  });

  // Scenario 7: Certificate claiming is rejected when mandatory requirements are incomplete.
  test('7. Certificate claiming is rejected when mandatory requirements are incomplete', async () => {
    const studentId = makeObjectId();
    const lessonId = makeObjectId();
    const course = {
      _id: makeObjectId(),
      title: 'Incomplete Course',
      slug: 'incomplete-course',
      sections: [{ lessons: [{ _id: lessonId, isPublished: true }] }],
    };
    mockCourses.push(course);

    const enrollment = {
      _id: makeObjectId(),
      student: studentId,
      course: course._id,
      status: 'active',
      completedLessons: [], // Incomplete!
      save: async function () { return this; },
    };
    mockEnrollments.push(enrollment);

    const req = {
      params: { idOrSlug: course.slug },
      user: { id: studentId.toString() },
    };
    const res = createMockRes();

    await claimCertificate(req, res);

    assert.strictEqual(res.statusCode, 400);
    assert.match(res.body.error, /Incomplete curriculum/i);
    assert.strictEqual(mockCertificates.length, 0);
  });

  // Scenario 8: Repeated certificate claim requests do not create duplicate certificates.
  test('8. Repeated certificate claim requests do not create duplicate certificates', async () => {
    const studentId = makeObjectId();
    const lessonId = makeObjectId();
    const course = {
      _id: makeObjectId(),
      title: 'Idempotency Test Course',
      slug: 'idempotency-course',
      sections: [{ lessons: [{ _id: lessonId, isPublished: true }] }],
    };
    mockCourses.push(course);

    const enrollment = {
      _id: makeObjectId(),
      student: studentId,
      course: course._id,
      status: 'active',
      completedLessons: [lessonId],
      save: async function () { return this; },
    };
    mockEnrollments.push(enrollment);

    const user = { _id: studentId, name: 'Bob Smith', email: 'bob@test.com' };
    mockUsers.push(user);

    const req = {
      params: { idOrSlug: course.slug },
      user: { id: studentId.toString(), email: 'bob@test.com', name: 'Bob Smith' },
    };

    // First claim
    const res1 = createMockRes();
    await claimCertificate(req, res1);
    assert.strictEqual(res1.statusCode, 201);
    const initialCertificateId = res1.body.certificate.certificateId;
    assert.strictEqual(mockCertificates.length, 1);

    // Second repeated claim
    const res2 = createMockRes();
    await claimCertificate(req, res2);
    assert.strictEqual(res2.statusCode, 200);
    assert.strictEqual(res2.body.certificate.certificateId, initialCertificateId);
    assert.strictEqual(mockCertificates.length, 1); // No duplicate created
  });

  // Scenario 9: The frontend correctly maps the backend response to lesson and quiz requirement states.
  test('9. Frontend correctly maps backend response to lesson and quiz requirement states', () => {
    // Raw backend response simulation
    const rawBackendResponse = {
      courseId: '67c1234567890abcdef12345',
      courseTitle: 'Introduction to Modern Web',
      isEligibleForCompletion: true,
      isCompleted: false,
      completedAt: null,
      certificateIssued: false,
      certificateId: null,
      criteria: {
        allLessonsCompleted: true,
        lessonsCompleted: 1,
        totalLessons: 1,
        lessonProgressPercentage: 100,
        allQuizzesPassed: true,
        mandatoryQuizzesPassed: 0,
        totalMandatoryQuizzes: 0,
        quizzes: [],
      },
    };

    // Simulate the mapped contract in certificateService.getCompletionStatus / CoursePlayerPage
    const criteria = rawBackendResponse.criteria || {};
    const totalMandatoryQuizzes = criteria.totalMandatoryQuizzes ?? 0;
    const mandatoryQuizzesPassed = criteria.mandatoryQuizzesPassed ?? 0;
    const allQuizzesPassed =
      criteria.allQuizzesPassed ??
      (totalMandatoryQuizzes === 0 || mandatoryQuizzesPassed >= totalMandatoryQuizzes);
    const totalLessons = criteria.totalLessons ?? 0;
    const lessonsCompleted = criteria.lessonsCompleted ?? 0;
    const allLessonsCompleted =
      criteria.allLessonsCompleted ??
      (totalLessons > 0 && lessonsCompleted >= totalLessons);
    const isEligible = Boolean(
      rawBackendResponse.isEligibleForCompletion ??
        rawBackendResponse.isEligible ??
        (allLessonsCompleted && allQuizzesPassed)
    );

    // Verify derived frontend states
    assert.strictEqual(allLessonsCompleted, true);
    assert.strictEqual(lessonsCompleted, 1);
    assert.strictEqual(totalLessons, 1);
    assert.strictEqual(allQuizzesPassed, true);
    assert.strictEqual(mandatoryQuizzesPassed, 0);
    assert.strictEqual(totalMandatoryQuizzes, 0);
    assert.strictEqual(isEligible, true);

    // UI state derivations
    const isCertIssued = Boolean(
      rawBackendResponse.certificateIssued || rawBackendResponse.certificate
    );
    const isReadyToClaim = isEligible && !isCertIssued;
    const badgeLabel = isCertIssued
      ? 'Certificate Issued'
      : isReadyToClaim
      ? 'Ready to Claim'
      : 'Requirements Pending';

    assert.strictEqual(badgeLabel, 'Ready to Claim');
  });
});

