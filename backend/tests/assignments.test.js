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

const TEST_SECRET = 'test_jwt_secret_key_12345678901234567890';
process.env.JWT_SECRET = TEST_SECRET;
process.env.NODE_ENV = 'test';

// In-memory mock stores
let mockUsers = [];
let mockCourses = [];
let mockEnrollments = [];
let mockAssignments = [];
let mockSubmissions = [];
let idCounter = 300;

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
  idCounter = 300;
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

const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
    },
    TEST_SECRET,
    { expiresIn: '1h' }
  );
};

// ==========================================
// MONGOOSE MODEL STUBS
// ==========================================

User.findById = function (id) {
  const user = mockUsers.find((u) => u._id.toString() === id.toString());
  return {
    select: () => Promise.resolve(user || null),
    then: (resolve) => resolve(user || null),
  };
};

Course.findById = function (id) {
  const course = mockCourses.find((c) => c._id.toString() === id.toString());
  return Promise.resolve(course || null);
};

Course.findOne = function (query) {
  const course = mockCourses.find((c) => {
    if (query._id && c._id.toString() !== query._id.toString()) return false;
    if (query.slug && c.slug !== query.slug) return false;
    return true;
  });
  return Promise.resolve(course || null);
};

Enrollment.findOne = function (query) {
  const queryCourseId =
    query.course && typeof query.course === 'object' && query.course._id
      ? query.course._id.toString()
      : query.course ? query.course.toString() : null;

  const enrollment = mockEnrollments.find((e) => {
    if (queryCourseId && e.course.toString() !== queryCourseId) return false;
    if (query.student && e.student.toString() !== query.student.toString()) return false;
    if (query.status && typeof query.status === 'object' && query.status.$in) {
      if (!query.status.$in.includes(e.status)) return false;
    } else if (query.status && e.status !== query.status) {
      return false;
    }
    return true;
  });
  return Promise.resolve(enrollment || null);
};

Enrollment.find = function (query) {
  const filtered = mockEnrollments.filter((e) => {
    if (query.student && e.student.toString() !== query.student.toString()) return false;
    if (query.status && typeof query.status === 'object' && query.status.$in) {
      if (!query.status.$in.includes(e.status)) return false;
    } else if (query.status && e.status !== query.status) {
      return false;
    }
    return true;
  });

  return {
    select: () => Promise.resolve(filtered),
    then: (resolve) => resolve(filtered),
  };
};

Assignment.create = function (data) {
  const assignment = {
    _id: data._id || makeObjectId(),
    course: data.course,
    instructor: data.instructor,
    sectionId: data.sectionId || null,
    lessonId: data.lessonId || null,
    title: data.title,
    description: data.description || '',
    instructions: data.instructions,
    maxMarks: data.maxMarks,
    dueDate: new Date(data.dueDate),
    submissionTypes: data.submissionTypes || ['text'],
    allowedFileTypes: data.allowedFileTypes || ['pdf', 'zip', 'docx'],
    maxFileSizeMB: data.maxFileSizeMB || 10,
    allowLateSubmissions: data.allowLateSubmissions !== false,
    latePenaltyPercent: data.latePenaltyPercent || 0,
    attachments: data.attachments || [],
    status: data.status || 'draft',
    createdAt: new Date(),
    updatedAt: new Date(),
    async save() {
      const idx = mockAssignments.findIndex((a) => a._id.toString() === this._id.toString());
      if (idx !== -1) mockAssignments[idx] = this;
      else mockAssignments.push(this);
      return this;
    },
  };
  mockAssignments.push(assignment);
  return Promise.resolve(assignment);
};

Assignment.findById = function (id) {
  const assignment = mockAssignments.find((a) => a._id.toString() === id.toString());
  return {
    populate: (path, select) => {
      if (assignment) {
        const course = mockCourses.find((c) => c._id.toString() === assignment.course.toString());
        return Promise.resolve({ ...assignment, course: course || assignment.course });
      }
      return Promise.resolve(null);
    },
    then: (resolve) => resolve(assignment || null),
  };
};

Assignment.findOne = function (query) {
  const assignment = mockAssignments.find((a) => {
    if (query._id && a._id.toString() !== query._id.toString()) return false;
    if (query.status && a.status !== query.status) return false;
    return true;
  });

  return {
    populate: () => {
      if (assignment) {
        const course = mockCourses.find((c) => c._id.toString() === assignment.course.toString());
        return Promise.resolve({ ...assignment, course: course || assignment.course });
      }
      return Promise.resolve(null);
    },
    then: (resolve) => resolve(assignment || null),
  };
};

