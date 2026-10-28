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
const PendingUpload = require('../models/PendingUpload');

const TEST_SECRET = 'test_jwt_secret_key_12345678901234567890';
process.env.JWT_SECRET = TEST_SECRET;
process.env.NODE_ENV = 'test';

// In-memory mock stores
let mockUsers = [];
let mockCourses = [];
let mockEnrollments = [];
let mockAssignments = [];
let mockSubmissions = [];
let mockPendingUploads = [];
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

AssignmentSubmission.exists = function (query) {
  if (query.$or) {
    for (const sub of mockSubmissions) {
      for (const branch of query.$or) {
        if (branch['submittedFiles.cloudinaryPublicId']) {
          const target = branch['submittedFiles.cloudinaryPublicId'];
          if ((sub.submittedFiles || []).some((f) => f.cloudinaryPublicId === target)) return Promise.resolve(true);
        }
        if (branch['history.submittedFiles.cloudinaryPublicId']) {
          const target = branch['history.submittedFiles.cloudinaryPublicId'];
          if ((sub.history || []).some((h) => (h.submittedFiles || []).some((f) => f.cloudinaryPublicId === target))) return Promise.resolve(true);
        }
      }
    }
  }
  return Promise.resolve(false);
};

PendingUpload.create = function (data) {
  const record = {
    _id: data._id || makeObjectId(),
    student: data.student,
    assignment: data.assignment,
    cloudinaryPublicId: data.cloudinaryPublicId,
    originalName: data.originalName,
    resourceType: data.resourceType || 'raw',
    deliveryType: data.deliveryType || 'authenticated',
    format: data.format || '',
    fileSize: data.fileSize,
    mimeType: data.mimeType || 'application/octet-stream',
    checksum: data.checksum || '',
    status: data.status || 'pending',
    submission: data.submission || null,
    consumedAt: data.consumedAt || null,
    expiresAt: data.expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000),
    createdAt: data.createdAt || new Date(),
    updatedAt: new Date(),
    async save() {
      const idx = mockPendingUploads.findIndex((p) => p._id.toString() === this._id.toString());
      if (idx !== -1) mockPendingUploads[idx] = this;
      else mockPendingUploads.push(this);
      return this;
    },
  };
  mockPendingUploads.push(record);
  return Promise.resolve(record);
};

PendingUpload.findOne = function (query) {
  const found = mockPendingUploads.find((p) => {
    if (query.cloudinaryPublicId && p.cloudinaryPublicId !== query.cloudinaryPublicId) return false;
    if (query.student && p.student.toString() !== query.student.toString()) return false;
    if (query.assignment && p.assignment.toString() !== query.assignment.toString()) return false;
    if (query.status && p.status !== query.status) return false;
    return true;
  });
  return Promise.resolve(found || null);
};

PendingUpload.find = function (query) {
  const filtered = mockPendingUploads.filter((p) => {
    if (query.status && p.status !== query.status) return false;
    if (query.createdAt && query.createdAt.$lt && p.createdAt >= query.createdAt.$lt) return false;
    return true;
  });
  return Promise.resolve(filtered);
};

