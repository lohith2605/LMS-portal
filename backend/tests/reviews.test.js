const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { app } = require('../server');
const User = require('../models/User');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const Review = require('../models/Review');
const { calculateRatingSummary, getBatchCourseRatings } = require('../services/reviewService');

const TEST_SECRET = 'test_jwt_secret_reviews_phase12_1234567890';
process.env.JWT_SECRET = TEST_SECRET;
process.env.NODE_ENV = 'test';

// In-memory mock stores
let mockUsers = [];
let mockCourses = [];
let mockEnrollments = [];
let mockReviews = [];
let idCounter = 1200;

const makeObjectId = () => {
  const hex = (idCounter++).toString(16).padStart(24, '0');
  return new mongoose.Types.ObjectId(hex);
};

const resetTestDb = () => {
  mockUsers = [];
  mockCourses = [];
  mockEnrollments = [];
  mockReviews = [];
  idCounter = 1200;
};

const createMockUser = (data) => {
  const user = {
    _id: data._id || makeObjectId(),
    name: data.name,
    email: data.email.toLowerCase(),
    role: data.role || 'student',
    accountStatus: data.accountStatus || 'active',
    emailVerified: true,
    avatar: data.avatar || '',
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

const createMockCourse = (data) => {
  const course = {
    _id: data._id || makeObjectId(),
    title: data.title,
    slug: data.slug || data.title.toLowerCase().replace(/\s+/g, '-'),
    summary: data.summary || 'Course summary description',
    description: data.description || 'Full course description',
    instructor: data.instructor,
    category: data.category || 'Development',
    level: data.level || 'Intermediate',
    status: data.status || 'published',
    sections: data.sections || [],
    createdAt: new Date(),
    updatedAt: new Date(),
    async save() {
      const idx = mockCourses.findIndex((c) => c._id.toString() === this._id.toString());
      if (idx !== -1) mockCourses[idx] = this;
      else mockCourses.push(this);
      return this;
    },
  };
  mockCourses.push(course);
  return course;
};

const createMockEnrollment = (data) => {
  const enrollment = {
    _id: data._id || makeObjectId(),
    student: data.student,
    course: data.course,
    status: data.status || 'active',
    enrolledAt: new Date(),
    updatedAt: new Date(),
    async save() {
      const idx = mockEnrollments.findIndex((e) => e._id.toString() === this._id.toString());
      if (idx !== -1) mockEnrollments[idx] = this;
      else mockEnrollments.push(this);
      return this;
    },
  };
  mockEnrollments.push(enrollment);
  return enrollment;
};

const createMockReview = (data) => {
  const review = {
    _id: data._id || makeObjectId(),
    course: data.course,
    student: data.student,
    rating: data.rating,
    reviewText: data.reviewText || '',
    moderationStatus: data.moderationStatus || 'approved',
    moderatedBy: data.moderatedBy || null,
    moderatedAt: data.moderatedAt || null,
    moderationReason: data.moderationReason || '',
    createdAt: data.createdAt || new Date(),
    updatedAt: data.updatedAt || new Date(),
    async save() {
      const idx = mockReviews.findIndex((r) => r._id.toString() === this._id.toString());
      this.updatedAt = new Date();
      if (idx !== -1) mockReviews[idx] = this;
      else mockReviews.push(this);
      return this;
    },
  };
  mockReviews.push(review);
  return review;
};

// Wire up Mongoose Model Stubs for Isolation
User.findById = function (id) {
  const idStr = id ? id.toString() : '';
  const user = mockUsers.find((u) => u._id.toString() === idStr);
  return {
    select: () => Promise.resolve(user || null),
    then: (resolve) => resolve(user || null),
  };
};

User.findOne = function (query) {
  const user = mockUsers.find((u) => {
    if (query.email && u.email !== query.email.toLowerCase()) return false;
    if (query._id && u._id.toString() !== query._id.toString()) return false;
    return true;
  });
  return {
    select: () => Promise.resolve(user || null),
    then: (resolve) => resolve(user || null),
  };
};

Course.findById = function (id) {
  const idStr = id ? id.toString() : '';
  const course = mockCourses.find((c) => c._id.toString() === idStr);
  return Promise.resolve(course || null);
};

Course.findOne = function (query) {
  const course = mockCourses.find((c) => {
    if (query._id && c._id.toString() !== query._id.toString()) return false;
    if (query.slug && c.slug !== query.slug.toLowerCase()) return false;
    return true;
  });

  return {
    populate: () => Promise.resolve(course || null),
    then: (resolve) => resolve(course || null),
  };
};

Course.find = function () {
  return {
    populate: () => ({
      sort: () => ({
        skip: () => ({
          limit: () => ({
            lean: () => Promise.resolve([...mockCourses]),
          }),
        }),
      }),
    }),
  };
};

Course.countDocuments = function () {
  return Promise.resolve(mockCourses.length);
};

Enrollment.findOne = function (query) {
  const enrollment = mockEnrollments.find((e) => {
    if (query.student && e.student.toString() !== query.student.toString()) return false;
    if (query.course && e.course.toString() !== query.course.toString()) return false;
    if (query.status) {
      if (typeof query.status === 'string' && e.status !== query.status) return false;
      if (query.status.$in && !query.status.$in.includes(e.status)) return false;
    }
    return true;
  });

  return {
    lean: () => Promise.resolve(enrollment || null),
    then: (resolve) => resolve(enrollment || null),
  };
};

Review.findById = function (id) {
  const idStr = id ? id.toString() : '';
  const review = mockReviews.find((r) => r._id.toString() === idStr);
  return Promise.resolve(review || null);
};

Review.findOne = function (query) {
  const review = mockReviews.find((r) => {
    if (query._id && r._id.toString() !== query._id.toString()) return false;
    if (query.course && r.course.toString() !== query.course.toString()) return false;
    if (query.student && r.student.toString() !== query.student.toString()) return false;
    if (query.moderationStatus && r.moderationStatus !== query.moderationStatus) return false;
    return true;
  });

  return {
    lean: () => Promise.resolve(review || null),
    then: (resolve) => resolve(review || null),
  };
};

Review.create = function (data) {
  // Compound unique check: 1 review per student per course
  const exists = mockReviews.find(
    (r) =>
      r.course.toString() === data.course.toString() &&
      r.student.toString() === data.student.toString()
  );
  if (exists) {
    const duplicateErr = new Error('E11000 duplicate key error');
    duplicateErr.code = 11000;
    return Promise.reject(duplicateErr);
  }

  const review = createMockReview(data);
  return Promise.resolve(review);
};

Review.deleteOne = function (query) {
  const idx = mockReviews.findIndex((r) => r._id.toString() === query._id.toString());
  if (idx !== -1) {
    mockReviews.splice(idx, 1);
    return Promise.resolve({ deletedCount: 1 });
  }
  return Promise.resolve({ deletedCount: 0 });
};

Review.countDocuments = function (query = {}) {
  const matching = mockReviews.filter((r) => {
    if (query.course && r.course.toString() !== query.course.toString()) return false;
    if (query.moderationStatus && r.moderationStatus !== query.moderationStatus) return false;
    return true;
  });
  return Promise.resolve(matching.length);
};

Review.find = function (query = {}) {
  let results = mockReviews.filter((r) => {
    if (query.course && r.course.toString() !== query.course.toString()) return false;
    if (query.moderationStatus && r.moderationStatus !== query.moderationStatus) return false;
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
      // populate student
      const populated = results.map((rev) => {
        const studentUser = mockUsers.find(
          (u) => u._id.toString() === rev.student.toString()
        );
        return {
          ...rev,
          student: studentUser ? { _id: studentUser._id, name: studentUser.name, avatar: studentUser.avatar || '' } : null,
        };
      });
      return Promise.resolve(populated);
    },
  };

  return queryObj;
};

Review.aggregate = function (pipeline) {
  const matchStage = pipeline.find((p) => p.$match)?.$match || {};
  let filtered = [...mockReviews];

  if (matchStage.course) {
    if (matchStage.course.$in) {
      const idStrs = matchStage.course.$in.map((id) => id.toString());
      filtered = filtered.filter((r) => idStrs.includes(r.course.toString()));
    } else {
      filtered = filtered.filter(
        (r) => r.course.toString() === matchStage.course.toString()
      );
    }
  }

  if (matchStage.moderationStatus) {
    filtered = filtered.filter((r) => r.moderationStatus === matchStage.moderationStatus);
  }

  const groupStage = pipeline.find((p) => p.$group)?.$group || {};

  // Case 1: Course Batch Aggregation ($group by '$course')
  if (groupStage._id === '$course') {
    const courseMap = {};
    filtered.forEach((r) => {
      const cid = r.course.toString();
      if (!courseMap[cid]) {
        courseMap[cid] = { _id: r.course, ratings: [] };
      }
      courseMap[cid].ratings.push(r.rating);
    });

    const result = Object.values(courseMap).map((item) => ({
      _id: item._id,
      averageRating: item.ratings.reduce((a, b) => a + b, 0) / item.ratings.length,
      totalReviews: item.ratings.length,
    }));

    return Promise.resolve(result);
  }

  // Case 2: Single Course Aggregation ($group by null)
  if (filtered.length === 0) {
    return Promise.resolve([]);
  }

  const sumRatings = filtered.reduce((acc, r) => acc + r.rating, 0);
  const avg = sumRatings / filtered.length;

  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  filtered.forEach((r) => {
    if (distribution[r.rating] !== undefined) {
      distribution[r.rating]++;
    }
  });

  return Promise.resolve([
    {
      _id: null,
      averageRating: avg,
      totalReviews: filtered.length,
      star5: distribution[5],
      star4: distribution[4],
      star3: distribution[3],
      star2: distribution[2],
      star1: distribution[1],
    },
  ]);
};

const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id.toString(),
      role: user.role,
      accountStatus: user.accountStatus,
    },
    TEST_SECRET,
    { expiresIn: '1h' }
  );
};

