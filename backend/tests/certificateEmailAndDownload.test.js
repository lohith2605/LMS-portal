const test = require('node:test');
const assert = require('node:assert');
const mongoose = require('mongoose');
const User = require('../models/User');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const Quiz = require('../models/Quiz');
const QuizAttempt = require('../models/QuizAttempt');
const Certificate = require('../models/Certificate');
const certificatePdfService = require('../services/certificatePdfService');
const emailService = require('../services/emailService');
const {
  issueCertificateForStudent,
  downloadCertificatePdf,
  retryCertificateEmail,
  dispatchCertificateEmailAsync,
} = require('../controllers/completionController');

// In-memory mock stores
let mockUsers = [];
let mockCourses = [];
let mockEnrollments = [];
let mockQuizzes = [];
let mockQuizAttempts = [];
let mockCertificates = [];
let idCounter = 3000;

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
  idCounter = 3000;
};

// Model overrides
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

Course.findById = (id) => {
  const course = mockCourses.find((c) => c._id.toString() === id.toString());
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
  if (!cert) {
    return {
      populate: () => Promise.resolve(null),
      then: (resolve) => Promise.resolve(null).then(resolve),
    };
  }
  cert.save = function () {
    return Promise.resolve(this);
  };
  return {
    populate: () => Promise.resolve(cert),
    then: (resolve) => Promise.resolve(cert).then(resolve),
  };
};

