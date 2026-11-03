const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { app } = require('../server');
const User = require('../models/User');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const Quiz = require('../models/Quiz');
const QuizAttempt = require('../models/QuizAttempt');
const Certificate = require('../models/Certificate');

const TEST_SECRET = 'test_jwt_secret_key_12345678901234567890';
process.env.JWT_SECRET = TEST_SECRET;
process.env.NODE_ENV = 'test';

// In-memory mock stores
let mockUsers = [];
let mockCourses = [];
let mockEnrollments = [];
let mockQuizzes = [];
let mockQuizAttempts = [];
let mockCertificates = [];
let idCounter = 100;

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
  idCounter = 100;
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
    toObject() {
      return { ...this };
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
    summary: data.summary || 'Summary',
    description: data.description || 'Description',
    instructor: data.instructor,
    category: data.category || 'Development',
    level: data.level || 'Beginner',
    status: data.status || 'published',
    sections: data.sections || [],
    publishedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    async save() {
      const idx = mockCourses.findIndex((c) => c._id.toString() === this._id.toString());
      if (idx !== -1) mockCourses[idx] = this;
      else mockCourses.push(this);
      return this;
    },
    toObject() {
      return { ...this };
    },
  };
  mockCourses.push(course);
  return course;
};

const createMockQuiz = (data) => {
  const quiz = {
    _id: data._id || makeObjectId(),
    course: data.course,
    instructor: data.instructor,
    title: data.title,
    description: data.description || '',
    instructions: data.instructions || 'Answer all questions.',
    durationMinutes: data.durationMinutes || 0,
    passingPercentage: data.passingPercentage || 70,
    maxAttempts: data.maxAttempts !== undefined ? data.maxAttempts : 3,
    isRequiredForCompletion: data.isRequiredForCompletion !== false,
    status: data.status || 'published',
    questions: (data.questions || []).map((q) => ({
      _id: q._id || makeObjectId(),
      questionText: q.questionText,
      options: q.options || [],
      correctOptionId: q.correctOptionId,
      points: q.points || 1,
      explanation: q.explanation || '',
      order: q.order || 0,
    })),
    get totalPoints() {
      return this.questions.reduce((sum, q) => sum + (q.points || 1), 0);
    },
    async save() {
      const idx = mockQuizzes.findIndex((q) => q._id.toString() === this._id.toString());
      if (idx !== -1) mockQuizzes[idx] = this;
      else mockQuizzes.push(this);
      return this;
    },
    toObject() {
      return {
        ...this,
        totalPoints: this.totalPoints,
      };
    },
  };
  mockQuizzes.push(quiz);
  return quiz;
};

const makeCookie = (user) => {
  const token = jwt.sign(
    { id: user._id.toString(), email: user.email, role: user.role },
    TEST_SECRET,
    { expiresIn: '1d' }
  );
  return `jwt=${token}; Path=/; HttpOnly`;
};

// Setup Mongoose Model Stubs
User.findById = (id) => ({
  select: () => {
    const user = mockUsers.find((u) => u._id.toString() === id.toString());
    return Promise.resolve(user || null);
  },
  then: (resolve) => {
    const user = mockUsers.find((u) => u._id.toString() === id.toString());
    return Promise.resolve(user || null).then(resolve);
  },
});

Course.findById = (id) => {
  const course = mockCourses.find((c) => c._id.toString() === id.toString());
  return Promise.resolve(course || null);
};