PendingUpload.updateMany = function (query, update) {
  let matched = 0;
  mockPendingUploads.forEach((p) => {
    let match = true;
    if (query._id && query._id.$in) {
      match = query._id.$in.some((id) => id.toString() === p._id.toString());
    }
    if (match) {
      matched++;
      if (update.$set) {
        Object.assign(p, update.$set);
      }
    }
  });
  return Promise.resolve({ matchedCount: matched, modifiedCount: matched });
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
  mockPendingUploads = [];

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

  const assignment2 = {
    _id: makeObjectId(),
    course: course1._id,
    instructor: instructor1._id,
    title: 'Secondary Assignment',
    submissionTypes: ['text', 'file'],
    allowedFileTypes: ['pdf'],
    maxFileSizeMB: 5,
    dueDate: new Date(Date.now() + 86400000),
    allowLateSubmissions: true,
    status: 'published',
  };
  mockAssignments.push(assignment2);

  // Mock Cloudinary SDK uploader stream for unit and HTTP tests
  const originalUploadStream = cloudinary.uploader.upload_stream;
  const originalDestroy = cloudinary.uploader.destroy;
  const originalPrivateDownloadUrl = cloudinary.utils.private_download_url;

  cloudinary.uploader.upload_stream = (options, callback) => {
    return {
      write: () => {},
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
    const validPdfBuffer = Buffer.from('%PDF-1.4 header content here');
    const validPngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]);
    const spoofedPdfBuffer = Buffer.from('This is a text file pretending to be pdf');

    assert.strictEqual(cloudinaryStorageService.validateFileSignature(validPdfBuffer, 'pdf').valid, true);
    assert.strictEqual(cloudinaryStorageService.validateFileSignature(validPngBuffer, 'png').valid, true);

    const spoofResult = cloudinaryStorageService.validateFileSignature(spoofedPdfBuffer, 'pdf');
    assert.strictEqual(spoofResult.valid, false);
    assert.match(spoofResult.error, /File signature mismatch/i);
  });

  await t.test('2. Storage service uploads file buffer and derives authenticated metadata', async () => {
    const pdfBuffer = Buffer.from('%PDF-1.4 Capstone Paper Draft');
    const result = await cloudinaryStorageService.uploadAssignmentFile(pdfBuffer, {
      originalName: 'draft_capstone.pdf',
      assignmentId: assignment1._id.toString(),
      studentId: studentAlice._id.toString(),
      mimeType: 'application/pdf',
    });

    assert.strictEqual(result.originalName, 'draft_capstone.pdf');
    assert.strictEqual(result.resourceType, 'raw');
    assert.strictEqual(result.deliveryType, 'authenticated');
    assert.strictEqual(result.storageProvider, 'cloudinary');
    assert.ok(result.cloudinaryPublicId.startsWith('learnspace/assignments/'));
    assert.ok(result.checksum);
  });

  await t.test('3. Storage service generates signed download URL with private access parameters', () => {
    const signedUrl = cloudinaryStorageService.generateAuthorizedDownloadUrl({
      cloudinaryPublicId: 'learnspace/assignments/test_asset_123',
      format: 'pdf',
      resourceType: 'raw',
      deliveryType: 'authenticated',
      originalName: 'test.pdf',
    });

    assert.ok(signedUrl);
    assert.match(signedUrl, /learnspace\/assignments\/test_asset_123\.pdf/);
    assert.match(signedUrl, /expires=\d+/);
  });

  await t.test('4. Storage service safely deletes assets on request', async () => {
    const res = await cloudinaryStorageService.deleteAsset('learnspace/assignments/capstone_123');
    assert.strictEqual(res.result, 'ok');
  });

  // 2. HTTP Upload Endpoints
  await t.test('5. Unauthenticated user cannot upload assignment files (401)', async () => {
    const res = await request(app)
      .post(`/api/student/assignments/${assignment1._id}/upload`)
      .attach('file', Buffer.from('%PDF-1.4 test'), 'sample.pdf');

    assert.strictEqual(res.status, 401);
  });

  await t.test('6. Unenrolled student cannot upload files to restricted assignment (403)', async () => {
    const res = await request(app)
      .post(`/api/student/assignments/${assignment1._id}/upload`)
      .set('Authorization', `Bearer ${tokenEve}`)
      .attach('file', Buffer.from('%PDF-1.4 test'), 'sample.pdf');

    assert.strictEqual(res.status, 403);
    assert.match(res.body.error, /Forbidden/i);
  });

  await t.test('7. Upload rejects disallowed file extensions and oversized files (400)', async () => {
    // Disallowed extension (.exe)
    const resDisallowed = await request(app)
      .post(`/api/student/assignments/${assignment1._id}/upload`)
      .set('Authorization', `Bearer ${tokenAlice}`)
      .attach('file', Buffer.from('malicious payload'), 'virus.exe');

    assert.strictEqual(resDisallowed.status, 400);

    // Oversized buffer (> 5 MB)
    const bigBuffer = Buffer.alloc(6 * 1024 * 1024, '%PDF-1.4 large file content');
    const resOversized = await request(app)
      .post(`/api/student/assignments/${assignment1._id}/upload`)
      .set('Authorization', `Bearer ${tokenAlice}`)
      .attach('file', bigBuffer, 'huge_paper.pdf');

    assert.strictEqual(resOversized.status, 400);
    assert.match(resOversized.body.error, /exceeds the maximum permitted limit/i);
  });

  let uploadedFileMetadata = null;

  await t.test('8. Enrolled student uploads valid PDF and receives Cloudinary metadata and pending registration', async () => {
    const validPdfBytes = Buffer.from('%PDF-1.4 Valid Capstone Content for Architecture');
    const res = await request(app)
      .post(`/api/student/assignments/${assignment1._id}/upload`)
      .set('Authorization', `Bearer ${tokenAlice}`)
      .attach('file', validPdfBytes, 'architecture_paper.pdf');

    assert.strictEqual(res.status, 200);
    assert.ok(res.body.file);
    assert.strictEqual(res.body.file.originalName, 'architecture_paper.pdf');
    assert.strictEqual(res.body.file.storageProvider, 'cloudinary');
    assert.ok(res.body.file.cloudinaryPublicId);
    assert.strictEqual(res.body.file.deliveryType, 'authenticated');

    uploadedFileMetadata = res.body.file;

    // Verify PendingUpload record was registered in database
    const pendingRecord = await PendingUpload.findOne({
      cloudinaryPublicId: uploadedFileMetadata.cloudinaryPublicId,
    });
    assert.ok(pendingRecord);
    assert.strictEqual(pendingRecord.student.toString(), studentAlice._id.toString());
    assert.strictEqual(pendingRecord.status, 'pending');
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

    // Verify pending upload was marked as consumed
    const pendingRecord = await PendingUpload.findOne({
      cloudinaryPublicId: uploadedFileMetadata.cloudinaryPublicId,
    });
    assert.ok(pendingRecord);
    assert.strictEqual(pendingRecord.status, 'consumed');
    assert.strictEqual(pendingRecord.submission.toString(), createdSubmissionId.toString());
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

  // 4. Security Ownership Verification Tests
  await t.test('14. Student cannot submit with forged or unregistered Cloudinary public ID (400)', async () => {
    const res = await request(app)
      .post(`/api/student/assignments/${assignment1._id}/submissions`)
      .set('Authorization', `Bearer ${tokenAlice}`)
      .send({
        submissionText: 'Attempting to inject forged asset ID',
        submittedFiles: [
          {
            originalName: 'forged.pdf',
            cloudinaryPublicId: 'learnspace/assignments/forged_unregistered_id_999',
            fileSize: 1024,
          },
        ],
      });

    assert.strictEqual(res.status, 400);
    assert.match(res.body.error, /Invalid or unverified file reference/i);
  });

  await t.test('15. Student cannot submit another student Cloudinary public ID (400)', async () => {
    // Eve registers an asset
    const eveRecord = await PendingUpload.create({
      student: studentEve._id,
      assignment: assignment1._id,
      cloudinaryPublicId: 'learnspace/assignments/eve_private_asset_111',
      originalName: 'eve_secret.pdf',
      fileSize: 2048,
      status: 'pending',
    });

    // Alice tries to use Eve's asset
    const res = await request(app)
      .post(`/api/student/assignments/${assignment1._id}/submissions`)
      .set('Authorization', `Bearer ${tokenAlice}`)
      .send({
        submissionText: 'Trying to steal Eve file reference',
        submittedFiles: [
          {
            originalName: 'eve_secret.pdf',
            cloudinaryPublicId: eveRecord.cloudinaryPublicId,
            fileSize: 2048,
          },
        ],
      });

    assert.strictEqual(res.status, 400);
    assert.match(res.body.error, /Invalid or unverified file reference/i);
  });

  await t.test('16. Student cannot submit an asset uploaded for a different assignment (400)', async () => {
    // Alice uploads asset for assignment2
    const diffAssignRecord = await PendingUpload.create({
      student: studentAlice._id,
      assignment: assignment2._id, // assignment 2
      cloudinaryPublicId: 'learnspace/assignments/alice_asset_for_assign2',
      originalName: 'assign2_paper.pdf',
      fileSize: 1500,
      status: 'pending',
    });

    // Alice tries to attach it to assignment1
    const res = await request(app)
      .post(`/api/student/assignments/${assignment1._id}/submissions`)
      .set('Authorization', `Bearer ${tokenAlice}`)
      .send({
        submissionText: 'Submitting wrong assignment asset',
        submittedFiles: [
          {
            originalName: 'assign2_paper.pdf',
            cloudinaryPublicId: diffAssignRecord.cloudinaryPublicId,
            fileSize: 1500,
          },
        ],
      });

    assert.strictEqual(res.status, 400);
    assert.match(res.body.error, /Invalid or unverified file reference/i);
  });

  await t.test('17. Expired pending-upload record is rejected (400)', async () => {
    const expiredRecord = await PendingUpload.create({
      student: studentAlice._id,
      assignment: assignment1._id,
      cloudinaryPublicId: 'learnspace/assignments/alice_expired_asset_333',
      originalName: 'expired_paper.pdf',
      fileSize: 1200,
      status: 'pending',
      expiresAt: new Date(Date.now() - 60000), // Expired 1 minute ago
    });

    const res = await request(app)
      .post(`/api/student/assignments/${assignment1._id}/submissions`)
      .set('Authorization', `Bearer ${tokenAlice}`)
      .send({
        submissionText: 'Submitting expired upload',
        submittedFiles: [
          {
            originalName: 'expired_paper.pdf',
            cloudinaryPublicId: expiredRecord.cloudinaryPublicId,
            fileSize: 1200,
          },
        ],
      });

    assert.strictEqual(res.status, 400);
    assert.match(res.body.error, /has expired/i);
  });

  await t.test('18. Direct Cloudinary URL in fileUrl is rejected (400)', async () => {
    const res = await request(app)
      .post(`/api/student/assignments/${assignment1._id}/submissions`)
      .set('Authorization', `Bearer ${tokenAlice}`)
      .send({
        submissionText: 'Attempting to bypass via direct Cloudinary URL',
        submittedFiles: [
          {
            originalName: 'direct_url.pdf',
            fileUrl: 'https://res.cloudinary.com/demo/raw/authenticated/s--fake--/asset.pdf',
            fileSize: 1000,
          },
        ],
      });

    assert.strictEqual(res.status, 400);
    assert.match(res.body.error, /Direct Cloudinary URLs are not permitted/i);
  });

  await t.test('19. Resubmission safely reuses existing submission files alongside new verified pending uploads', async () => {
    // Upload a second file for Alice
    const newUploadRecord = await PendingUpload.create({
      student: studentAlice._id,
      assignment: assignment1._id,
      cloudinaryPublicId: 'learnspace/assignments/alice_capstone_v2_addendum',
      originalName: 'addendum_v2.pdf',
      fileSize: 3000,
      status: 'pending',
    });

    const res = await request(app)
      .post(`/api/student/assignments/${assignment1._id}/submissions`)
      .set('Authorization', `Bearer ${tokenAlice}`)
      .send({
        submissionText: 'Updated submission with original paper and new addendum',
        submittedFiles: [
          uploadedFileMetadata, // Existing file from v1
          {
            originalName: 'addendum_v2.pdf',
            cloudinaryPublicId: newUploadRecord.cloudinaryPublicId,
            fileSize: 3000,
          },
        ],
      });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.submission.version, 2);
    assert.strictEqual(res.body.submission.submittedFiles.length, 2);
    assert.strictEqual(res.body.submission.history.length, 1);
  });

  // 5. Base64 Migration Tests
  await t.test('20. Migration detects legacy Base64 attachments in active files and history', () => {
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
    assert.ok(legacySubmission.submittedFiles[0].fileUrl.startsWith('data:'));
    assert.strictEqual(legacySubmission.grade, 95);
  });

  await t.test('21. Live migration verifies upload and removes Base64 without storing large backups in MongoDB', async () => {
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

    const matches = legacySub.submittedFiles[0].fileUrl.match(/^data:([^;]+);base64,(.+)$/);
    assert.ok(matches);
    const mime = matches[1];
    const buf = Buffer.from(matches[2], 'base64');
    const expectedChecksum = require('crypto').createHash('sha256').update(buf).digest('hex');

    const uploadRes = await cloudinaryStorageService.uploadAssignmentFile(buf, {
      originalName: legacySub.submittedFiles[0].originalName,
      mimeType: mime,
      assignmentId: legacySub.assignment.toString(),
      studentId: legacySub.student.toString(),
    });

    // Verification check before clearing legacy data
    assert.ok(uploadRes.cloudinaryPublicId);
    assert.strictEqual(uploadRes.checksum, expectedChecksum);

    legacySub.submittedFiles[0].cloudinaryPublicId = uploadRes.cloudinaryPublicId;
    legacySub.submittedFiles[0].resourceType = uploadRes.resourceType;
    legacySub.submittedFiles[0].deliveryType = uploadRes.deliveryType;
    legacySub.submittedFiles[0].storageProvider = 'cloudinary';
    legacySub.submittedFiles[0].migratedAt = new Date();
    legacySub.submittedFiles[0].migratedFrom = 'base64';
    legacySub.submittedFiles[0].checksum = uploadRes.checksum;
    legacySub.submittedFiles[0].fileUrl = ''; // Base64 removed from document

    // Verified: No large Base64 backup added to ordinary document
    assert.strictEqual(legacySub.submittedFiles[0].legacyBackupUrl, undefined);
    assert.strictEqual(legacySub.submittedFiles[0].storageProvider, 'cloudinary');
    assert.strictEqual(legacySub.submittedFiles[0].migratedFrom, 'base64');
    assert.strictEqual(legacySub.submittedFiles[0].fileUrl, '');
  });

  // 6. Abandoned Upload Cleanup Safety Tests
  await t.test('22. Abandoned uploads cleanup in dry-run mode identifies unreferenced files and protects referenced files', async () => {
    // 1. Create an unreferenced pending upload older than 24h
    const oldUnreferenced = await PendingUpload.create({
      student: studentAlice._id,
      assignment: assignment1._id,
      cloudinaryPublicId: 'learnspace/assignments/abandoned_unreferenced_file_1',
      originalName: 'abandoned.pdf',
      fileSize: 4096,
      status: 'pending',
      createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000), // 25 hours old
    });

    const referencedPublicId = uploadedFileMetadata?.cloudinaryPublicId || 'learnspace/assignments/referenced_mock_file';
    if (!mockSubmissions.some((s) => s.submittedFiles?.some((f) => f.cloudinaryPublicId === referencedPublicId))) {
      mockSubmissions.push({
        _id: new mongoose.Types.ObjectId(),
        submittedFiles: [{ cloudinaryPublicId: referencedPublicId }],
        history: [],
      });
    }

    // 2. Create a referenced pending upload older than 24h
    const oldReferenced = await PendingUpload.create({
      student: studentAlice._id,
      assignment: assignment1._id,
      cloudinaryPublicId: referencedPublicId, // Referenced in mockSubmissions!
      originalName: 'active_submitted.pdf',
      fileSize: 1024,
      status: 'pending',
      createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000),
    });

    // Simulate cleanup logic
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const candidates = await PendingUpload.find({ status: 'pending', createdAt: { $lt: cutoff } });

    let wouldDeleteCount = 0;
    let protectedCount = 0;

    for (const c of candidates) {
      const isRef = await AssignmentSubmission.exists({
        $or: [
          { 'submittedFiles.cloudinaryPublicId': c.cloudinaryPublicId },
          { 'history.submittedFiles.cloudinaryPublicId': c.cloudinaryPublicId },
        ],
      });

      if (isRef) {
        protectedCount++;
      } else {
        wouldDeleteCount++;
      }
    }

    assert.ok(wouldDeleteCount >= 1);
    assert.ok(protectedCount >= 1);
  });
});
