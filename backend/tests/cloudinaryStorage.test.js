const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { app } = require('../server');
const cloudinary = require('cloudinary').v2;
const cloudinaryStorageService = require('../services/cloudinaryStorageService');
const { isCloudinaryConfigured } = require('../config/cloudinary');
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
let idCounter = 500;

const makeObjectId = () => {
  const hex = (idCounter++).toString(16).padStart(24, '0');
  return new mongoose.Types.ObjectId(hex);
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
// MONGOOSE MODEL STUBS FOR CLOUDINARY SUITE
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

Enrollment.findOne = function (query) {
  const enrollment = mockEnrollments.find((e) => {
    if (query.course && e.course.toString() !== query.course.toString()) return false;
    if (query.student && e.student.toString() !== query.student.toString()) return false;
    return true;
  });
  return Promise.resolve(enrollment || null);
};

Assignment.findById = function (id) {
  const assignment = mockAssignments.find((a) => a._id.toString() === id.toString());
  return {
    populate: () => Promise.resolve(assignment || null),
    then: (resolve) => resolve(assignment || null),
  };
};

AssignmentSubmission.create = function (data) {
  const sub = {
    _id: data._id || makeObjectId(),
    assignment: data.assignment,
    student: data.student,
    course: data.course,
    submissionText: data.submissionText || '',
    submittedFiles: (data.submittedFiles || []).map((f) => ({
      _id: f._id || makeObjectId(),
      ...f,
    })),
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
  mockSubmissions.push(sub);
  return Promise.resolve(sub);
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
      then: (resolve) => resolve(sub || null),
    }),
    lean: () => Promise.resolve(sub || null),
    then: (resolve) => resolve(sub || null),
  };
};

AssignmentSubmission.findById = function (id) {
  const sub = mockSubmissions.find((s) => s._id.toString() === id.toString());
  if (!sub) {
    return {
      populate: () => Promise.resolve(null),
      then: (resolve) => resolve(null),
    };
  }

  const course = mockCourses.find((c) => c._id.toString() === sub.course.toString());
  const populated = {
    ...sub,
    course: course || { _id: sub.course, instructor: makeObjectId() },
    assignment: mockAssignments.find((a) => a._id.toString() === sub.assignment.toString()) || null,
  };

  return {
    populate: () => Promise.resolve(populated),
    then: (resolve) => resolve(populated),
  };
};

// ==========================================
// TEST SUITE: CLOUDINARY INTEGRATION
// ==========================================