Assignment.find = function (query) {
  const filtered = mockAssignments.filter((a) => {
    if (query.course) {
      if (typeof query.course === 'object' && query.course.$in) {
        const cIds = query.course.$in.map((id) => id.toString());
        if (!cIds.includes(a.course.toString())) return false;
      } else if (a.course.toString() !== query.course.toString()) {
        return false;
      }
    }
    if (query.status && a.status !== query.status) return false;
    return true;
  });

  return {
    populate: () => ({
      sort: () => ({
        lean: () =>
          Promise.resolve(
            filtered.map((a) => {
              const course = mockCourses.find((c) => c._id.toString() === a.course.toString());
              return { ...a, course: course || a.course };
            })
          ),
      }),
    }),
    sort: () => ({
      lean: () => Promise.resolve(filtered),
    }),
    then: (resolve) => resolve(filtered),
  };
};

Assignment.findByIdAndDelete = function (id) {
  const idx = mockAssignments.findIndex((a) => a._id.toString() === id.toString());
  if (idx !== -1) mockAssignments.splice(idx, 1);
  return Promise.resolve({ ok: 1 });
};

AssignmentSubmission.create = function (data) {
  const submission = {
    _id: data._id || makeObjectId(),
    assignment: data.assignment,
    student: data.student,
    course: data.course,
    submissionText: data.submissionText || '',
    submittedFiles: data.submittedFiles || [],
    status: data.status || 'submitted',
    isLate: Boolean(data.isLate),
    submittedAt: data.submittedAt || new Date(),
    version: data.version || 1,
    history: data.history || [],
    grade: data.grade || null,
    appliedLatePenalty: data.appliedLatePenalty || 0,
    feedback: data.feedback || '',
    gradedBy: data.gradedBy || null,
    gradedAt: data.gradedAt || null,
    isGradePublished: Boolean(data.isGradePublished),
    createdAt: new Date(),
    updatedAt: new Date(),
    async save() {
      const idx = mockSubmissions.findIndex((s) => s._id.toString() === this._id.toString());
      if (idx !== -1) mockSubmissions[idx] = this;
      else mockSubmissions.push(this);
      return this;
    },
  };
  mockSubmissions.push(submission);
  return Promise.resolve(submission);
};

AssignmentSubmission.findOne = function (query) {
  const sub = mockSubmissions.find((s) => {
    if (query.assignment && s.assignment.toString() !== query.assignment.toString()) return false;
    if (query.student && s.student.toString() !== query.student.toString()) return false;
    return true;
  });

  return {
    populate: () => ({
      lean: () => Promise.resolve(sub || null),
    }),
    lean: () => Promise.resolve(sub || null),
    then: (resolve) => resolve(sub || null),
  };
};

AssignmentSubmission.findById = function (id) {
  const sub = mockSubmissions.find((s) => s._id.toString() === id.toString());
  return {
    populate: (field, select) => {
      let populatedSub = sub ? { ...sub } : null;
      if (populatedSub) {
        const student = mockUsers.find((u) => u._id.toString() === populatedSub.student.toString());
        const assignment = mockAssignments.find((a) => a._id.toString() === populatedSub.assignment.toString());
        const course = mockCourses.find((c) => c._id.toString() === populatedSub.course.toString());
        populatedSub = {
          ...populatedSub,
          student: student || populatedSub.student,
          assignment: assignment || populatedSub.assignment,
          course: course || populatedSub.course,
          async save() {
            const idx = mockSubmissions.findIndex((s) => s._id.toString() === this._id.toString());
            if (idx !== -1) mockSubmissions[idx] = this;
            return this;
          },
        };
      }
      return {
        populate: () => ({
          populate: () => Promise.resolve(populatedSub),
          then: (resolve) => resolve(populatedSub),
        }),
        then: (resolve) => resolve(populatedSub),
      };
    },
    then: (resolve) => resolve(sub || null),
  };
};

