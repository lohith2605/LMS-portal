process.env.NODE_ENV = 'test';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const User = require('../models/User');
const ContactMessage = require('../models/ContactMessage');
const { sanitizeUser } = require('../utils/authUtils');
const {
  uploadProfilePicture,
  validateFileSignature,
} = require('../services/cloudinaryStorageService');
const {
  updateProfilePicture,
  deleteProfilePicture,
} = require('../controllers/authController');
const { submitContactMessage } = require('../controllers/contactController');

describe('Profile Picture Management & Contact Endpoints Suite', () => {
  test('1. File signature validator accepts valid JPG/PNG/WebP and rejects fraudulent files', () => {
    // Valid PNG signature: 89 50 4E 47 0D 0A 1A 0A
    const validPng = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
    assert.equal(validateFileSignature(validPng, 'png').valid, true);

    // Valid JPEG signature: FF D8 FF
    const validJpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
    assert.equal(validateFileSignature(validJpeg, 'jpg').valid, true);
    assert.equal(validateFileSignature(validJpeg, 'jpeg').valid, true);

    // Valid WebP signature: RIFF....WEBP
    const validWebp = Buffer.concat([
      Buffer.from('RIFF'),
      Buffer.from([0x00, 0x00, 0x00, 0x1c]),
      Buffer.from('WEBP'),
    ]);
    assert.equal(validateFileSignature(validWebp, 'webp').valid, true);

    // Fraudulent file (claims to be png but is arbitrary text)
    const spoofedFile = Buffer.from('console.log("malicious code");');
    assert.equal(validateFileSignature(spoofedFile, 'png').valid, false);
  });

  test('2. uploadProfilePicture generates cloud mock URL in test mode', async () => {
    const validPng = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
    const result = await uploadProfilePicture(validPng, {
      userId: 'test_user_123',
      originalName: 'avatar.png',
      mimeType: 'image/png',
    });

    assert.ok(result.url);
    assert.ok(result.publicId.startsWith('learnspace/avatars/'));
    assert.equal(result.format, 'png');
  });

  test('3. sanitizeUser returns avatar object or null', () => {
    const rawUserWithAvatar = {
      _id: '507f1f77bcf86cd799439011',
      name: 'Jane Doe',
      email: 'jane@example.com',
      role: 'student',
      avatar: {
        url: 'https://res.cloudinary.com/demo/image/upload/avatar.jpg',
        publicId: 'learnspace/avatars/avatar',
      },
    };

    const sanitizedWithAvatar = sanitizeUser(rawUserWithAvatar);
    assert.equal(sanitizedWithAvatar.avatar.url, 'https://res.cloudinary.com/demo/image/upload/avatar.jpg');

    const rawUserNoAvatar = {
      _id: '507f1f77bcf86cd799439012',
      name: 'John Doe',
      email: 'john@example.com',
      role: 'instructor',
    };

    const sanitizedNoAvatar = sanitizeUser(rawUserNoAvatar);
    assert.equal(sanitizedNoAvatar.avatar, null);
  });

  test('4. updateProfilePicture updates user avatar and deleteProfilePicture resets to default', async () => {
    const originalFindById = User.findById;

    const mockUserDoc = {
      _id: 'user_123',
      name: 'Avatar Tester',
      email: 'avatar_tester@learnspace.io',
      role: 'student',
      avatar: null,
      async save() {
        return this;
      },
    };

    User.findById = (id) => {
      const p = Promise.resolve(mockUserDoc);
      p.select = () => p;
      return p;
    };

    try {
      const validPng = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);

      // Test updateProfilePicture
      const reqUpdate = {
        user: { _id: 'user_123' },
        file: {
          buffer: validPng,
          originalname: 'my-photo.png',
          mimetype: 'image/png',
        },
      };

      let updatedResponse = null;
      const resUpdate = {
        status: (code) => {
          assert.equal(code, 200);
          return {
            json: (data) => {
              updatedResponse = data;
            },
          };
        },
      };

      await updateProfilePicture(reqUpdate, resUpdate);
      assert.ok(updatedResponse.user);
      assert.ok(updatedResponse.user.avatar.url);
      assert.equal(mockUserDoc.avatar.url, updatedResponse.user.avatar.url);

      // Test deleteProfilePicture
      const reqDelete = {
        user: { _id: 'user_123' },
      };

      let deleteResponse = null;
      const resDelete = {
        status: (code) => {
          assert.equal(code, 200);
          return {
            json: (data) => {
              deleteResponse = data;
            },
          };
        },
      };

      await deleteProfilePicture(reqDelete, resDelete);
      assert.ok(deleteResponse.user);
      assert.equal(deleteResponse.user.avatar, null);
      assert.equal(mockUserDoc.avatar.url, null);
    } finally {
      User.findById = originalFindById;
    }
  });

  test('5. submitContactMessage validates required fields and stores message', async () => {
    // Missing fields validation
    let errCode = null;
    let errResponse = null;
    const mockResError = {
      status: (code) => {
        errCode = code;
        return {
          json: (data) => {
            errResponse = data;
          },
        };
      },
    };

    await submitContactMessage({ body: { name: '', email: 'bad' } }, mockResError);
    assert.equal(errCode, 400);

    // Valid contact message submission
    const originalCreate = ContactMessage.create;
    ContactMessage.create = async (doc) => {
      return {
        _id: 'mock_contact_ticket_999',
        ...doc,
      };
    };

    try {
      let successCode = null;
      let successResponse = null;
      const mockResSuccess = {
        status: (code) => {
          successCode = code;
          return {
            json: (data) => {
              successResponse = data;
            },
          };
        },
      };

      const validPayload = {
        body: {
          name: 'Maria Garcia',
          email: 'maria@example.com',
          subject: 'Course Enrollment Question',
          message: 'Hello, I would like to inquire about the syllabus for the machine learning course.',
        },
      };

      await submitContactMessage(validPayload, mockResSuccess);
      assert.equal(successCode, 201);
      assert.ok(successResponse.success);
      assert.equal(successResponse.ticketId, 'mock_contact_ticket_999');
    } finally {
      ContactMessage.create = originalCreate;
    }
  });
});