Course.findOne = (query) => {
  const queryFn = (c) => {
    if (query._id && c._id.toString() === query._id.toString()) return true;
    if (query.slug && c.slug === query.slug) return true;
    return false;
  };

  const course = mockCourses.find(queryFn);
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

Quiz.findById = (id) => {
  const quiz = mockQuizzes.find((q) => q._id.toString() === id.toString());
  return Promise.resolve(quiz || null);
};

Quiz.findOne = (query) => {
  const quiz = mockQuizzes.find((q) => {
    let match = true;
    if (query._id && q._id.toString() !== query._id.toString()) match = false;
    if (query.course && q.course.toString() !== query.course.toString()) match = false;
    if (query.status && q.status !== query.status) match = false;
    return match;
  });
  return Promise.resolve(quiz || null);
};

Quiz.find = (query) => {
  const quizzes = mockQuizzes.filter((q) => {
    let match = true;
    if (query.course && q.course.toString() !== query.course.toString()) match = false;
    if (query.status && q.status !== query.status) match = false;
    if (query.isRequiredForCompletion !== undefined && q.isRequiredForCompletion !== query.isRequiredForCompletion) match = false;
    return match;
  });

  return {
    sort: () => Promise.resolve(quizzes),
    then: (resolve) => Promise.resolve(quizzes).then(resolve),
  };
};

Quiz.create = (data) => {
  const quiz = createMockQuiz(data);
  return Promise.resolve(quiz);
};

QuizAttempt.find = (query) => {
  let attempts = mockQuizAttempts.filter((a) => {
    let match = true;
    if (query.quiz && a.quiz.toString() !== query.quiz.toString()) match = false;
    if (query.student && a.student.toString() !== query.student.toString()) match = false;
    if (query.status && a.status !== query.status) match = false;
    return match;
  });

  const queryObj = {
    sort: () => queryObj,
    populate: (field) => {
      if (field === 'student') {
        attempts = attempts.map((a) => {
          const user = mockUsers.find((u) => u._id.toString() === a.student.toString());
          return {
            ...a,
            student: user ? { _id: user._id, name: user.name, email: user.email, avatar: user.avatar } : a.student,
          };
        });
      }
      return queryObj;
    },
    then: (resolve, reject) => Promise.resolve(attempts).then(resolve, reject),
  };

  return queryObj;
};

QuizAttempt.findOne = (query) => {
  const attempt = mockQuizAttempts.find((a) => {
    let match = true;
    if (query._id && a._id.toString() !== query._id.toString()) match = false;
    if (query.quiz && a.quiz.toString() !== query.quiz.toString()) match = false;
    if (query.student && a.student.toString() !== query.student.toString()) match = false;
    if (query.status && a.status !== query.status) match = false;
    if (query.passed !== undefined && a.passed !== query.passed) match = false;
    return match;
  });

  return {
    sort: () => Promise.resolve(attempt || null),
    populate: () => Promise.resolve(attempt || null),
    then: (resolve) => Promise.resolve(attempt || null).then(resolve),
  };
};

QuizAttempt.exists = (query) => {
  const exists = mockQuizAttempts.some((a) => {
    let match = true;
    if (query.quiz && a.quiz.toString() !== query.quiz.toString()) match = false;
    if (query.student && a.student.toString() !== query.student.toString()) match = false;
    if (query.passed !== undefined && a.passed !== query.passed) match = false;
    return match;
  });
  return Promise.resolve(exists);
};

QuizAttempt.countDocuments = (query) => {
  const count = mockQuizAttempts.filter((a) => {
    let match = true;
    if (query.quiz && a.quiz.toString() !== query.quiz.toString()) match = false;
    if (query.student && a.student.toString() !== query.student.toString()) match = false;
    if (query.passed !== undefined && a.passed !== query.passed) match = false;
    return match;
  }).length;
  return Promise.resolve(count);
};

QuizAttempt.create = (data) => {
  const attempt = {
    _id: makeObjectId(),
    ...data,
    async save() {
      const idx = mockQuizAttempts.findIndex((a) => a._id.toString() === this._id.toString());
      if (idx !== -1) mockQuizAttempts[idx] = this;
      else mockQuizAttempts.push(this);
      return this;
    },
  };
  mockQuizAttempts.push(attempt);
  return Promise.resolve(attempt);
};

Certificate.findOne = (query) => {
  const cert = mockCertificates.find((c) => {
    let match = true;
    if (query.student && c.student.toString() !== query.student.toString()) match = false;
    if (query.course && c.course.toString() !== query.course.toString()) match = false;
    if (query.certificateId && c.certificateId.toUpperCase() !== query.certificateId.toUpperCase()) match = false;
    return match;
  });
  return Promise.resolve(cert || null);
};

Certificate.find = (query) => {
  const certs = mockCertificates.filter((c) => {
    let match = true;
    if (query.student && c.student.toString() !== query.student.toString()) match = false;
    if (query.status && c.status !== query.status) match = false;
    return match;
  });
  return {
    sort: () => Promise.resolve(certs),
    then: (resolve) => Promise.resolve(certs).then(resolve),
  };
};

Certificate.create = (data) => {
  const cert = {
    _id: makeObjectId(),
    ...data,
  };
  mockCertificates.push(cert);
  return Promise.resolve(cert);
};

// ==========================================
// TEST SUITE: PHASE 5 ASSESSMENTS & COMPLETION
// ==========================================

test('Phase 5 Assessments & Course Completion Suite', async (t) => {
  t.beforeEach(() => {
    resetTestDb();
  });

  await t.test('1. Authorized instructor can create a quiz as draft', async () => {
    const instructor = createMockUser({ name: 'Alice Instructor', email: 'alice@learnspace.org', role: 'instructor' });
    const course = createMockCourse({ title: 'React Mastery', instructor: instructor._id });
    const cookie = makeCookie(instructor);

    const res = await request(app)
      .post(`/api/instructor/courses/${course._id}/quizzes`)
      .set('Cookie', cookie)
      .send({
        title: 'React Fundamentals Quiz',
        description: 'Test your JSX and Hook knowledge.',
        passingPercentage: 75,
        durationMinutes: 15,
        maxAttempts: 2,
        questions: [
          {
            questionText: 'What is JSX?',
            options: [
              { id: 'opt_1', text: 'JavaScript XML syntax extension' },
              { id: 'opt_2', text: 'A database query language' },
            ],
            correctOptionId: 'opt_1',
            points: 5,
            explanation: 'JSX allows writing HTML-like tags inside JavaScript.',
          },
        ],
      });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.quiz.title, 'React Fundamentals Quiz');
    assert.strictEqual(res.body.quiz.status, 'draft');
    assert.strictEqual(res.body.quiz.questions.length, 1);
  });

  await t.test('2. Student is rejected from creating or publishing quizzes (403 Forbidden)', async () => {
    const student = createMockUser({ name: 'Bob Student', email: 'bob@example.com', role: 'student' });
    const instructor = createMockUser({ name: 'Alice Instructor', email: 'alice@learnspace.org', role: 'instructor' });
    const course = createMockCourse({ title: 'Fullstack Systems', instructor: instructor._id });
    const cookie = makeCookie(student);

    const res = await request(app)
      .post(`/api/instructor/courses/${course._id}/quizzes`)
      .set('Cookie', cookie)
      .send({ title: 'Student Quiz Attempt' });

    assert.strictEqual(res.status, 403);
  });

  await t.test('3. Instructor cannot update another instructor’s quiz (403 Forbidden)', async () => {
    const instructorA = createMockUser({ name: 'Instructor A', email: 'inst_a@learnspace.org', role: 'instructor' });
    const instructorB = createMockUser({ name: 'Instructor B', email: 'inst_b@learnspace.org', role: 'instructor' });
    const course = createMockCourse({ title: 'Architecture Track', instructor: instructorA._id });
    const quiz = createMockQuiz({ title: 'Distributed Systems', course: course._id, instructor: instructorA._id });

    const cookieB = makeCookie(instructorB);

    const res = await request(app)
      .patch(`/api/instructor/quizzes/${quiz._id}`)
      .set('Cookie', cookieB)
      .send({ title: 'Hacked Quiz Title' });

    assert.strictEqual(res.status, 403);
  });

  await t.test('4. Quiz delivery endpoint strips correctOptionId and explanation before submission', async () => {
    const instructor = createMockUser({ name: 'Elena', email: 'elena@learnspace.org', role: 'instructor' });
    const student = createMockUser({ name: 'Charlie', email: 'charlie@example.com', role: 'student' });
    const course = createMockCourse({ title: 'UI Design Tokens', instructor: instructor._id });

    const quiz = createMockQuiz({
      title: 'Design Tokens Exam',
      course: course._id,
      instructor: instructor._id,
      status: 'published',
      questions: [
        {
          questionText: 'What is a design token?',
          options: [
            { id: 'opt_a', text: 'Semantic key-value pair for design values' },
            { id: 'opt_b', text: 'A cryptocurrency coin' },
          ],
          correctOptionId: 'opt_a',
          points: 10,
          explanation: 'Tokens store colors, typography, and spacing variables.',
        },
      ],
    });

    // Enrolled student
    mockEnrollments.push({
      _id: makeObjectId(),
      student: student._id,
      course: course._id,
      status: 'active',
      completedLessons: [],
    });

    const cookie = makeCookie(student);

    const res = await request(app)
      .get(`/api/courses/${course._id}/quizzes/${quiz._id}`)
      .set('Cookie', cookie);

    assert.strictEqual(res.status, 200);
    const deliveredQuestion = res.body.quiz.questions[0];
    assert.strictEqual(deliveredQuestion.questionText, 'What is a design token?');
    assert.strictEqual(deliveredQuestion.correctOptionId, undefined, 'Must not expose correctOptionId');
    assert.strictEqual(deliveredQuestion.explanation, undefined, 'Must not expose explanation');
  });

  await t.test('5. Unenrolled student cannot access or start a course quiz (403 Forbidden)', async () => {
    const instructor = createMockUser({ name: 'Elena', email: 'elena@learnspace.org', role: 'instructor' });
    const student = createMockUser({ name: 'David', email: 'david@example.com', role: 'student' });
    const course = createMockCourse({ title: 'Secured Course', instructor: instructor._id });
    const quiz = createMockQuiz({ title: 'Secured Quiz', course: course._id, instructor: instructor._id, status: 'published' });

    const cookie = makeCookie(student); // Not enrolled

    const res = await request(app)
      .post(`/api/courses/${course._id}/quizzes/${quiz._id}/start`)
      .set('Cookie', cookie);

    assert.strictEqual(res.status, 403);
  });

  await t.test('6. Enrolled student starts quiz and submits answers with server-side grading', async () => {
    const instructor = createMockUser({ name: 'Elena', email: 'elena@learnspace.org', role: 'instructor' });
    const student = createMockUser({ name: 'Emma', email: 'emma@example.com', role: 'student' });
    const course = createMockCourse({ title: 'Node Security', instructor: instructor._id });

    const quiz = createMockQuiz({
      title: 'OWASP Security Quiz',
      course: course._id,
      instructor: instructor._id,
      passingPercentage: 60,
      durationMinutes: 30,
      maxAttempts: 3,
      status: 'published',
      questions: [
        {
          _id: makeObjectId(),
          questionText: 'What HTTP flag protects session cookies from XSS?',
          options: [
            { id: 'opt_1', text: 'HttpOnly' },
            { id: 'opt_2', text: 'Secure' },
          ],
          correctOptionId: 'opt_1',
          points: 10,
          explanation: 'HttpOnly prevents client-side document.cookie access.',
        },
        {
          _id: makeObjectId(),
          questionText: 'Which algorithm is best for password hashing?',
          options: [
            { id: 'opt_a', text: 'MD5' },
            { id: 'opt_b', text: 'bcrypt / argon2' },
          ],
          correctOptionId: 'opt_b',
          points: 10,
          explanation: 'bcrypt with salted cost factors protects against brute force.',
        },
      ],
    });

    mockEnrollments.push({
      _id: makeObjectId(),
      student: student._id,
      course: course._id,
      status: 'active',
      completedLessons: [],
    });

    const cookie = makeCookie(student);

    // 1. Start attempt
    const startRes = await request(app)
      .post(`/api/courses/${course._id}/quizzes/${quiz._id}/start`)
      .set('Cookie', cookie);

    assert.strictEqual(startRes.status, 201);
    const attemptId = startRes.body.attempt.id;
    assert.strictEqual(startRes.body.attempt.attemptNumber, 1);
    assert(startRes.body.attempt.deadline !== null);

    // 2. Submit answers (1 correct, 1 wrong)
    const q1 = quiz.questions[0];
    const q2 = quiz.questions[1];

    const submitRes = await request(app)
      .post(`/api/courses/${course._id}/quizzes/${quiz._id}/attempts/${attemptId}/submit`)
      .set('Cookie', cookie)
      .send({
        answers: [
          { questionId: q1._id.toString(), selectedOptionId: 'opt_1' }, // Correct (10 pts)
          { questionId: q2._id.toString(), selectedOptionId: 'opt_a' }, // Incorrect (0 pts)
        ],
      });

    assert.strictEqual(submitRes.status, 200);
    assert.strictEqual(submitRes.body.result.score, 10);
    assert.strictEqual(submitRes.body.result.maxScore, 20);
    assert.strictEqual(submitRes.body.result.percentage, 50);
    assert.strictEqual(submitRes.body.result.passed, false, 'Score 50% < passing 60%');
    assert.strictEqual(submitRes.body.result.review.length, 2);
  });

  await t.test('7. Enforces maximum quiz attempt limit on server', async () => {
    const instructor = createMockUser({ name: 'Elena', email: 'elena@learnspace.org', role: 'instructor' });
    const student = createMockUser({ name: 'Frank', email: 'frank@example.com', role: 'student' });
    const course = createMockCourse({ title: 'Strict Course', instructor: instructor._id });

    const quiz = createMockQuiz({
      title: 'One-shot Quiz',
      course: course._id,
      instructor: instructor._id,
      maxAttempts: 1, // Only 1 attempt allowed
      status: 'published',
    });

    mockEnrollments.push({
      _id: makeObjectId(),
      student: student._id,
      course: course._id,
      status: 'active',
      completedLessons: [],
    });

    // Create 1 completed attempt in DB
    mockQuizAttempts.push({
      _id: makeObjectId(),
      quiz: quiz._id,
      student: student._id,
      course: course._id,
      attemptNumber: 1,
      status: 'completed',
      score: 5,
      maxScore: 10,
      percentage: 50,
      passed: false,
    });

    const cookie = makeCookie(student);

    const res = await request(app)
      .post(`/api/courses/${course._id}/quizzes/${quiz._id}/start`)
      .set('Cookie', cookie);

    assert.strictEqual(res.status, 400);
    assert(res.body.error.includes('Maximum attempts reached'));
  });

  await t.test('8. Course completion verification requires all lessons and mandatory quizzes', async () => {
    const instructor = createMockUser({ name: 'Elena', email: 'elena@learnspace.org', role: 'instructor' });
    const student = createMockUser({ name: 'Grace', email: 'grace@example.com', role: 'student' });

    const les1Id = makeObjectId();
    const les2Id = makeObjectId();

    const course = createMockCourse({
      title: 'Full Certification Track',
      instructor: instructor._id,
      sections: [
        {
          _id: makeObjectId(),
          title: 'Section 1',
          lessons: [
            { _id: les1Id, title: 'Lesson 1' },
            { _id: les2Id, title: 'Lesson 2' },
          ],
        },
      ],
    });

    const quiz = createMockQuiz({
      title: 'Final Mastery Assessment',
      course: course._id,
      instructor: instructor._id,
      isRequiredForCompletion: true,
      status: 'published',
    });

    // Student has completed only lesson 1 and has NOT passed the quiz
    const enrollment = {
      _id: makeObjectId(),
      student: student._id,
      course: course._id,
      status: 'active',
      completedLessons: [les1Id],
      isCompleted: false,
      async save() { return this; },
    };
    mockEnrollments.push(enrollment);

    const cookie = makeCookie(student);

    // 1. Completion status before fulfilling requirements
    const statusRes = await request(app)
      .get(`/api/courses/${course._id}/completion-status`)
      .set('Cookie', cookie);

    assert.strictEqual(statusRes.status, 200);
    assert.strictEqual(statusRes.body.isEligibleForCompletion, false);
    assert.strictEqual(statusRes.body.criteria.allLessonsCompleted, false);
    assert.strictEqual(statusRes.body.criteria.allQuizzesPassed, false);

    // 2. Claiming certificate before eligibility must fail (400)
    const claimFailRes = await request(app)
      .post(`/api/courses/${course._id}/claim-certificate`)
      .set('Cookie', cookie);

    assert.strictEqual(claimFailRes.status, 400);
    assert(claimFailRes.body.error.includes('Incomplete curriculum'));

    // 3. Complete lesson 2 and record passed quiz attempt
    enrollment.completedLessons.push(les2Id);
    mockQuizAttempts.push({
      _id: makeObjectId(),
      quiz: quiz._id,
      student: student._id,
      course: course._id,
      status: 'completed',
      passed: true,
      percentage: 90,
      score: 9,
      maxScore: 10,
    });

    // 4. Now claim certificate
    const claimSuccessRes = await request(app)
      .post(`/api/courses/${course._id}/claim-certificate`)
      .set('Cookie', cookie);

    assert.strictEqual(claimSuccessRes.status, 201);
    assert(claimSuccessRes.body.certificate.certificateId.startsWith('LS-'));
    assert.strictEqual(enrollment.isCompleted, true);
    assert.strictEqual(enrollment.certificateIssued, true);

    // 5. Duplicate claim is idempotent
    const duplicateRes = await request(app)
      .post(`/api/courses/${course._id}/claim-certificate`)
      .set('Cookie', cookie);

    assert.strictEqual(duplicateRes.status, 200);
    assert.strictEqual(duplicateRes.body.certificate.certificateId, claimSuccessRes.body.certificate.certificateId);
  });

  await t.test('9. Public certificate verification returns sanitized data and hides private credentials', async () => {
    const certId = 'LS-2026-ABCD-9999';
    mockCertificates.push({
      _id: makeObjectId(),
      certificateId: certId,
      student: makeObjectId(),
      course: makeObjectId(),
      issuedAt: new Date('2026-10-27T12:00:00Z'),
      completedAt: new Date('2026-10-27T12:00:00Z'),
      studentSnapshot: {
        name: 'Hannah Verified Learner',
        email: 'hannah.private@secret.org',
      },
      courseSnapshot: {
        title: 'Modern Web Architecture',
        category: 'Development',
        level: 'Advanced',
        estimatedDuration: '8 weeks',
        instructorName: 'Elena Rostova',
      },
      finalGrade: 95,
      status: 'valid',
    });

    const res = await request(app).get(`/api/certificates/${certId}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.valid, true);
    assert.strictEqual(res.body.certificate.studentName, 'Hannah Verified Learner');
    assert.strictEqual(res.body.certificate.courseTitle, 'Modern Web Architecture');
    assert.strictEqual(res.body.certificate.studentEmail, undefined, 'Must not leak student email');
    assert.strictEqual(res.body.certificate._id, undefined, 'Must not leak internal Mongo ID');
  });

  await t.test('10. Active attempt resumption returns existing attempt and instructor can toggle publish/unpublish', async () => {
    const instructor = createMockUser({ name: 'Elena', email: 'elena@learnspace.org', role: 'instructor' });
    const student = createMockUser({ name: 'Ian', email: 'ian@example.com', role: 'student' });
    const course = createMockCourse({ title: 'Resilience Course', instructor: instructor._id });

    const quiz = createMockQuiz({
      title: 'Resilience Evaluation',
      course: course._id,
      instructor: instructor._id,
      durationMinutes: 20,
      maxAttempts: 3,
      status: 'published',
      questions: [
        {
          _id: makeObjectId(),
          questionText: 'What is circuit breaking?',
          options: [
            { id: 'opt_1', text: 'Failing fast when downstream is degraded' },
            { id: 'opt_2', text: 'A short circuit in the motherboard' },
          ],
          correctOptionId: 'opt_1',
          points: 5,
          explanation: 'Circuit breakers prevent cascade failures across microservices.',
        },
      ],
    });

    mockEnrollments.push({
      _id: makeObjectId(),
      student: student._id,
      course: course._id,
      status: 'active',
      completedLessons: [],
    });

    const studentCookie = makeCookie(student);
    const instructorCookie = makeCookie(instructor);

    // 1. Start quiz attempt
    const startRes1 = await request(app)
      .post(`/api/courses/${course._id}/quizzes/${quiz._id}/start`)
      .set('Cookie', studentCookie);

    assert.strictEqual(startRes1.status, 201);
    const attemptId = startRes1.body.attempt.id;
    assert.strictEqual(startRes1.body.attempt.attemptNumber, 1);
    assert(startRes1.body.attempt.deadline !== null);

    // 2. Request start again while attempt is active (e.g. reload or re-entry) -> resumes without duplicate
    const startRes2 = await request(app)
      .post(`/api/courses/${course._id}/quizzes/${quiz._id}/start`)
      .set('Cookie', studentCookie);

    assert.strictEqual(startRes2.status, 200);
    assert.strictEqual(startRes2.body.message, 'Resuming your active quiz attempt.');
    assert.strictEqual(startRes2.body.attempt.id, attemptId);
    assert.strictEqual(startRes2.body.attempt.attemptNumber, 1);

    // 3. Submit and verify detailed review schema
    const submitRes = await request(app)
      .post(`/api/courses/${course._id}/quizzes/${quiz._id}/attempts/${attemptId}/submit`)
      .set('Cookie', studentCookie)
      .send({
        answers: [
          { questionId: quiz.questions[0]._id.toString(), selectedOptionId: 'opt_1' },
        ],
      });

    assert.strictEqual(submitRes.status, 200);
    assert.strictEqual(submitRes.body.result.passed, true);
    assert.strictEqual(submitRes.body.result.score, 5);
    assert.strictEqual(submitRes.body.result.maxScore, 5);
    const reviewItem = submitRes.body.result.review[0];
    assert.strictEqual(reviewItem.pointsEarned, 5);
    assert.strictEqual(reviewItem.pointsPossible, 5);
    assert.strictEqual(reviewItem.isCorrect, true);
    assert.strictEqual(reviewItem.explanation, 'Circuit breakers prevent cascade failures across microservices.');

    // 4. Instructor toggles publication status (unpublish -> draft, publish -> published)
    const unpublishRes = await request(app)
      .patch(`/api/instructor/quizzes/${quiz._id}/unpublish`)
      .set('Cookie', instructorCookie);

    assert.strictEqual(unpublishRes.status, 200);
    assert.strictEqual(unpublishRes.body.quiz.status, 'draft');

    const publishRes = await request(app)
      .patch(`/api/instructor/quizzes/${quiz._id}/publish`)
      .set('Cookie', instructorCookie);

    assert.strictEqual(publishRes.status, 200);
    assert.strictEqual(publishRes.body.quiz.status, 'published');
  });

  await t.test('11. Unanswered question receives zero points while contributing to maximum possible score', async () => {
    const instructor = createMockUser({ name: 'Grading Instructor', email: 'instructor_grading@learnspace.org', role: 'instructor' });
    const student = createMockUser({ name: 'Partial Student', email: 'partial_student@example.com', role: 'student' });
    const course = createMockCourse({ title: 'Grading Evaluation Course', instructor: instructor._id });

    const quiz = createMockQuiz({
      title: 'Partial Submission Evaluation Quiz',
      course: course._id,
      instructor: instructor._id,
      passingPercentage: 70,
      durationMinutes: 30,
      maxAttempts: 2,
      status: 'published',
      questions: [
        {
          _id: makeObjectId(),
          questionText: 'Question 1: Worth 10 points',
          options: [
            { id: 'opt_1', text: 'Correct Answer' },
            { id: 'opt_2', text: 'Wrong Answer' },
          ],
          correctOptionId: 'opt_1',
          points: 10,
          explanation: 'Option 1 is correct.',
        },
        {
          _id: makeObjectId(),
          questionText: 'Question 2: Worth 10 points (unanswered)',
          options: [
            { id: 'opt_a', text: 'Choice A' },
            { id: 'opt_b', text: 'Choice B' },
          ],
          correctOptionId: 'opt_a',
          points: 10,
          explanation: 'Choice A is correct.',
        },
      ],
    });

    mockEnrollments.push({
      _id: makeObjectId(),
      student: student._id,
      course: course._id,
      status: 'active',
      completedLessons: [],
    });

    const cookie = makeCookie(student);

    // 1. Start quiz attempt
    const startRes = await request(app)
      .post(`/api/courses/${course._id}/quizzes/${quiz._id}/start`)
      .set('Cookie', cookie);

    assert.strictEqual(startRes.status, 201);
    const attemptId = startRes.body.attempt.id;

    // 2. Submit only Question 1 answered correctly; omit Question 2
    const q1 = quiz.questions[0];
    const q2 = quiz.questions[1];

    const submitRes = await request(app)
      .post(`/api/courses/${course._id}/quizzes/${quiz._id}/attempts/${attemptId}/submit`)
      .set('Cookie', cookie)
      .send({
        answers: [
          { questionId: q1._id.toString(), selectedOptionId: 'opt_1' },
        ],
      });

    assert.strictEqual(submitRes.status, 200);
    assert.strictEqual(submitRes.body.result.score, 10);
    assert.strictEqual(submitRes.body.result.maxScore, 20);
    assert.strictEqual(submitRes.body.result.percentage, 50);
    assert.strictEqual(submitRes.body.result.passed, false, 'Score 50% < passing 70%');

    // Verify detailed review for answered vs unanswered questions
    const review = submitRes.body.result.review;
    assert.strictEqual(review.length, 2);

    const q1Review = review.find((r) => r.questionId.toString() === q1._id.toString());
    assert.strictEqual(q1Review.isCorrect, true);
    assert.strictEqual(q1Review.pointsEarned, 10);
    assert.strictEqual(q1Review.pointsPossible, 10);

    const q2Review = review.find((r) => r.questionId.toString() === q2._id.toString());
    assert.strictEqual(q2Review.isCorrect, false);
    assert.strictEqual(q2Review.pointsEarned, 0);
    assert.strictEqual(q2Review.pointsPossible, 10);
    assert.strictEqual(q2Review.selectedOptionId, '');
  });

  await t.test('12. Submitting an already completed attempt returns HTTP 400 and preserves existing score', async () => {
    const instructor = createMockUser({ name: 'Tamper Instructor', email: 'instructor_tamper@learnspace.org', role: 'instructor' });
    const student = createMockUser({ name: 'Retest Student', email: 'retest_student@example.com', role: 'student' });
    const course = createMockCourse({ title: 'Integrity Course', instructor: instructor._id });

    const quiz = createMockQuiz({
      title: 'Tamper Proof Quiz',
      course: course._id,
      instructor: instructor._id,
      passingPercentage: 60,
      durationMinutes: 20,
      maxAttempts: 2,
      status: 'published',
      questions: [
        {
          _id: makeObjectId(),
          questionText: 'Security Question',
          options: [
            { id: 'opt_yes', text: 'Secure' },
            { id: 'opt_no', text: 'Insecure' },
          ],
          correctOptionId: 'opt_yes',
          points: 15,
          explanation: 'Always secure by default.',
        },
      ],
    });

    mockEnrollments.push({
      _id: makeObjectId(),
      student: student._id,
      course: course._id,
      status: 'active',
      completedLessons: [],
    });

    const cookie = makeCookie(student);

    // 1. Start attempt
    const startRes = await request(app)
      .post(`/api/courses/${course._id}/quizzes/${quiz._id}/start`)
      .set('Cookie', cookie);

    assert.strictEqual(startRes.status, 201);
    const attemptId = startRes.body.attempt.id;

    // 2. Submit initial wrong answer (0 / 15)
    const submitRes = await request(app)
      .post(`/api/courses/${course._id}/quizzes/${quiz._id}/attempts/${attemptId}/submit`)
      .set('Cookie', cookie)
      .send({
        answers: [
          { questionId: quiz.questions[0]._id.toString(), selectedOptionId: 'opt_no' },
        ],
      });

    assert.strictEqual(submitRes.status, 200);
    assert.strictEqual(submitRes.body.result.score, 0);
    assert.strictEqual(submitRes.body.result.passed, false);

    // Verify stored attempt in mock store
    const storedAttempt = mockQuizAttempts.find((a) => a._id.toString() === attemptId);
    assert(storedAttempt, 'Attempt must exist in mock store');
    assert.strictEqual(storedAttempt.status, 'completed');
    assert.strictEqual(storedAttempt.score, 0);

    // 3. Re-submit the same attempt trying to send the correct answer
    const resubmitRes = await request(app)
      .post(`/api/courses/${course._id}/quizzes/${quiz._id}/attempts/${attemptId}/submit`)
      .set('Cookie', cookie)
      .send({
        answers: [
          { questionId: quiz.questions[0]._id.toString(), selectedOptionId: 'opt_yes' },
        ],
      });

    assert.strictEqual(resubmitRes.status, 400);
    assert.strictEqual(resubmitRes.body.error, 'This attempt has already been submitted and graded.');

    // 4. Verify that saved score was NOT altered
    assert.strictEqual(storedAttempt.score, 0);
    assert.strictEqual(storedAttempt.passed, false);
  });

  await t.test('13. Instructor quiz analytics returns aggregate statistics, student attempt records, and rejects unauthorized access', async () => {
    const ownerInstructor = createMockUser({ name: 'Owner Instructor', email: 'owner@learnspace.org', role: 'instructor' });
    const otherInstructor = createMockUser({ name: 'Other Instructor', email: 'other@learnspace.org', role: 'instructor' });
    const student1 = createMockUser({ name: 'Alice Top', email: 'alice.top@example.com', role: 'student' });
    const student2 = createMockUser({ name: 'Bob Low', email: 'bob.low@example.com', role: 'student' });
    const course = createMockCourse({ title: 'Analytics Evaluation Course', instructor: ownerInstructor._id });

    const quiz = createMockQuiz({
      title: 'Analytics Test Quiz',
      course: course._id,
      instructor: ownerInstructor._id,
      passingPercentage: 60,
      durationMinutes: 30,
      maxAttempts: 3,
      status: 'published',
      questions: [
        {
          _id: makeObjectId(),
          questionText: 'Analytics Question 1',
          options: [
            { id: 'opt_1', text: 'Option A' },
            { id: 'opt_2', text: 'Option B' },
          ],
          correctOptionId: 'opt_1',
          points: 10,
          explanation: 'A is correct.',
        },
      ],
    });

    mockEnrollments.push(
      { _id: makeObjectId(), student: student1._id, course: course._id, status: 'active', completedLessons: [] },
      { _id: makeObjectId(), student: student2._id, course: course._id, status: 'active', completedLessons: [] }
    );

    const student1Cookie = makeCookie(student1);
    const student2Cookie = makeCookie(student2);
    const ownerCookie = makeCookie(ownerInstructor);
    const otherCookie = makeCookie(otherInstructor);

    // Student 1 completes quiz (100% score)
    const startRes1 = await request(app)
      .post(`/api/courses/${course._id}/quizzes/${quiz._id}/start`)
      .set('Cookie', student1Cookie);
    assert.strictEqual(startRes1.status, 201);

    await request(app)
      .post(`/api/courses/${course._id}/quizzes/${quiz._id}/attempts/${startRes1.body.attempt.id}/submit`)
      .set('Cookie', student1Cookie)
      .send({
        answers: [{ questionId: quiz.questions[0]._id.toString(), selectedOptionId: 'opt_1' }],
      });

    // Student 2 completes quiz (0% score)
    const startRes2 = await request(app)
      .post(`/api/courses/${course._id}/quizzes/${quiz._id}/start`)
      .set('Cookie', student2Cookie);
    assert.strictEqual(startRes2.status, 201);

    await request(app)
      .post(`/api/courses/${course._id}/quizzes/${quiz._id}/attempts/${startRes2.body.attempt.id}/submit`)
      .set('Cookie', student2Cookie)
      .send({
        answers: [{ questionId: quiz.questions[0]._id.toString(), selectedOptionId: 'opt_2' }],
      });

    // 1. Unauthorized instructor is rejected (403 Forbidden)
    const unauthorizedRes = await request(app)
      .get(`/api/instructor/quizzes/${quiz._id}/analytics`)
      .set('Cookie', otherCookie);

    assert.strictEqual(unauthorizedRes.status, 403);
    assert.strictEqual(unauthorizedRes.body.error, 'Forbidden: You do not have permission to manage this quiz.');

    // 2. Owner instructor accesses analytics successfully (200 OK)
    const analyticsRes = await request(app)
      .get(`/api/instructor/quizzes/${quiz._id}/analytics`)
      .set('Cookie', ownerCookie);

    assert.strictEqual(analyticsRes.status, 200);
    assert.strictEqual(analyticsRes.body.quiz.id.toString(), quiz._id.toString());
    assert.strictEqual(analyticsRes.body.quiz.title, 'Analytics Test Quiz');

    // Aggregate stats: 2 attempts, 1 passed, 50% pass rate, 50% avg percentage
    assert.strictEqual(analyticsRes.body.stats.totalCompleted, 2);
    assert.strictEqual(analyticsRes.body.stats.passedCount, 1);
    assert.strictEqual(analyticsRes.body.stats.passRate, 50);
    assert.strictEqual(analyticsRes.body.stats.averagePercentage, 50);

    // Recent attempts list
    assert.strictEqual(analyticsRes.body.recentAttempts.length, 2);
    const aliceAttempt = analyticsRes.body.recentAttempts.find((a) => a.studentEmail === student1.email);
    assert(aliceAttempt, 'Alice attempt must be in analytics');
    assert.strictEqual(aliceAttempt.studentName, 'Alice Top');
    assert.strictEqual(aliceAttempt.score, 10);
    assert.strictEqual(aliceAttempt.maxScore, 10);
    assert.strictEqual(aliceAttempt.passed, true);

    const bobAttempt = analyticsRes.body.recentAttempts.find((a) => a.studentEmail === student2.email);
    assert(bobAttempt, 'Bob attempt must be in analytics');
    assert.strictEqual(bobAttempt.studentName, 'Bob Low');
    assert.strictEqual(bobAttempt.score, 0);
    assert.strictEqual(bobAttempt.maxScore, 10);
    assert.strictEqual(bobAttempt.passed, false);
  });

});