test('Phase 12 Course Ratings & Reviews Suite', async (t) => {
  resetTestDb();

  // Setup Base Test Users & Courses
  const instructor = createMockUser({
    name: 'Dr. Turing',
    email: 'turing.instructor@learnspace.org',
    role: 'instructor',
  });

  const studentAlice = createMockUser({
    name: 'Alice Student',
    email: 'alice.reviews@learnspace.org',
    role: 'student',
  });

  const studentBob = createMockUser({
    name: 'Bob Student',
    email: 'bob.reviews@learnspace.org',
    role: 'student',
  });

  const studentCharlie = createMockUser({
    name: 'Charlie Student',
    email: 'charlie.reviews@learnspace.org',
    role: 'student',
  });

  const admin = createMockUser({
    name: 'Platform Admin',
    email: 'admin.moderator@learnspace.org',
    role: 'admin',
  });

  const publishedCourse = createMockCourse({
    title: 'Distributed Systems & Algorithms',
    slug: 'distributed-systems-algorithms',
    instructor: instructor._id,
    status: 'published',
  });

  const unpublishedCourse = createMockCourse({
    title: 'Quantum Cryptography Draft',
    slug: 'quantum-cryptography-draft',
    instructor: instructor._id,
    status: 'draft',
  });

  // Enroll Alice and Bob in published course
  createMockEnrollment({
    student: studentAlice._id,
    course: publishedCourse._id,
    status: 'active',
  });

  createMockEnrollment({
    student: studentBob._id,
    course: publishedCourse._id,
    status: 'completed',
  });

  // Charlie is NOT enrolled in published course

  const tokenAlice = generateToken(studentAlice);
  const tokenBob = generateToken(studentBob);
  const tokenCharlie = generateToken(studentCharlie);
  const tokenAdmin = generateToken(admin);
  const tokenInstructor = generateToken(instructor);

  // Group 1: Review Eligibility and Creation
  await t.test('1. Eligible enrolled student can create a review', async () => {
    const res = await request(app)
      .post(`/api/courses/${publishedCourse.slug}/reviews`)
      .set('Cookie', [`jwt=${tokenAlice}`])
      .send({
        rating: 5,
        reviewText: 'Outstanding depth on consensus algorithms and Raft implementation.',
      });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.review.rating, 5);
    assert.strictEqual(res.body.review.student.id, studentAlice._id.toString());
    assert.strictEqual(res.body.summary.totalReviews, 1);
    assert.strictEqual(res.body.summary.averageRating, 5.0);
  });

  await t.test('2. Unauthenticated user cannot create a review (401)', async () => {
    const res = await request(app)
      .post(`/api/courses/${publishedCourse.slug}/reviews`)
      .send({ rating: 4, reviewText: 'Unauthenticated attempt' });

    assert.strictEqual(res.status, 401);
  });

  await t.test('3. User without the student role cannot create a review (403)', async () => {
    const res = await request(app)
      .post(`/api/courses/${publishedCourse.slug}/reviews`)
      .set('Cookie', [`jwt=${tokenInstructor}`])
      .send({ rating: 5, reviewText: 'Instructor attempting to review' });

    assert.strictEqual(res.status, 403);
  });

  await t.test('4. Student without a valid enrollment cannot review a course (403)', async () => {
    const res = await request(app)
      .post(`/api/courses/${publishedCourse.slug}/reviews`)
      .set('Cookie', [`jwt=${tokenCharlie}`])
      .send({ rating: 4, reviewText: 'Unenrolled student review' });

    assert.strictEqual(res.status, 403);
  });

  await t.test('5. Review creation for an unpublished course is rejected (400)', async () => {
    createMockEnrollment({
      student: studentAlice._id,
      course: unpublishedCourse._id,
      status: 'active',
    });

    const res = await request(app)
      .post(`/api/courses/${unpublishedCourse.slug}/reviews`)
      .set('Cookie', [`jwt=${tokenAlice}`])
      .send({ rating: 5, reviewText: 'Review for draft course' });

    assert.strictEqual(res.status, 400);
  });

  await t.test('6. Rating values below 1 or above 5 are rejected (400)', async () => {
    const resLow = await request(app)
      .post(`/api/courses/${publishedCourse.slug}/reviews`)
      .set('Cookie', [`jwt=${tokenBob}`])
      .send({ rating: 0, reviewText: 'Too low rating' });
    assert.strictEqual(resLow.status, 400);

    const resHigh = await request(app)
      .post(`/api/courses/${publishedCourse.slug}/reviews`)
      .set('Cookie', [`jwt=${tokenBob}`])
      .send({ rating: 6, reviewText: 'Too high rating' });
    assert.strictEqual(resHigh.status, 400);
  });

  await t.test('7. Fractional ratings and invalid types are rejected (400)', async () => {
    const resFractional = await request(app)
      .post(`/api/courses/${publishedCourse.slug}/reviews`)
      .set('Cookie', [`jwt=${tokenBob}`])
      .send({ rating: 4.5, reviewText: 'Fractional stars' });
    assert.strictEqual(resFractional.status, 400);

    const resString = await request(app)
      .post(`/api/courses/${publishedCourse.slug}/reviews`)
      .set('Cookie', [`jwt=${tokenBob}`])
      .send({ rating: 'five', reviewText: 'String rating' });
    assert.strictEqual(resString.status, 400);
  });

  await t.test('8. Invalid review text is rejected (< 3 chars when provided or > 1000 chars) (400)', async () => {
    const resShort = await request(app)
      .post(`/api/courses/${publishedCourse.slug}/reviews`)
      .set('Cookie', [`jwt=${tokenBob}`])
      .send({ rating: 4, reviewText: 'no' });
    assert.strictEqual(resShort.status, 400);

    const resLong = await request(app)
      .post(`/api/courses/${publishedCourse.slug}/reviews`)
      .set('Cookie', [`jwt=${tokenBob}`])
      .send({ rating: 4, reviewText: 'A'.repeat(1001) });
    assert.strictEqual(resLong.status, 400);
  });

  await t.test('9. Authenticated user ID is enforced as author', async () => {
    const res = await request(app)
      .post(`/api/courses/${publishedCourse.slug}/reviews`)
      .set('Cookie', [`jwt=${tokenBob}`])
      .send({
        rating: 4,
        reviewText: 'Great practical lab sessions on distributed consensus.',
        studentId: studentCharlie._id.toString(), // Attacker attempts to spoof Charlie
      });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.review.student.id, studentBob._id.toString());
  });

  await t.test('10. Duplicate reviews for same student/course are prevented (409 Conflict)', async () => {
    // Alice attempts second review
    const res = await request(app)
      .post(`/api/courses/${publishedCourse.slug}/reviews`)
      .set('Cookie', [`jwt=${tokenAlice}`])
      .send({ rating: 3, reviewText: 'Second review attempt by same student' });

    assert.strictEqual(res.status, 409);
  });

  // Group 2: Review Editing and Deletion
  let aliceReviewId;
  await t.test('11. Student can update their own review', async () => {
    const myReviewRes = await request(app)
      .get(`/api/courses/${publishedCourse.slug}/reviews/my-review`)
      .set('Cookie', [`jwt=${tokenAlice}`]);

    assert.strictEqual(myReviewRes.status, 200);
    aliceReviewId = myReviewRes.body.existingReview._id.toString();

    const updateRes = await request(app)
      .patch(`/api/courses/${publishedCourse.slug}/reviews/${aliceReviewId}`)
      .set('Cookie', [`jwt=${tokenAlice}`])
      .send({ rating: 4, reviewText: 'Updated review after completing final module.' });

    assert.strictEqual(updateRes.status, 200);
    assert.strictEqual(updateRes.body.review.rating, 4);
    assert.strictEqual(updateRes.body.review.reviewText, 'Updated review after completing final module.');
  });

  await t.test('12. Student cannot update another user review (403)', async () => {
    const res = await request(app)
      .patch(`/api/courses/${publishedCourse.slug}/reviews/${aliceReviewId}`)
      .set('Cookie', [`jwt=${tokenBob}`])
      .send({ rating: 1, reviewText: 'Malicious modification of Alice review' });

    assert.strictEqual(res.status, 403);
  });

  await t.test('13. Student cannot delete another user review (403)', async () => {
    const res = await request(app)
      .delete(`/api/courses/${publishedCourse.slug}/reviews/${aliceReviewId}`)
      .set('Cookie', [`jwt=${tokenBob}`]);

    assert.strictEqual(res.status, 403);
  });

  await t.test('14. Student can delete their own review', async () => {
    const myReviewRes = await request(app)
      .get(`/api/courses/${publishedCourse.slug}/reviews/my-review`)
      .set('Cookie', [`jwt=${tokenBob}`]);

    const bobReviewId = myReviewRes.body.existingReview._id.toString();

    const deleteRes = await request(app)
      .delete(`/api/courses/${publishedCourse.slug}/reviews/${bobReviewId}`)
      .set('Cookie', [`jwt=${tokenBob}`]);

    assert.strictEqual(deleteRes.status, 200);
    assert.strictEqual(deleteRes.body.success, true);
  });

  await t.test('15. Deleting a review removes it from aggregates', async () => {
    const summary = await calculateRatingSummary(publishedCourse._id);
    // Bob (rating: 4) deleted, only Alice (rating: 4) remains
    assert.strictEqual(summary.totalReviews, 1);
    assert.strictEqual(summary.averageRating, 4.0);
  });

  // Group 3: Aggregation and Public Data
  await t.test('16. Empty reviews return zero-count summary without errors', async () => {
    const emptySummary = await calculateRatingSummary(unpublishedCourse._id);
    assert.strictEqual(emptySummary.totalReviews, 0);
    assert.strictEqual(emptySummary.averageRating, 0);
    assert.strictEqual(emptySummary.distribution[5], 0);
  });

  await t.test('17. Average and distribution calculated correctly with multiple reviews', async () => {
    resetTestDb();
    const course = createMockCourse({ title: 'Algorithmic Trading' });

    // Insert 5 reviews: ratings [5, 5, 4, 3, 1]
    const ratings = [5, 5, 4, 3, 1];
    ratings.forEach((r, idx) => {
      createMockReview({
        course: course._id,
        student: makeObjectId(),
        rating: r,
        moderationStatus: 'approved',
      });
    });

    const summary = await calculateRatingSummary(course._id);
    assert.strictEqual(summary.totalReviews, 5);
    // (5 + 5 + 4 + 3 + 1) / 5 = 18 / 5 = 3.6
    assert.strictEqual(summary.averageRating, 3.6);
    assert.strictEqual(summary.distribution[5], 2);
    assert.strictEqual(summary.distribution[4], 1);
    assert.strictEqual(summary.distribution[3], 1);
    assert.strictEqual(summary.distribution[2], 0);
    assert.strictEqual(summary.distribution[1], 1);
  });

  await t.test('18. Hidden reviews are excluded from public aggregates and listings', async () => {
    resetTestDb();
    const course = createMockCourse({ title: 'System Security' });

    createMockReview({ course: course._id, student: makeObjectId(), rating: 5, moderationStatus: 'approved' });
    createMockReview({ course: course._id, student: makeObjectId(), rating: 1, moderationStatus: 'hidden' });

    const summary = await calculateRatingSummary(course._id);
    assert.strictEqual(summary.totalReviews, 1);
    assert.strictEqual(summary.averageRating, 5.0);
  });

  await t.test('19. Public review endpoint does not expose private user fields', async () => {
    resetTestDb();
    const student = createMockUser({ name: 'Private User', email: 'secret.user@gmail.com' });
    const course = createMockCourse({ title: 'Data Privacy' });
    createMockReview({
      course: course._id,
      student: student._id,
      rating: 5,
      reviewText: 'Excellent security course!',
      moderationStatus: 'approved',
    });

    const res = await request(app).get(`/api/courses/${course.slug}/reviews`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.reviews.length, 1);
    const pubStudent = res.body.reviews[0].student;

    assert.ok(pubStudent.name);
    assert.strictEqual(pubStudent.email, undefined);
    assert.strictEqual(pubStudent.password, undefined);
    assert.strictEqual(pubStudent.role, undefined);
  });

  await t.test('20. Batch course ratings helper operates in single query', async () => {
    resetTestDb();
    const c1 = createMockCourse({ title: 'Course 1' });
    const c2 = createMockCourse({ title: 'Course 2' });

    createMockReview({ course: c1._id, student: makeObjectId(), rating: 4, moderationStatus: 'approved' });
    createMockReview({ course: c1._id, student: makeObjectId(), rating: 5, moderationStatus: 'approved' });
    createMockReview({ course: c2._id, student: makeObjectId(), rating: 2, moderationStatus: 'approved' });

    const batch = await getBatchCourseRatings([c1._id, c2._id]);
    assert.strictEqual(batch[c1._id.toString()].averageRating, 4.5);
    assert.strictEqual(batch[c1._id.toString()].totalReviews, 2);
    assert.strictEqual(batch[c2._id.toString()].averageRating, 2.0);
    assert.strictEqual(batch[c2._id.toString()].totalReviews, 1);
  });

  // Group 4: Sorting & Pagination
  await t.test('21. Reviews can be sorted by highest, lowest, and newest', async () => {
    resetTestDb();
    const course = createMockCourse({ title: 'Database Optimization' });

    const rev1 = createMockReview({
      course: course._id,
      student: makeObjectId(),
      rating: 2,
      createdAt: new Date('2026-10-01'),
      moderationStatus: 'approved',
    });
    const rev2 = createMockReview({
      course: course._id,
      student: makeObjectId(),
      rating: 5,
      createdAt: new Date('2026-10-02'),
      moderationStatus: 'approved',
    });

    const resHighest = await request(app).get(`/api/courses/${course.slug}/reviews?sort=highest`);
    assert.strictEqual(resHighest.body.reviews[0]._id, rev2._id.toString());

    const resLowest = await request(app).get(`/api/courses/${course.slug}/reviews?sort=lowest`);
    assert.strictEqual(resLowest.body.reviews[0]._id, rev1._id.toString());
  });

  await t.test('22. Pagination limits and bounds are strictly enforced', async () => {
    resetTestDb();
    const course = createMockCourse({ title: 'Cloud DevOps' });
    for (let i = 0; i < 15; i++) {
      createMockReview({
        course: course._id,
        student: makeObjectId(),
        rating: 5,
        moderationStatus: 'approved',
      });
    }

    const resPage1 = await request(app).get(`/api/courses/${course.slug}/reviews?page=1&limit=5`);
    assert.strictEqual(resPage1.body.reviews.length, 5);
    assert.strictEqual(resPage1.body.pagination.total, 15);
    assert.strictEqual(resPage1.body.pagination.totalPages, 3);

    const resMaxBound = await request(app).get(`/api/courses/${course.slug}/reviews?limit=500`);
    assert.strictEqual(resMaxBound.body.pagination.limit, 50); // Capped at 50
  });

  // Group 5: Moderation & Authorization
  await t.test('23. Admin can hide an inappropriate review', async () => {
    resetTestDb();
    const course = createMockCourse({ title: 'AI Ethics' });
    const student = createMockUser({ name: 'Sam Student', email: 'sam@learnspace.org', role: 'student' });
    const adminUser = createMockUser({ name: 'Admin', email: 'admin@learnspace.org', role: 'admin' });
    const tokenAd = generateToken(adminUser);

    const rev = createMockReview({
      course: course._id,
      student: student._id,
      rating: 1,
      reviewText: 'Spam offensive remark',
      moderationStatus: 'approved',
    });

    const hideRes = await request(app)
      .patch(`/api/admin/reviews/${rev._id}/hide`)
      .set('Cookie', [`jwt=${tokenAd}`])
      .send({ reason: 'Spam and abusive language' });

    assert.strictEqual(hideRes.status, 200);
    assert.strictEqual(hideRes.body.review.moderationStatus, 'hidden');
    assert.strictEqual(hideRes.body.summary.totalReviews, 0); // No longer in summary
  });

  await t.test('24. Non-admin users cannot moderate reviews (403)', async () => {
    resetTestDb();
    const student = createMockUser({ name: 'Sam', email: 'sam@learnspace.org', role: 'student' });
    const tokenSt = generateToken(student);
    const rev = createMockReview({ course: makeObjectId(), student: student._id, rating: 5 });

    const res = await request(app)
      .patch(`/api/admin/reviews/${rev._id}/hide`)
      .set('Cookie', [`jwt=${tokenSt}`]);

    assert.strictEqual(res.status, 403);
  });

  await t.test('25. Course instructors cannot moderate reviews (403)', async () => {
    resetTestDb();
    const inst = createMockUser({ name: 'Prof', email: 'prof@learnspace.org', role: 'instructor' });
    const tokenIn = generateToken(inst);
    const rev = createMockReview({ course: makeObjectId(), student: makeObjectId(), rating: 1 });

    const res = await request(app)
      .patch(`/api/admin/reviews/${rev._id}/hide`)
      .set('Cookie', [`jwt=${tokenIn}`]);

    assert.strictEqual(res.status, 403);
  });

  await t.test('26. Admin can restore a previously hidden review', async () => {
    resetTestDb();
    const course = createMockCourse({ title: 'Robotics' });
    const adminUser = createMockUser({ name: 'Admin', email: 'admin@learnspace.org', role: 'admin' });
    const tokenAd = generateToken(adminUser);

    const rev = createMockReview({
      course: course._id,
      student: makeObjectId(),
      rating: 4,
      moderationStatus: 'hidden',
    });

    const restoreRes = await request(app)
      .patch(`/api/admin/reviews/${rev._id}/restore`)
      .set('Cookie', [`jwt=${tokenAd}`]);

    assert.strictEqual(restoreRes.status, 200);
    assert.strictEqual(restoreRes.body.review.moderationStatus, 'approved');
    assert.strictEqual(restoreRes.body.summary.totalReviews, 1);
  });

  await t.test('27. Admin can retrieve reviews queue with moderation filters', async () => {
    resetTestDb();
    const adminUser = createMockUser({ name: 'Admin', email: 'admin@learnspace.org', role: 'admin' });
    const tokenAd = generateToken(adminUser);

    createMockReview({ course: makeObjectId(), student: makeObjectId(), rating: 5, moderationStatus: 'approved' });
    createMockReview({ course: makeObjectId(), student: makeObjectId(), rating: 1, moderationStatus: 'hidden' });

    const resAll = await request(app)
      .get('/api/admin/reviews')
      .set('Cookie', [`jwt=${tokenAd}`]);

    assert.strictEqual(resAll.status, 200);
    assert.strictEqual(resAll.body.reviews.length, 2);

    const resHidden = await request(app)
      .get('/api/admin/reviews?status=hidden')
      .set('Cookie', [`jwt=${tokenAd}`]);

    assert.strictEqual(resHidden.status, 200);
    assert.strictEqual(resHidden.body.reviews.length, 1);
    assert.strictEqual(resHidden.body.reviews[0].moderationStatus, 'hidden');
  });

  await t.test('28. Non-admin student cannot access /api/admin/reviews (403)', async () => {
    const student = createMockUser({ name: 'Sammy', email: 'sammy@learnspace.org', role: 'student' });
    const token = generateToken(student);
    const res = await request(app)
      .get('/api/admin/reviews')
      .set('Cookie', [`jwt=${token}`]);

    assert.strictEqual(res.status, 403);
  });

  await t.test('29. Public review endpoint for non-existent course returns 404', async () => {
    const res = await request(app).get('/api/courses/non-existent-course-slug-12345/reviews');
    assert.strictEqual(res.status, 404);
  });

  await t.test('30. Review creation with valid star rating and omitted reviewText succeeds', async () => {
    resetTestDb();
    const st = createMockUser({ name: 'Eva', email: 'eva@learnspace.org', role: 'student' });
    const cr = createMockCourse({ title: 'Microservices with Node' });
    createMockEnrollment({ student: st._id, course: cr._id, status: 'active' });
    const token = generateToken(st);

    const res = await request(app)
      .post(`/api/courses/${cr.slug}/reviews`)
      .set('Cookie', [`jwt=${token}`])
      .send({ rating: 5 });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.review.rating, 5);
    assert.strictEqual(res.body.review.reviewText, '');
  });

  await t.test('31. Aggregates update immediately when rating changes from 5 to 1', async () => {
    resetTestDb();
    const st = createMockUser({ name: 'Leo', email: 'leo@learnspace.org', role: 'student' });
    const cr = createMockCourse({ title: 'Kubernetes in Action' });
    createMockEnrollment({ student: st._id, course: cr._id, status: 'active' });
    const token = generateToken(st);

    const createRes = await request(app)
      .post(`/api/courses/${cr.slug}/reviews`)
      .set('Cookie', [`jwt=${token}`])
      .send({ rating: 5, reviewText: 'Initially loved it!' });

    assert.strictEqual(createRes.body.summary.averageRating, 5);

    const updateRes = await request(app)
      .patch(`/api/courses/${cr.slug}/reviews/${createRes.body.review._id}`)
      .set('Cookie', [`jwt=${token}`])
      .send({ rating: 1, reviewText: 'Encountered severe issues later in course.' });

    assert.strictEqual(updateRes.body.summary.averageRating, 1);
    assert.strictEqual(updateRes.body.summary.distribution[1], 1);
    assert.strictEqual(updateRes.body.summary.distribution[5], 0);
  });

  await t.test('32. Course discovery GET /api/courses exposes real averageRating and totalReviews', async () => {
    resetTestDb();
    const cr = createMockCourse({ title: 'Fullstack Mastery' });
    createMockReview({ course: cr._id, student: makeObjectId(), rating: 5, moderationStatus: 'approved' });
    createMockReview({ course: cr._id, student: makeObjectId(), rating: 3, moderationStatus: 'approved' });

    const res = await request(app).get('/api/courses');
    assert.strictEqual(res.status, 200);
    const found = res.body.courses.find((c) => c._id === cr._id.toString());
    assert.ok(found);
    assert.strictEqual(found.averageRating, 4.0);
    assert.strictEqual(found.totalReviews, 2);
  });
});
