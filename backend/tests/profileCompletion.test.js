process.env.NODE_ENV = 'test';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const { calculateProfileCompletion, isValidAvatar } = require('../utils/profileCompletion');
const { updateProfile } = require('../controllers/authController');
const User = require('../models/User');

describe('Profile Completion System Suite', () => {
  test('1. Null or invalid user input returns safe 0% response', () => {
    const resNull = calculateProfileCompletion(null);
    assert.equal(resNull.percentage, 0);
    assert.equal(resNull.completedCount, 0);
    assert.equal(resNull.totalCount, 6);
    assert.equal(resNull.isComplete, false);
    assert.deepEqual(resNull.items, []);

    const resUndefined = calculateProfileCompletion(undefined);
    assert.equal(resUndefined.percentage, 0);
  });

  test('2. New student registration with only name reports 1 of 6 (17%)', () => {
    const newStudent = {
      name: 'Alex Rivera',
      email: 'alex@example.com',
      role: 'student',
    };

    const result = calculateProfileCompletion(newStudent);
    assert.equal(result.role, 'student');
    assert.equal(result.totalCount, 6);
    assert.equal(result.completedCount, 1);
    assert.equal(result.percentage, 17);
    assert.equal(result.isComplete, false);
    assert.equal(result.incompleteItems.length, 5);
    assert.equal(result.suggestedItems.length, 3);

    // Verify first completed item is name
    const nameItem = result.items.find((i) => i.id === 'name');
    assert.equal(nameItem.completed, true);

    // Verify student-specific education field is present
    const eduItem = result.items.find((i) => i.id === 'education');
    assert.ok(eduItem);
    assert.equal(eduItem.completed, false);
  });

  test('3. New instructor registration with only name reports 1 of 6 (17%) with instructor criteria', () => {
    const newInstructor = {
      name: 'Dr. Sarah Connor',
      email: 'sarah@example.com',
      role: 'instructor',
    };

    const result = calculateProfileCompletion(newInstructor);
    assert.equal(result.role, 'instructor');
    assert.equal(result.totalCount, 6);
    assert.equal(result.completedCount, 1);
    assert.equal(result.percentage, 17);
    assert.equal(result.isComplete, false);

    // Verify instructor-specific fields
    const expItem = result.items.find((i) => i.id === 'experience');
    assert.ok(expItem);
    assert.equal(expItem.label, 'Experience & Qualifications');
    assert.equal(expItem.completed, false);

    const bioItem = result.items.find((i) => i.id === 'bio');
    assert.equal(bioItem.label, 'Professional Biography');
  });

  test('4. Partially completed student profile calculates exact percentage and completed count', () => {
    const partialStudent = {
      name: 'Marcus Chen',
      email: 'marcus@example.com',
      role: 'student',
      avatar: { url: 'https://res.cloudinary.com/demo/avatar123.jpg' },
      headline: 'Full-Stack Software Engineering Student',
      skills: ['TypeScript', 'Node.js', 'React'],
      bio: '', // Incomplete
      education: '', // Incomplete
    };

    // 4 completed of 6: name, avatar, headline, skills
    const result = calculateProfileCompletion(partialStudent);
    assert.equal(result.completedCount, 4);
    assert.equal(result.totalCount, 6);
    assert.equal(result.percentage, 67); // Math.round(4/6 * 100) = 67
    assert.equal(result.isComplete, false);
    assert.equal(result.incompleteItems.length, 2);
    assert.equal(result.suggestedItems.length, 2);
    assert.deepEqual(
      result.suggestedItems.map((i) => i.id),
      ['bio', 'education']
    );
  });

  test('5. Fully completed student profile returns 100% and empty suggestions', () => {
    const fullStudent = {
      name: 'Elena Rostova',
      email: 'elena@example.com',
      role: 'student',
      avatar: { url: 'https://res.cloudinary.com/demo/elena.jpg' },
      headline: 'Data Science & Machine Learning Scholar',
      bio: 'Third-year CS student passionate about distributed systems and NLP research.',
      skills: ['Python', 'PyTorch', 'Data Visualization'],
      education: 'B.S. in Computer Science, University of Washington',
    };

    const result = calculateProfileCompletion(fullStudent);
    assert.equal(result.completedCount, 6);
    assert.equal(result.totalCount, 6);
    assert.equal(result.percentage, 100);
    assert.equal(result.isComplete, true);
    assert.equal(result.incompleteItems.length, 0);
    assert.equal(result.suggestedItems.length, 0);
  });

  test('6. Fully completed instructor profile returns 100%', () => {
    const fullInstructor = {
      name: 'Prof. David Krum',
      email: 'david@learnspace.io',
      role: 'instructor',
      avatar: { url: 'https://res.cloudinary.com/demo/david.jpg' },
      headline: 'Principal Architect & University Lecturer',
      bio: 'Leading distributed system design for over 15 years with multiple published IEEE papers.',
      skills: ['Microservices', 'Kubernetes', 'High-Scale Architecture'],
      experience: '15+ years principal architect at FinTech Corp & adjunct professor',
    };

    const result = calculateProfileCompletion(fullInstructor);
    assert.equal(result.completedCount, 6);
    assert.equal(result.totalCount, 6);
    assert.equal(result.percentage, 100);
    assert.equal(result.isComplete, true);
    assert.equal(result.incompleteItems.length, 0);
  });

  test('7. Whitespace-only fields and empty arrays are counted as incomplete', () => {
    const whitespaceUser = {
      name: '  ',
      email: 'whitespace@example.com',
      role: 'student',
      headline: '    ',
      bio: '          ', // 10 spaces
      skills: ['   ', ''],
      education: '  \t  ',
      avatar: { url: '   ' },
    };

    const result = calculateProfileCompletion(whitespaceUser);
    assert.equal(result.completedCount, 0);
    assert.equal(result.percentage, 0);
    assert.equal(result.isComplete, false);
    assert.equal(result.incompleteItems.length, 6);
  });

  test('8. Placeholder avatar URLs are safely rejected as incomplete', () => {
    assert.equal(isValidAvatar({ url: 'https://example.com/placeholder-avatar.png' }), false);
    assert.equal(isValidAvatar({ url: 'https://example.com/default-avatar.jpg' }), false);
    assert.equal(isValidAvatar({ url: 'https://via.placeholder.com/150' }), false);
    assert.equal(isValidAvatar({ url: 'https://res.cloudinary.com/demo/image/upload/v1/user_pic.jpg' }), true);
    assert.equal(isValidAvatar(null), false);
    assert.equal(isValidAvatar(''), false);
  });

  test('9. Legacy user records with missing fields are handled safely', () => {
    const legacyUser = {
      name: 'Old User',
      email: 'old@example.com',
      role: 'student',
      // No headline, bio, skills, education, avatar properties at all
    };

    const result = calculateProfileCompletion(legacyUser);
    assert.equal(result.completedCount, 1);
    assert.equal(result.totalCount, 6);
    assert.equal(result.percentage, 17);
    assert.equal(result.isComplete, false);
  });

  test('10. updateProfile controller updates valid fields and validates input', async () => {
    const originalFindById = User.findById;

    const mockDoc = {
      _id: 'user_999',
      name: 'Original Name',
      email: 'mock@learnspace.io',
      role: 'student',
      headline: '',
      bio: '',
      skills: [],
      education: '',
      experience: '',
      avatar: null,
      async save() {
        return this;
      },
    };

    User.findById = () => Promise.resolve(mockDoc);

    try {
      // Test invalid short name
      const reqBad = {
        user: { id: 'user_999' },
        body: { name: 'A' },
      };
      let badStatusCode = null;
      let badBody = null;
      const resBad = {
        status(c) {
          badStatusCode = c;
          return this;
        },
        json(b) {
          badBody = b;
          return this;
        },
      };

      await updateProfile(reqBad, resBad);
      assert.equal(badStatusCode, 400);
      assert.ok(badBody.error.includes('at least 2 characters'));

      // Test valid update
      const reqValid = {
        user: { id: 'user_999' },
        body: {
          name: 'Updated Name',
          headline: 'Junior Cloud Developer',
          bio: 'Passionate learner aiming for cloud certification.',
          skills: ['AWS', 'Docker', 'Go'],
          education: 'Tech Institute of Technology',
        },
      };

      let successStatusCode = null;
      let successBody = null;
      const resValid = {
        status(c) {
          successStatusCode = c;
          return this;
        },
        json(b) {
          successBody = b;
          return this;
        },
      };

      await updateProfile(reqValid, resValid);
      assert.equal(successStatusCode, 200);
      assert.equal(successBody.user.name, 'Updated Name');
      assert.equal(successBody.user.headline, 'Junior Cloud Developer');
      assert.deepEqual(successBody.user.skills, ['AWS', 'Docker', 'Go']);
      assert.equal(successBody.user.education, 'Tech Institute of Technology');
    } finally {
      User.findById = originalFindById;
    }
  });
});