AssignmentSubmission.find = function (query) {
  const filtered = mockSubmissions.filter((s) => {
    if (query.assignment) {
      const assignmentId = s.assignment && s.assignment._id ? s.assignment._id.toString() : s.assignment ? s.assignment.toString() : '';
      if (typeof query.assignment === 'object' && query.assignment.$in) {
        const ids = query.assignment.$in.map((id) => id.toString());
        if (!ids.includes(assignmentId)) return false;
      } else if (assignmentId !== query.assignment.toString()) {
        return false;
      }
    }
    const studentId = s.student && s.student._id ? s.student._id.toString() : s.student ? s.student.toString() : '';
    if (query.student && studentId !== query.student.toString()) return false;
    if (query.status && s.status !== query.status) return false;
    if (query.isGradePublished !== undefined && s.isGradePublished !== query.isGradePublished) return false;
    return true;
  });

  const populated = filtered.map((s) => {
    const assignment = mockAssignments.find((a) => a._id.toString() === (s.assignment?._id || s.assignment).toString());
    const course = mockCourses.find((c) => c._id.toString() === (s.course?._id || s.course).toString());
    return {
      ...s,
      assignment: assignment || s.assignment,
      course: course || s.course,
    };
  });

  return {
    select: () => Promise.resolve(populated),
    populate: () => ({
      populate: () => ({
        sort: () => ({
          lean: () => Promise.resolve(populated),
        }),
      }),
      sort: () => ({
        lean: () => Promise.resolve(populated),
      }),
    }),
    sort: () => ({
      lean: () => Promise.resolve(populated),
    }),
    then: (resolve) => resolve(populated),
  };
};

AssignmentSubmission.countDocuments = function (query) {
  const count = mockSubmissions.filter((s) => {
    if (query.assignment && s.assignment.toString() !== query.assignment.toString()) return false;
    if (query.course) {
      if (typeof query.course === 'object' && query.course.$in) {
        const cIds = query.course.$in.map((id) => id.toString());
        if (!cIds.includes(s.course.toString())) return false;
      } else if (s.course.toString() !== query.course.toString()) {
        return false;
      }
    }
    if (query.status && typeof query.status === 'object' && query.status.$in) {
      if (!query.status.$in.includes(s.status)) return false;
    } else if (query.status && s.status !== query.status) {
      return false;
    }
    if (query.isGradePublished !== undefined && s.isGradePublished !== query.isGradePublished) return false;
    return true;
  }).length;
  return Promise.resolve(count);
};

AssignmentSubmission.aggregate = function () {
  return Promise.resolve([]);
};

// ==========================================
// TEST SUITE
// ==========================================

