const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const mongoose = require('mongoose');
const { app } = require('../server');
const User = require('../models/User');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const Review = require('../models/Review');

const TEST_SECRET = 'test_jwt_secret_testimonials_phase_1234567890';
process.env.JWT_SECRET = TEST_SECRET;
process.env.NODE_ENV = 'test';

let mockUsers = [];
let mockCourses = [];
let mockEnrollments = [];
let mockReviews = [];
let idCounter = 3000;

const makeObjectId = () => {
  const hex = (idCounter++).toString(16).padStart(24, '0');
  return new mongoose.Types.ObjectId(hex);
};

const resetTestDb = () => {
  mockUsers = [];
  mockCourses = [];
  mockEnrollments = [];
  mockReviews = [];
  idCounter = 3000;
};

const createMockUser = (data) => {
  const user = {
    _id: data._id || makeObjectId(),
    name: data.name,
    email: (data.email || 'user@example.com').toLowerCase(),
    role: data.role || 'student',
    accountStatus: data.accountStatus || 'active',
    avatar: data.avatar || null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  mockUsers.push(user);
  return user;
};

const createMockCourse = (data) => {
  const course = {
    _id: data._id || makeObjectId(),
    title: data.title || 'Advanced System Design',
    slug: data.slug || 'advanced-system-design',
    status: data.status || 'published',
    instructor: data.instructor || makeObjectId(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  mockCourses.push(course);
  return course;
};

const createMockReview = (data) => {
  const review = {
    _id: data._id || makeObjectId(),
    course: data.course,
    student: data.student,
    rating: data.rating !== undefined ? data.rating : 5,
    reviewText: data.reviewText !== undefined ? data.reviewText : 'Exceptional course on fullstack systems!',
    moderationStatus: data.moderationStatus || 'approved',
    createdAt: data.createdAt || new Date(),
    updatedAt: new Date(),
  };
  mockReviews.push(review);
  return review;
};

const createMockEnrollment = (data) => {
  const enrollment = {
    _id: data._id || makeObjectId(),
    student: data.student,
    course: data.course,
    status: data.status || 'active',
    isCompleted: data.isCompleted || false,
    completedAt: data.completedAt || null,
  };
  mockEnrollments.push(enrollment);
  return enrollment;
};

// Wire up mock Review.find
Review.find = function (query = {}) {
  let results = mockReviews.filter((r) => {
    if (query.moderationStatus && r.moderationStatus !== query.moderationStatus) return false;
    if (query.course && r.course.toString() !== query.course.toString()) return false;
    return true;
  });

  const queryObj = {
    populate: () => queryObj,
    sort: (sortCriteria) => {
      results = [...results].sort((a, b) => {
        if (sortCriteria.rating !== undefined) {
          if (a.rating !== b.rating) {
            return sortCriteria.rating === 1 ? a.rating - b.rating : b.rating - a.rating;
          }
        }
        if (sortCriteria.createdAt !== undefined) {
          return sortCriteria.createdAt === 1
            ? new Date(a.createdAt) - new Date(b.createdAt)
            : new Date(b.createdAt) - new Date(a.createdAt);
        }
        return 0;
      });
      return queryObj;
    },
    skip: (skipCount) => {
      results = results.slice(skipCount);
      return queryObj;
    },
    limit: (limitCount) => {
      results = results.slice(0, limitCount);
      return queryObj;
    },
    lean: () => {
      const populated = results.map((rev) => {
        const studentUser = mockUsers.find((u) => u._id.toString() === rev.student.toString());
        const courseDoc = mockCourses.find((c) => c._id.toString() === rev.course.toString());
        return {
          ...rev,
          student: studentUser
            ? {
                _id: studentUser._id,
                name: studentUser.name,
                avatar: studentUser.avatar,
                role: studentUser.role,
                email: studentUser.email, // Deliberately include in raw mock to verify service strips it
              }
            : null,
          course: courseDoc
            ? {
                _id: courseDoc._id,
                title: courseDoc.title,
                slug: courseDoc.slug,
                status: courseDoc.status,
              }
            : null,
        };
      });
      return Promise.resolve(populated);
    },
  };

  return queryObj;
};

// Wire up mock Enrollment.find
Enrollment.find = function (query = {}) {
  let results = [...mockEnrollments];
  if (query.student && query.student.$in) {
    const sIds = query.student.$in.map((id) => id.toString());
    results = results.filter((e) => sIds.includes(e.student.toString()));
  }
  if (query.course && query.course.$in) {
    const cIds = query.course.$in.map((id) => id.toString());
    results = results.filter((e) => cIds.includes(e.course.toString()));
  }
  const enrollObj = {
    select: () => enrollObj,
    lean: () => Promise.resolve(results),
  };
  return enrollObj;
};

test('Public Testimonials API Suite', async (t) => {
  t.beforeEach(() => {
    resetTestDb();
  });

  await t.test('1. Returns empty list when no reviews exist in database', async () => {
    const res = await request(app).get('/api/reviews/testimonials');
    assert.strictEqual(res.status, 200);
    assert.deepStrictEqual(res.body.testimonials, []);
    assert.strictEqual(res.body.total, 0);
  });

  await t.test('2. Returns only approved reviews with non-empty review text', async () => {
    const student1 = createMockUser({ name: 'Maria Silva', email: 'maria@example.com' });
    const student2 = createMockUser({ name: 'David Kim', email: 'david@example.com' });
    const student3 = createMockUser({ name: 'Spam User', email: 'spam@example.com' });
    const student4 = createMockUser({ name: 'Silent User', email: 'silent@example.com' });

    const course = createMockCourse({ title: 'Distributed Cloud Architecture', slug: 'cloud-architecture' });

    // 1 approved with text
    createMockReview({
      student: student1._id,
      course: course._id,
      rating: 5,
      reviewText: 'Incredible depth! The microservices module was worth every penny.',
      moderationStatus: 'approved',
    });

    // 1 approved with text
    createMockReview({
      student: student2._id,
      course: course._id,
      rating: 4,
      reviewText: 'Great instructor feedback and solid hands-on labs.',
      moderationStatus: 'approved',
    });

    // 1 hidden review (should be excluded)
    createMockReview({
      student: student3._id,
      course: course._id,
      rating: 1,
      reviewText: 'Inappropriate spam text here.',
      moderationStatus: 'hidden',
    });

    // 1 approved review with EMPTY text (rating only, should be excluded from testimonials)
    createMockReview({
      student: student4._id,
      course: course._id,
      rating: 5,
      reviewText: '',
      moderationStatus: 'approved',
    });

    const res = await request(app).get('/api/reviews/testimonials');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.testimonials.length, 2);
    assert.strictEqual(res.body.total, 2);
    assert.strictEqual(res.body.testimonials[0].student.name, 'Maria Silva');
    assert.strictEqual(res.body.testimonials[1].student.name, 'David Kim');
  });

  await t.test('3. Protects personal information: strips email, password, and private metadata', async () => {
    const student = createMockUser({
      name: 'Elena Rostova',
      email: 'elena.private@secret.com',
      avatar: { url: 'https://res.cloudinary.com/demo/image/upload/sample.jpg', publicId: 'test' },
    });
    const course = createMockCourse({ title: 'AI & Deep Learning Foundations', slug: 'ai-foundations' });

    createMockReview({
      student: student._id,
      course: course._id,
      rating: 5,
      reviewText: 'Outstanding coverage of transformers and fine-tuning!',
      moderationStatus: 'approved',
    });

    createMockEnrollment({
      student: student._id,
      course: course._id,
      status: 'completed',
      isCompleted: true,
    });

    const res = await request(app).get('/api/reviews/testimonials');
    assert.strictEqual(res.status, 200);
    const item = res.body.testimonials[0];

    // Verify public display fields
    assert.strictEqual(item.student.name, 'Elena Rostova');
    assert.strictEqual(item.student.avatar.url, 'https://res.cloudinary.com/demo/image/upload/sample.jpg');
    assert.strictEqual(item.student.role, 'Student');
    assert.strictEqual(item.student.isCourseCompleted, true);
    assert.strictEqual(item.course.title, 'AI & Deep Learning Foundations');
    assert.strictEqual(item.course.slug, 'ai-foundations');

    // Verify sensitive private fields are NOT present
    assert.strictEqual(item.student.email, undefined);
    assert.strictEqual(item.student.password, undefined);
    assert.strictEqual(item.moderatedBy, undefined);
    assert.strictEqual(item.moderationReason, undefined);
  });

  await t.test('4. Correctly flags isCourseCompleted based on Enrollment records', async () => {
    const graduateStudent = createMockUser({ name: 'Graduate Grace' });
    const activeStudent = createMockUser({ name: 'Active Andy' });
    const course = createMockCourse({ title: 'Fullstack Mastery', slug: 'fullstack-mastery' });

    createMockReview({
      student: graduateStudent._id,
      course: course._id,
      rating: 5,
      reviewText: 'Finished all projects and passed the capstone!',
      moderationStatus: 'approved',
    });

    createMockReview({
      student: activeStudent._id,
      course: course._id,
      rating: 5,
      reviewText: 'Halfway through and learning so much practical code.',
      moderationStatus: 'approved',
    });

    createMockEnrollment({
      student: graduateStudent._id,
      course: course._id,
      status: 'completed',
      isCompleted: true,
    });

    createMockEnrollment({
      student: activeStudent._id,
      course: course._id,
      status: 'active',
      isCompleted: false,
    });

    const res = await request(app).get('/api/reviews/testimonials');
    assert.strictEqual(res.status, 200);

    const grad = res.body.testimonials.find((t) => t.student.name === 'Graduate Grace');
    const act = res.body.testimonials.find((t) => t.student.name === 'Active Andy');

    assert.strictEqual(grad.student.isCourseCompleted, true);
    assert.strictEqual(act.student.isCourseCompleted, false);
  });

  await t.test('5. Respects limit parameter and enforces bounds', async () => {
    const course = createMockCourse({ title: 'DevOps & Docker', slug: 'devops-docker' });

    for (let i = 1; i <= 6; i++) {
      const student = createMockUser({ name: `Learner ${i}` });
      createMockReview({
        student: student._id,
        course: course._id,
        rating: 5,
        reviewText: `Insightful feedback from week ${i}. Highly recommended!`,
        moderationStatus: 'approved',
      });
    }

    const resLimit2 = await request(app).get('/api/reviews/testimonials?limit=2');
    assert.strictEqual(resLimit2.status, 200);
    assert.strictEqual(resLimit2.body.testimonials.length, 2);

    const resLimit50 = await request(app).get('/api/reviews/testimonials?limit=50');
    assert.strictEqual(resLimit50.status, 200);
    assert.strictEqual(resLimit50.body.testimonials.length, 6); // Max 6 exist, bounded at 20 max
  });

  await t.test('6. Alias GET /api/courses/testimonials also works and returns identical structure', async () => {
    const student = createMockUser({ name: 'Jordan Lee' });
    const course = createMockCourse({ title: 'Kubernetes in Action', slug: 'kubernetes-action' });

    createMockReview({
      student: student._id,
      course: course._id,
      rating: 5,
      reviewText: 'Clear and well-paced Kubernetes deployment explanations.',
      moderationStatus: 'approved',
    });

    const res = await request(app).get('/api/courses/testimonials');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.testimonials.length, 1);
    assert.strictEqual(res.body.testimonials[0].student.name, 'Jordan Lee');
  });
});