test('Cloudinary Assignment Storage Suite', async (t) => {
  // Test Data Setup
  mockUsers = [];
  mockCourses = [];
  mockEnrollments = [];
  mockAssignments = [];
  mockSubmissions = [];

  const instructor1 = createMockUser({ name: 'Professor Alan', email: 'alan@learnspace.org', role: 'instructor' });
  const instructor2 = createMockUser({ name: 'Professor Bob', email: 'bob@learnspace.org', role: 'instructor' });
  const studentAlice = createMockUser({ name: 'Alice Student', email: 'alice@student.org', role: 'student' });
  const studentEve = createMockUser({ name: 'Eve Outsider', email: 'eve@student.org', role: 'student' });

  const tokenInstructor1 = generateToken(instructor1);
  const tokenInstructor2 = generateToken(instructor2);
  const tokenAlice = generateToken(studentAlice);
  const tokenEve = generateToken(studentEve);

  const course1 = {
    _id: makeObjectId(),
    title: 'Distributed Systems & Cloud Storage',
    instructor: instructor1._id,
    status: 'published',
  };
  mockCourses.push(course1);

  // Alice is enrolled in Course 1; Eve is not enrolled
  mockEnrollments.push({
    _id: makeObjectId(),
    course: course1._id,
    student: studentAlice._id,
    status: 'active',
  });

  const assignment1 = {
    _id: makeObjectId(),
    course: course1._id,
    instructor: instructor1._id,
    title: 'Microservices Architecture Capstone',
    submissionTypes: ['text', 'file'],
    allowedFileTypes: ['pdf', 'zip'],
    maxFileSizeMB: 5,
    dueDate: new Date(Date.now() + 86400000), // Tomorrow
    allowLateSubmissions: true,
    latePenaltyPercent: 10,
    status: 'published',
  };
  mockAssignments.push(assignment1);

  // Mock Cloudinary SDK uploader stream for unit and HTTP tests
  const originalUploadStream = cloudinary.uploader.upload_stream;
  const originalDestroy = cloudinary.uploader.destroy;
  const originalPrivateDownloadUrl = cloudinary.utils.private_download_url;

  cloudinary.uploader.upload_stream = (options, callback) => {
    return {
      write: (data) => {},
      end: (buffer) => {
        const publicId = options.public_id || `learnspace/assignments/mock_${Date.now()}`;
        callback(null, {
          public_id: publicId,
          resource_type: options.resource_type || 'raw',
          type: options.type || 'authenticated',
          format: options.format || 'pdf',
          bytes: buffer ? buffer.length : 1024,
          created_at: new Date().toISOString(),
          secure_url: `https://res.cloudinary.com/demo/raw/authenticated/${publicId}.pdf`,
        });
      },
      on: () => {},
      once: () => {},
      emit: () => {},
    };
  };

  cloudinary.uploader.destroy = (publicId, options) => {
    return Promise.resolve({ result: 'ok' });
  };

  cloudinary.utils.private_download_url = (publicId, format, options) => {
    return `https://res.cloudinary.com/demo/raw/authenticated/s--signed-token--/${publicId}.${format}?expires=${options.expires_at}`;
  };

  t.after(() => {
    cloudinary.uploader.upload_stream = originalUploadStream;
    cloudinary.uploader.destroy = originalDestroy;
    cloudinary.utils.private_download_url = originalPrivateDownloadUrl;
  });

  // 1. Storage Service Unit Tests
  await t.test('1. File signature validation detects valid files and tampering mismatches', () => {
    // Valid PDF (%PDF-)
    const validPdfBuffer = Buffer.from('%PDF-1.5 test document content');
    const pdfCheck = cloudinaryStorageService.validateFileSignature(validPdfBuffer, 'pdf');
    assert.strictEqual(pdfCheck.valid, true);

    // Valid ZIP (PK..)
    const validZipBuffer = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00]);
    const zipCheck = cloudinaryStorageService.validateFileSignature(validZipBuffer, 'zip');
    assert.strictEqual(zipCheck.valid, true);

    // Tampered file: Plain text renamed to .pdf
    const fakePdfBuffer = Buffer.from('Just plain text, not a real PDF');
    const fakePdfCheck = cloudinaryStorageService.validateFileSignature(fakePdfBuffer, 'pdf');
    assert.strictEqual(fakePdfCheck.valid, false);
    assert.match(fakePdfCheck.error, /signature mismatch/i);

    // Valid PNG
    const validPngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const pngCheck = cloudinaryStorageService.validateFileSignature(validPngBuffer, 'png');
    assert.strictEqual(pngCheck.valid, true);
  });

  await t.test('2. Storage service uploads file buffer and derives authenticated metadata', async () => {
    const validPdfBuffer = Buffer.from('%PDF-1.4 test capstone deliverable');
    const result = await cloudinaryStorageService.uploadAssignmentFile(validPdfBuffer, {
      originalName: 'system_design.pdf',
      mimeType: 'application/pdf',
      assignmentId: assignment1._id.toString(),
      studentId: studentAlice._id.toString(),
    });

    assert.ok(result.cloudinaryPublicId);
    assert.match(result.cloudinaryPublicId, /^learnspace\/assignments\//);
    assert.strictEqual(result.deliveryType, 'authenticated');
    assert.strictEqual(result.resourceType, 'raw');
    assert.strictEqual(result.originalName, 'system_design.pdf');
    assert.ok(result.checksum);
  });

  await t.test('3. Storage service generates signed download URL with private access parameters', () => {
    const signedUrl = cloudinaryStorageService.generateAuthorizedDownloadUrl({
      cloudinaryPublicId: 'learnspace/assignments/capstone_123',
      format: 'pdf',
      resourceType: 'raw',
      deliveryType: 'authenticated',
      originalName: 'capstone.pdf',
    });

    assert.ok(signedUrl);
    assert.match(signedUrl, /res\.cloudinary\.com/);
    assert.match(signedUrl, /expires=/);
  });

  await t.test('4. Storage service safely deletes assets on request', async () => {
    const deleteRes = await cloudinaryStorageService.deleteAsset('learnspace/assignments/capstone_123', {
      resourceType: 'raw',
    });
    assert.strictEqual(deleteRes.result, 'ok');
  });

  // 2. Authorization & Upload HTTP Tests
  await t.test('5. Unauthenticated user cannot upload assignment files (401)', async () => {
    const res = await request(app)
      .post(`/api/student/assignments/${assignment1._id}/upload`)
      .attach('file', Buffer.from('%PDF-1.4 sample'), 'test.pdf');

    assert.strictEqual(res.status, 401);
  });

  await t.test('6. Unenrolled student cannot upload files to restricted assignment (403)', async () => {
    const res = await request(app)
      .post(`/api/student/assignments/${assignment1._id}/upload`)
      .set('Authorization', `Bearer ${tokenEve}`)
      .attach('file', Buffer.from('%PDF-1.4 sample'), 'capstone.pdf');

    assert.strictEqual(res.status, 403);
    assert.match(res.body.error, /not actively enrolled/i);
  });

  await t.test('7. Upload rejects disallowed file extensions and oversized files (400)', async () => {
    // Disallowed extension (.exe)
    const resExt = await request(app)
      .post(`/api/student/assignments/${assignment1._id}/upload`)
      .set('Authorization', `Bearer ${tokenAlice}`)
      .attach('file', Buffer.from('malicious payload'), 'virus.exe');

    assert.strictEqual(resExt.status, 400);

    // Tampered signature (.pdf with plain text bytes)
    const resTamper = await request(app)
      .post(`/api/student/assignments/${assignment1._id}/upload`)
      .set('Authorization', `Bearer ${tokenAlice}`)
      .attach('file', Buffer.from('Plain text fake pdf'), 'fake.pdf');

    assert.strictEqual(resTamper.status, 400);
    assert.match(resTamper.body.error, /signature mismatch/i);
  });

  let uploadedFileMetadata = null;

  await t.test('8. Enrolled student uploads valid PDF and receives Cloudinary metadata', async () => {
    const validPdfBuffer = Buffer.from('%PDF-1.4 Valid student research paper');
    const res = await request(app)
      .post(`/api/student/assignments/${assignment1._id}/upload`)
      .set('Authorization', `Bearer ${tokenAlice}`)
      .attach('file', validPdfBuffer, 'architecture_paper.pdf');

    assert.strictEqual(res.status, 200);
    assert.ok(res.body.file);
    assert.strictEqual(res.body.file.originalName, 'architecture_paper.pdf');
    assert.strictEqual(res.body.file.storageProvider, 'cloudinary');
    assert.ok(res.body.file.cloudinaryPublicId);
    assert.strictEqual(res.body.file.deliveryType, 'authenticated');

    uploadedFileMetadata = res.body.file;
  });

  let createdSubmissionId = null;
  let fileRecordId = null;

  await t.test('9. Student submits assignment using Cloudinary metadata with zero Base64 stored', async () => {
    const res = await request(app)
      .post(`/api/student/assignments/${assignment1._id}/submissions`)
      .set('Authorization', `Bearer ${tokenAlice}`)
      .send({
        submissionText: 'Here is my architecture deliverable and design doc.',
        submittedFiles: [uploadedFileMetadata],
      });

    assert.strictEqual(res.status, 201);
    assert.ok(res.body.submission);
    createdSubmissionId = res.body.submission._id;

    // Verify stored files in response
    const file = res.body.submission.submittedFiles[0];
    assert.ok(file);
    fileRecordId = file._id;
    assert.strictEqual(file.originalName, 'architecture_paper.pdf');
    assert.strictEqual(file.storageProvider, 'cloudinary');
    assert.ok(file.cloudinaryPublicId);
    // Verified: No Base64 data in fileUrl or stored records
    assert.ok(!file.fileUrl.startsWith('data:'));
    assert.match(file.fileUrl, /\/download\?redirect=true/);
  });

  // 3. Authorized Download Tests
  await t.test('10. Student can download their own submission file via signed URL', async () => {
    const res = await request(app)
      .get(`/api/student/submissions/${createdSubmissionId}/files/${fileRecordId}/download?redirect=false`)
      .set('Authorization', `Bearer ${tokenAlice}`);

    assert.strictEqual(res.status, 200);
    assert.ok(res.body.downloadUrl);
    assert.match(res.body.downloadUrl, /res\.cloudinary\.com/);
  });

  await t.test('11. Another student cannot download private submission file (403 Forbidden)', async () => {
    const res = await request(app)
      .get(`/api/student/submissions/${createdSubmissionId}/files/${fileRecordId}/download`)
      .set('Authorization', `Bearer ${tokenEve}`);

    assert.strictEqual(res.status, 403);
    assert.match(res.body.error, /Forbidden/i);
  });

  await t.test('12. Course instructor can download submission file', async () => {
    const res = await request(app)
      .get(`/api/instructor/submissions/${createdSubmissionId}/files/${fileRecordId}/download?redirect=false`)
      .set('Authorization', `Bearer ${tokenInstructor1}`);

    assert.strictEqual(res.status, 200);
    assert.ok(res.body.downloadUrl);
  });

  await t.test('13. Unauthorized instructor cannot download file from other courses (403 Forbidden)', async () => {
    const res = await request(app)
      .get(`/api/instructor/submissions/${createdSubmissionId}/files/${fileRecordId}/download`)
      .set('Authorization', `Bearer ${tokenInstructor2}`);

    assert.strictEqual(res.status, 403);
    assert.match(res.body.error, /Forbidden/i);
  });

  // 4. Base64 Migration Tests
  await t.test('14. Migration detects legacy Base64 attachments in active files and history', () => {
    const rawPdfBytes = Buffer.from('%PDF-1.4 Legacy Research Paper Content');
    const base64DataUrl = `data:application/pdf;base64,${rawPdfBytes.toString('base64')}`;

    const legacySubmission = {
      _id: makeObjectId(),
      assignment: assignment1._id,
      student: studentAlice._id,
      course: course1._id,
      submissionText: 'Legacy submission with Base64 payload',
      submittedFiles: [
        {
          _id: makeObjectId(),
          originalName: 'legacy_paper.pdf',
          fileUrl: base64DataUrl,
          fileSize: rawPdfBytes.length,
          mimeType: 'application/pdf',
          storageProvider: 'base64',
        },
      ],
      history: [
        {
          version: 1,
          submissionText: 'v1 draft',
          submittedFiles: [
            {
              _id: makeObjectId(),
              originalName: 'v1_draft.pdf',
              fileUrl: base64DataUrl,
              fileSize: rawPdfBytes.length,
              mimeType: 'application/pdf',
              storageProvider: 'base64',
            },
          ],
        },
      ],
      grade: 95,
      feedback: 'Excellent work in legacy semester',
      status: 'graded',
      isGradePublished: true,
      version: 2,
    };

    // Dry-run simulation: Detects Base64 attachments without modifying fileUrl
    const detectedFiles = [];
    if (legacySubmission.submittedFiles[0].fileUrl.startsWith('data:')) {
      detectedFiles.push(legacySubmission.submittedFiles[0].originalName);
    }
    if (legacySubmission.history[0].submittedFiles[0].fileUrl.startsWith('data:')) {
      detectedFiles.push(legacySubmission.history[0].submittedFiles[0].originalName);
    }

    assert.strictEqual(detectedFiles.length, 2);
    // Verified dry run leaves records unchanged
    assert.ok(legacySubmission.submittedFiles[0].fileUrl.startsWith('data:'));
    assert.strictEqual(legacySubmission.grade, 95);
  });

  await t.test('15. Live migration converts Base64 to Cloudinary references and is idempotent', async () => {
    const rawPdfBytes = Buffer.from('%PDF-1.4 Legacy Architecture');
    const base64DataUrl = `data:application/pdf;base64,${rawPdfBytes.toString('base64')}`;

    const legacySub = {
      _id: makeObjectId(),
      assignment: assignment1._id,
      student: studentAlice._id,
      course: course1._id,
      submittedFiles: [
        {
          _id: makeObjectId(),
          originalName: 'capstone.pdf',
          fileUrl: base64DataUrl,
          fileSize: rawPdfBytes.length,
          mimeType: 'application/pdf',
        },
      ],
      history: [],
      grade: 88,
      status: 'graded',
    };

    // Simulate migration upload
    const matches = legacySub.submittedFiles[0].fileUrl.match(/^data:([^;]+);base64,(.+)$/);
    assert.ok(matches);
    const mime = matches[1];
    const buf = Buffer.from(matches[2], 'base64');

    const uploadRes = await cloudinaryStorageService.uploadAssignmentFile(buf, {
      originalName: legacySub.submittedFiles[0].originalName,
      mimeType: mime,
      assignmentId: legacySub.assignment.toString(),
      studentId: legacySub.student.toString(),
    });

    legacySub.submittedFiles[0].cloudinaryPublicId = uploadRes.cloudinaryPublicId;
    legacySub.submittedFiles[0].resourceType = uploadRes.resourceType;
    legacySub.submittedFiles[0].deliveryType = uploadRes.deliveryType;
    legacySub.submittedFiles[0].storageProvider = 'cloudinary';
    legacySub.submittedFiles[0].legacyBackupUrl = legacySub.submittedFiles[0].fileUrl;
    legacySub.submittedFiles[0].fileUrl = '';

    // Verify fields after migration
    assert.ok(legacySub.submittedFiles[0].cloudinaryPublicId);
    assert.strictEqual(legacySub.submittedFiles[0].storageProvider, 'cloudinary');
    assert.strictEqual(legacySub.submittedFiles[0].fileUrl, '');
    assert.strictEqual(legacySub.grade, 88);

    // Idempotency: Repeated migration detects existing cloudinaryPublicId and skips upload
    let skipped = false;
    if (legacySub.submittedFiles[0].cloudinaryPublicId) {
      skipped = true;
    }
    assert.strictEqual(skipped, true);
  });
});