test('Phase 6 Assignments & Grading Suite', async (t) => {
  resetTestDb();

  // Create Users
  const instructorA = createMockUser({
    name: 'Alice Instructor',
    email: 'alice.inst@learnspace.org',
    role: 'instructor',
    accountStatus: 'active',
  });

  const instructorB = createMockUser({
    name: 'Bob Competitor',
    email: 'bob.inst@learnspace.org',
    role: 'instructor',
    accountStatus: 'active',
  });

  const studentEmma = createMockUser({
    name: 'Emma Student',
    email: 'emma.student@learnspace.org',
    role: 'student',
    accountStatus: 'active',
  });

  const studentDave = createMockUser({
    name: 'Dave Unenrolled',
    email: 'dave.unenrolled@learnspace.org',
    role: 'student',
    accountStatus: 'active',
  });

  // Create Courses
  const courseA = {
    _id: makeObjectId(),
    title: 'Advanced Fullstack Engineering',
    slug: 'advanced-fullstack',
    instructor: instructorA._id,
    status: 'published',
    sections: [
      {
        _id: makeObjectId(),
        title: 'Module 1: Architecture',
        lessons: [{ _id: makeObjectId(), title: 'Microservices Design' }],
      },
    ],
  };
  mockCourses.push(courseA);

  // Enroll Emma in Course A
  mockEnrollments.push({
    _id: makeObjectId(),
    course: courseA._id,
    student: studentEmma._id,
    status: 'active',
    completedLessons: [],
  });

  const instructorAToken = generateToken(instructorA);
  const instructorBToken = generateToken(instructorB);
  const studentEmmaToken = generateToken(studentEmma);
  const studentDaveToken = generateToken(studentDave);

  let createdAssignmentId = null;

  await t.test('1. Authorized instructor can create an assignment as draft', async () => {
    const res = await request(app)
      .post(`/api/instructor/courses/${courseA._id}/assignments`)
      .set('Authorization', `Bearer ${instructorAToken}`)
      .send({
        title: 'Fullstack Architectural Blueprint',
        description: 'Design a modular backend service architecture with schema diagrams.',
        instructions: 'Submit a PDF diagram and markdown architectural specification.',
        maxMarks: 100,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        submissionTypes: ['text', 'file'],
        allowedFileTypes: ['pdf', 'zip'],
        maxFileSizeMB: 10,
        allowLateSubmissions: true,
        latePenaltyPercent: 10,
      });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.assignment.title, 'Fullstack Architectural Blueprint');
    assert.strictEqual(res.body.assignment.status, 'draft');
    assert.strictEqual(res.body.assignment.maxMarks, 100);
    createdAssignmentId = res.body.assignment._id;
  });

  await t.test('2. Student cannot create assignments (403 Forbidden)', async () => {
    const res = await request(app)
      .post(`/api/instructor/courses/${courseA._id}/assignments`)
      .set('Authorization', `Bearer ${studentEmmaToken}`)
      .send({
        title: 'Hacked Assignment',
        instructions: 'Unauthorized attempt',
        maxMarks: 50,
        dueDate: new Date().toISOString(),
      });

    assert.strictEqual(res.status, 403);
  });

  await t.test('3. Instructor cannot modify another instructor’s assignment (403 Forbidden)', async () => {
    const res = await request(app)
      .patch(`/api/instructor/assignments/${createdAssignmentId}`)
      .set('Authorization', `Bearer ${instructorBToken}`)
      .send({
        title: 'Unauthorized Modification',
      });

    assert.strictEqual(res.status, 403);
  });

  await t.test('4. Invalid assignment fields are rejected', async () => {
    const resMissingTitle = await request(app)
      .post(`/api/instructor/courses/${courseA._id}/assignments`)
      .set('Authorization', `Bearer ${instructorAToken}`)
      .send({
        title: '',
        instructions: 'Test instructions',
        maxMarks: 100,
        dueDate: new Date().toISOString(),
      });

    assert.strictEqual(resMissingTitle.status, 400);

    const resNegativeMarks = await request(app)
      .post(`/api/instructor/courses/${courseA._id}/assignments`)
      .set('Authorization', `Bearer ${instructorAToken}`)
      .send({
        title: 'Valid Title',
        instructions: 'Test instructions',
        maxMarks: -10,
        dueDate: new Date().toISOString(),
      });

    assert.strictEqual(resNegativeMarks.status, 400);
  });

  await t.test('5. Draft assignment is not visible to students', async () => {
    const res = await request(app)
      .get(`/api/student/assignments/${createdAssignmentId}`)
      .set('Authorization', `Bearer ${studentEmmaToken}`);

    assert.strictEqual(res.status, 404);
  });

  await t.test('6. Authorized instructor publishes assignment', async () => {
    const res = await request(app)
      .post(`/api/instructor/assignments/${createdAssignmentId}/publish`)
      .set('Authorization', `Bearer ${instructorAToken}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.assignment.status, 'published');
  });

  await t.test('7. Enrolled student can discover and view published assignment', async () => {
    const res = await request(app)
      .get(`/api/student/assignments/${createdAssignmentId}`)
      .set('Authorization', `Bearer ${studentEmmaToken}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.assignment.title, 'Fullstack Architectural Blueprint');
    assert.strictEqual(res.body.assignment.maxMarks, 100);
  });

  await t.test('8. Unenrolled student cannot access protected assignment (403 Forbidden)', async () => {
    const res = await request(app)
      .get(`/api/student/assignments/${createdAssignmentId}`)
      .set('Authorization', `Bearer ${studentDaveToken}`);

    assert.strictEqual(res.status, 403);
  });

  let submittedSubmissionId = null;

  await t.test('9. Enrolled student submits valid text and file response', async () => {
    const res = await request(app)
      .post(`/api/student/assignments/${createdAssignmentId}/submissions`)
      .set('Authorization', `Bearer ${studentEmmaToken}`)
      .send({
        submissionText: 'Here is my architectural proposal detailing the microservices architecture.',
        submittedFiles: [
          {
            originalName: 'architecture_diagram.pdf',
            fileUrl: 'https://storage.learnspace.org/artifacts/arch_diagram.pdf',
            fileSize: 1024 * 500, // 500 KB
            mimeType: 'application/pdf',
          },
        ],
      });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.submission.status, 'submitted');
    assert.strictEqual(res.body.submission.isLate, false);
    submittedSubmissionId = res.body.submission._id;
  });

  await t.test('10. Oversized and unsupported file types are rejected', async () => {
    const resOversized = await request(app)
      .post(`/api/student/assignments/${createdAssignmentId}/submissions`)
      .set('Authorization', `Bearer ${studentEmmaToken}`)
      .send({
        submittedFiles: [
          {
            originalName: 'giant_archive.zip',
            fileUrl: 'https://storage.learnspace.org/giant.zip',
            fileSize: 1024 * 1024 * 55, // 55 MB (exceeds 10 MB limit)
            mimeType: 'application/zip',
          },
        ],
      });

    assert.strictEqual(resOversized.status, 400);

    const resUnsupportedExt = await request(app)
      .post(`/api/student/assignments/${createdAssignmentId}/submissions`)
      .set('Authorization', `Bearer ${studentEmmaToken}`)
      .send({
        submittedFiles: [
          {
            originalName: 'script.exe',
            fileUrl: 'https://storage.learnspace.org/script.exe',
            fileSize: 1024 * 100,
            mimeType: 'application/x-msdownload',
          },
        ],
      });

    assert.strictEqual(resUnsupportedExt.status, 400);
  });

  await t.test('11. Resubmission increments version and records history', async () => {
    const res = await request(app)
      .post(`/api/student/assignments/${createdAssignmentId}/submissions`)
      .set('Authorization', `Bearer ${studentEmmaToken}`)
      .send({
        submissionText: 'Updated architectural proposal version 2 with caching layer.',
        submittedFiles: [],
      });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.submission.version, 2);
    assert.strictEqual(res.body.submission.history.length, 1);
  });

  await t.test('12. Instructor grades submission and marks are bounded', async () => {
    // Attempt grading exceeding max marks (100)
    const resOverMax = await request(app)
      .patch(`/api/instructor/submissions/${submittedSubmissionId}/grade`)
      .set('Authorization', `Bearer ${instructorAToken}`)
      .send({
        grade: 125,
        feedback: 'Too generous',
      });

    assert.strictEqual(resOverMax.status, 400);

    // Negative grade rejected
    const resNegative = await request(app)
      .patch(`/api/instructor/submissions/${submittedSubmissionId}/grade`)
      .set('Authorization', `Bearer ${instructorAToken}`)
      .send({
        grade: -5,
        feedback: 'Negative marks',
      });

    assert.strictEqual(resNegative.status, 400);

    // Valid grade awarded
    const resValid = await request(app)
      .patch(`/api/instructor/submissions/${submittedSubmissionId}/grade`)
      .set('Authorization', `Bearer ${instructorAToken}`)
      .send({
        grade: 92,
        feedback: 'Exceptional system architecture diagram and clear domain boundary breakdown.',
        isGradePublished: true,
      });

    assert.strictEqual(resValid.status, 200);
    assert.strictEqual(resValid.body.submission.grade, 92);
    assert.strictEqual(resValid.body.submission.status, 'graded');
    assert.strictEqual(resValid.body.submission.isGradePublished, true);
  });

  await t.test('13. Unauthorized instructor cannot grade submission (403 Forbidden)', async () => {
    const res = await request(app)
      .patch(`/api/instructor/submissions/${submittedSubmissionId}/grade`)
      .set('Authorization', `Bearer ${instructorBToken}`)
      .send({
        grade: 50,
        feedback: 'Hostile grade',
      });

    assert.strictEqual(res.status, 403);
  });

  await t.test('14. Student views their published grade and feedback', async () => {
    const res = await request(app)
      .get(`/api/student/grades`)
      .set('Authorization', `Bearer ${studentEmmaToken}`);

    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body.grades));
    assert.strictEqual(res.body.grades.length, 1);
    assert.strictEqual(res.body.grades[0].gradeAwarded, 92);
    assert.strictEqual(res.body.grades[0].maxMarks, 100);
    assert.ok(res.body.grades[0].feedback.includes('Exceptional system architecture'));
  });

  await t.test('15. Deadline enforcement rejects late submissions when late submissions disabled', async () => {
    // Create strict assignment with dueDate in the past and allowLateSubmissions: false
    const strictAssignment = await Assignment.create({
      course: courseA._id,
      instructor: instructorA._id,
      title: 'Strict Past Deadline Assignment',
      instructions: 'Submit on time',
      maxMarks: 50,
      dueDate: new Date(Date.now() - 3600000), // 1 hour ago
      submissionTypes: ['text'],
      allowLateSubmissions: false,
      status: 'published',
    });

    const res = await request(app)
      .post(`/api/student/assignments/${strictAssignment._id}/submissions`)
      .set('Authorization', `Bearer ${studentEmmaToken}`)
      .send({
        submissionText: 'Late attempt on strict assignment',
      });

    assert.strictEqual(res.status, 400);
    assert.ok(res.body.error.toLowerCase().includes('deadline has passed'));
  });
});