Certificate.create = (data) => {
  const cert = {
    ...data,
    _id: makeObjectId(),
    createdAt: new Date(),
    updatedAt: new Date(),
    save() {
      return Promise.resolve(this);
    },
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
    headers: {},
    body: null,
    isEndCalled: false,
    setHeader(key, value) {
      this.headers[key.toLowerCase()] = value;
      return this;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
    send(data) {
      this.body = data;
      this.isEndCalled = true;
      return this;
    },
    end() {
      this.isEndCalled = true;
      return this;
    },
  };
  return res;
};

test.describe('Certificate Generation, Download Security & Email Workflow Suite', () => {
  test.beforeEach(() => {
    resetTestDb();
  });

  test('PDF Generation: creates valid PDF buffer with %PDF- header and dimensions', async () => {
    const pdfBuffer = await certificatePdfService.generateCertificatePdf({
      certificateId: 'LS-2026-TEST01',
      studentName: 'Alex Mercer',
      courseTitle: 'Full-Stack JavaScript Mastery',
      category: 'Web Development',
      instructorName: 'Sarah Connor',
      completionDate: new Date(),
      verificationUrl: 'https://learnspace.io/verify/LS-2026-TEST01',
    });

    assert.ok(Buffer.isBuffer(pdfBuffer), 'Output must be a Buffer');
    assert.ok(pdfBuffer.length > 2000, 'PDF buffer should be substantial');
    const header = pdfBuffer.slice(0, 5).toString('ascii');
    assert.strictEqual(header, '%PDF-', 'PDF must begin with %PDF- magic bytes');
  });

  test('Download API: returns 401 when request is unauthenticated', async () => {
    const req = {
      params: { certificateId: 'LS-2026-TEST01' },
      user: null,
    };
    const res = createMockRes();

    await downloadCertificatePdf(req, res);

    assert.strictEqual(res.statusCode, 401);
    assert.ok(res.body.error);
  });

  test('Download API: returns 404 when certificate ID does not exist', async () => {
    const studentId = makeObjectId();
    const req = {
      params: { certificateId: 'LS-NONEXISTENT' },
      user: { _id: studentId, id: studentId.toString(), role: 'student' },
    };
    const res = createMockRes();

    await downloadCertificatePdf(req, res);

    assert.strictEqual(res.statusCode, 404);
    assert.ok(res.body.error.includes('Certificate not found'));
  });

  test('Download API: returns 403 when another student attempts to download', async () => {
    const ownerId = makeObjectId();
    const attackerId = makeObjectId();
    const courseId = makeObjectId();

    mockCertificates.push({
      _id: makeObjectId(),
      certificateId: 'LS-2026-OWNER01',
      student: ownerId,
      course: courseId,
      studentSnapshot: { name: 'Alice Owner', email: 'alice@example.com' },
      courseSnapshot: { title: 'Security 101' },
      status: 'valid',
      issuedAt: new Date(),
    });

    const req = {
      params: { certificateId: 'LS-2026-OWNER01' },
      user: { _id: attackerId, id: attackerId.toString(), role: 'student' },
    };
    const res = createMockRes();

    await downloadCertificatePdf(req, res);

    assert.strictEqual(res.statusCode, 403);
    assert.ok(res.body.error.includes('authorized'));
  });

  test('Download API: returns 200 with PDF headers when certificate owner downloads', async () => {
    const ownerId = makeObjectId();
    const courseId = makeObjectId();

    mockCertificates.push({
      _id: makeObjectId(),
      certificateId: 'LS-2026-OWNER02',
      student: ownerId,
      course: courseId,
      studentSnapshot: { name: 'Alice Owner', email: 'alice@example.com' },
      courseSnapshot: { title: 'Security 101' },
      status: 'valid',
      issuedAt: new Date(),
    });

    const req = {
      params: { certificateId: 'LS-2026-OWNER02' },
      user: { _id: ownerId, id: ownerId.toString(), role: 'student' },
    };
    const res = createMockRes();

    await downloadCertificatePdf(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.headers['content-type'], 'application/pdf');
    assert.strictEqual(
      res.headers['content-disposition'],
      'attachment; filename="LearnSpace-Certificate-LS-2026-OWNER02.pdf"'
    );
    assert.ok(res.body && Buffer.isBuffer(res.body));
  });

  test('Download API: returns 200 with PDF headers when an admin downloads', async () => {
    const ownerId = makeObjectId();
    const adminId = makeObjectId();
    const courseId = makeObjectId();

    mockCertificates.push({
      _id: makeObjectId(),
      certificateId: 'LS-2026-ADMIN01',
      student: ownerId,
      course: courseId,
      studentSnapshot: { name: 'Bob Student', email: 'bob@example.com' },
      courseSnapshot: { title: 'Architecture 101' },
      status: 'valid',
      issuedAt: new Date(),
    });

    const req = {
      params: { certificateId: 'LS-2026-ADMIN01' },
      user: { _id: adminId, id: adminId.toString(), role: 'admin' },
    };
    const res = createMockRes();

    await downloadCertificatePdf(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.headers['content-type'], 'application/pdf');
    assert.ok(res.body && Buffer.isBuffer(res.body));
  });

  test('Automatic Issuance: issues certificate and triggers email when requirements are satisfied', async () => {
    const studentId = makeObjectId();
    const courseId = makeObjectId();
    const lesson1Id = makeObjectId();
    const lesson2Id = makeObjectId();

    mockUsers.push({
      _id: studentId,
      name: 'Maya Lin',
      email: 'maya@example.com',
      role: 'student',
    });

    mockCourses.push({
      _id: courseId,
      title: 'UI/UX Fundamentals',
      slug: 'ui-ux-fundamentals',
      instructor: { name: 'Prof. Wright' },
      sections: [
        {
          title: 'Module 1',
          lessons: [
            { _id: lesson1Id, title: 'L1', isPublished: true },
            { _id: lesson2Id, title: 'L2', isPublished: true },
          ],
        },
      ],
    });

    const enrollment = {
      _id: makeObjectId(),
      student: studentId,
      course: courseId,
      status: 'active',
      completedLessons: [lesson1Id, lesson2Id],
      isCompleted: false,
      save() {
        return Promise.resolve(this);
      },
    };
    mockEnrollments.push(enrollment);

    // Mock sendCertificateEmail to avoid real SMTP
    let emailSentArgs = null;
    const originalSendCertEmail = emailService.sendCertificateEmail;
    emailService.sendCertificateEmail = async (args) => {
      emailSentArgs = args;
      return { success: true, messageId: 'mock-msg-123' };
    };

    try {
      const result = await issueCertificateForStudent(studentId, courseId);

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.alreadyIssued, false);
      assert.ok(result.certificate);
      assert.strictEqual(result.certificate.studentSnapshot.name, 'Maya Lin');
      assert.strictEqual(enrollment.isCompleted, true);

      // Verify email was prepared with correct payload
      // Allow async tick for background dispatch
      await new Promise((resolve) => setTimeout(resolve, 50));
      assert.ok(emailSentArgs, 'sendCertificateEmail should have been called');
      assert.strictEqual(emailSentArgs.to, 'maya@example.com');
      assert.strictEqual(emailSentArgs.studentName, 'Maya Lin');
      assert.ok(Buffer.isBuffer(emailSentArgs.pdfBuffer), 'Email must attach PDF buffer');
    } finally {
      emailService.sendCertificateEmail = originalSendCertEmail;
    }
  });

  test('Automatic Issuance: denies certificate if mandatory quiz is not yet passed', async () => {
    const studentId = makeObjectId();
    const courseId = makeObjectId();
    const lessonId = makeObjectId();
    const quizId = makeObjectId();

    mockUsers.push({
      _id: studentId,
      name: 'Ken Adams',
      email: 'ken@example.com',
      role: 'student',
    });

    mockCourses.push({
      _id: courseId,
      title: 'DevOps Essentials',
      slug: 'devops-essentials',
      sections: [{ lessons: [{ _id: lessonId, isPublished: true }] }],
    });

    mockEnrollments.push({
      _id: makeObjectId(),
      student: studentId,
      course: courseId,
      status: 'active',
      completedLessons: [lessonId],
      save() {
        return Promise.resolve(this);
      },
    });

    mockQuizzes.push({
      _id: quizId,
      course: courseId,
      title: 'Final DevOps Exam',
      status: 'published',
      isRequiredForCompletion: true,
      passingPercentage: 75,
    });

    // Student has not passed the quiz
    const result = await issueCertificateForStudent(studentId, courseId);

    assert.strictEqual(result.eligible, false);
    assert.strictEqual(result.success, false);
    assert.ok(result.error.includes('Assessment required'));
    assert.strictEqual(mockCertificates.length, 0);
  });

  test('Idempotency: duplicate completion calls do not issue duplicate certificates or emails', async () => {
    const studentId = makeObjectId();
    const courseId = makeObjectId();
    const lessonId = makeObjectId();

    mockUsers.push({
      _id: studentId,
      name: 'Sam Fisher',
      email: 'sam@example.com',
    });

    mockCourses.push({
      _id: courseId,
      title: 'Cyber Security',
      slug: 'cyber-security',
      sections: [{ lessons: [{ _id: lessonId, isPublished: true }] }],
    });

    mockEnrollments.push({
      _id: makeObjectId(),
      student: studentId,
      course: courseId,
      status: 'active',
      completedLessons: [lessonId],
      save() {
        return Promise.resolve(this);
      },
    });

    let sendEmailCount = 0;
    const originalSendCertEmail = emailService.sendCertificateEmail;
    emailService.sendCertificateEmail = async () => {
      sendEmailCount += 1;
      return { success: true };
    };

    try {
      // First issuance
      const res1 = await issueCertificateForStudent(studentId, courseId);
      assert.strictEqual(res1.success, true);
      assert.strictEqual(res1.alreadyIssued, false);

      await new Promise((resolve) => setTimeout(resolve, 50));
      assert.strictEqual(sendEmailCount, 1);

      // Second trigger (duplicate attempt)
      const res2 = await issueCertificateForStudent(studentId, courseId);
      assert.strictEqual(res2.success, true);
      assert.strictEqual(res2.alreadyIssued, true);
      assert.strictEqual(mockCertificates.length, 1, 'Only one certificate should exist');

      await new Promise((resolve) => setTimeout(resolve, 50));
      assert.strictEqual(sendEmailCount, 1, 'No second email sent on duplicate trigger');
    } finally {
      emailService.sendCertificateEmail = originalSendCertEmail;
    }
  });

  test('SMTP Resilience: email failure does not invalidate certificate and marks status as failed', async () => {
    const studentId = makeObjectId();
    const courseId = makeObjectId();
    const certId = 'LS-2026-RETRY01';

    const certDoc = {
      _id: makeObjectId(),
      certificateId: certId,
      student: studentId,
      course: courseId,
      studentSnapshot: { name: 'Resilient Learner', email: 'learner@example.com' },
      courseSnapshot: { title: 'Network Security' },
      status: 'valid',
      emailSent: false,
      emailStatus: 'pending',
      emailAttempts: 0,
      save() {
        return Promise.resolve(this);
      },
    };
    mockCertificates.push(certDoc);

    const originalSendCertEmail = emailService.sendCertificateEmail;
    emailService.sendCertificateEmail = async () => {
      const err = new Error('SMTP connection timeout 504');
      err.code = 'ETIMEDOUT';
      throw err;
    };

    try {
      const dispatched = await dispatchCertificateEmailAsync(certDoc, { title: 'Network Security' });

      assert.strictEqual(dispatched, false, 'Dispatch should return false on SMTP failure');
      assert.strictEqual(certDoc.emailSent, false);
      assert.strictEqual(certDoc.emailStatus, 'failed');
      assert.strictEqual(certDoc.emailAttempts, 1);
      assert.ok(certDoc.emailError.includes('SMTP connection timeout'));
      assert.strictEqual(certDoc.status, 'valid', 'Certificate itself must remain valid in LMS');
    } finally {
      emailService.sendCertificateEmail = originalSendCertEmail;
    }
  });

  test('Retry Email API: allows authorized owner to retry email delivery', async () => {
    const studentId = makeObjectId();
    const courseId = makeObjectId();
    const certId = 'LS-2026-RETRY02';

    const certDoc = {
      _id: makeObjectId(),
      certificateId: certId,
      student: studentId,
      course: courseId,
      studentSnapshot: { name: 'Retry Learner', email: 'retry@example.com' },
      courseSnapshot: { title: 'Cloud DevOps' },
      status: 'valid',
      emailSent: false,
      emailStatus: 'failed',
      emailAttempts: 1,
      emailError: 'Previous connection reset',
      save() {
        return Promise.resolve(this);
      },
    };
    mockCertificates.push(certDoc);

    let retryCalled = false;
    const originalSendCertEmail = emailService.sendCertificateEmail;
    emailService.sendCertificateEmail = async () => {
      retryCalled = true;
      return { success: true };
    };

    try {
      const req = {
        params: { certificateId: certId },
        user: { _id: studentId, id: studentId.toString(), role: 'student' },
      };
      const res = createMockRes();

      await retryCertificateEmail(req, res);

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.emailStatus, 'sent');
      assert.strictEqual(retryCalled, true, 'Retry email delivery should have triggered');
    } finally {
      emailService.sendCertificateEmail = originalSendCertEmail;
    }
  });
});
