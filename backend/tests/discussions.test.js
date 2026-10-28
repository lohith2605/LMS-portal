const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { app } = require('../server');
const User = require('../models/User');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const Discussion = require('../models/Discussion');
const DiscussionReply = require('../models/DiscussionReply');

const TEST_SECRET = 'test_jwt_secret_key_12345678901234567890';
process.env.JWT_SECRET = TEST_SECRET;
process.env.NODE_ENV = 'test';

// In-memory mock stores
let mockUsers = [];
let mockCourses = [];
let mockEnrollments = [];
let mockDiscussions = [];
let mockReplies = [];
let idCounter = 600;

const makeObjectId = () => {
  const hex = (idCounter++).toString(16).padStart(24, '0');
  return new mongoose.Types.ObjectId(hex);
};

const resetTestDb = () => {
  mockUsers = [];
  mockCourses = [];
  mockEnrollments = [];
  mockDiscussions = [];
  mockReplies = [];
  idCounter = 600;
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

const createMockCourse = (data) => {
  const course = {
    _id: data._id || makeObjectId(),
    title: data.title,
    slug: data.slug || data.title.toLowerCase().replace(/\s+/g, '-'),
    summary: data.summary || 'Summary description',
    description: data.description || 'Full description',
    instructor: data.instructor,
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
    completedLessons: data.completedLessons || [],
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

// Wire up Mongoose Stubs for Test Runner Isolation
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

Course.findOne = function (query) {
  const course = mockCourses.find((c) => {
    if (query._id && c._id.toString() !== query._id.toString()) return false;
    if (query.slug && c.slug !== query.slug) return false;
    return true;
  });
  return {
    select: () => ({
      populate: () => Promise.resolve(course || null),
      then: (resolve) => resolve(course || null),
    }),
    populate: () => Promise.resolve(course || null),
    then: (resolve) => resolve(course || null),
  };
};

Course.findById = function (id) {
  const idStr = id ? id.toString() : '';
  const course = mockCourses.find((c) => c._id.toString() === idStr);
  return {
    select: () => Promise.resolve(course || null),
    populate: () => Promise.resolve(course || null),
    then: (resolve) => resolve(course || null),
  };
};

Enrollment.findOne = function (query) {
  const enrollment = mockEnrollments.find((e) => {
    if (query.student && e.student.toString() !== query.student.toString()) return false;
    if (query.course && e.course.toString() !== query.course.toString()) return false;
    if (query.status && query.status.$in && !query.status.$in.includes(e.status)) return false;
    return true;
  });
  return Promise.resolve(enrollment || null);
};

// Discussion Mongoose Stubs
Discussion.create = function (data) {
  const doc = {
    _id: makeObjectId(),
    course: data.course,
    author: data.author,
    title: data.title,
    body: data.body,
    type: data.type || 'question',
    isPinned: false,
    pinnedAt: null,
    pinnedBy: null,
    isLocked: false,
    lockedAt: null,
    lockedBy: null,
    isAnswered: false,
    acceptedAnswer: null,
    acceptedAt: null,
    acceptedBy: null,
    replyCount: 0,
    lastActivityAt: data.lastActivityAt || new Date(),
    isDeleted: false,
    deletedAt: null,
    deletedBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    async save() {
      const idx = mockDiscussions.findIndex((d) => d._id.toString() === this._id.toString());
      if (idx !== -1) mockDiscussions[idx] = this;
      else mockDiscussions.push(this);
      return this;
    },
  };
  mockDiscussions.push(doc);
  return Promise.resolve(doc);
};

Discussion.findById = function (id) {
  const idStr = id ? id.toString() : '';
  const item = mockDiscussions.find((d) => d._id.toString() === idStr);

  const queryObj = {
    _item: item,
    populate(field, select) {
      if (!this._item) return this;
      const clone = { ...this._item };
      if (field === 'author') {
        clone.author = mockUsers.find((u) => u._id.toString() === clone.author.toString()) || clone.author;
      }
      this._item = clone;
      return this;
    },
    lean() {
      return Promise.resolve(this._item ? JSON.parse(JSON.stringify(this._item)) : null);
    },
    then(resolve) {
      resolve(this._item || null);
    },
  };
  return queryObj;
};

Discussion.countDocuments = function (query) {
  const filtered = mockDiscussions.filter((d) => {
    if (query.course && d.course.toString() !== query.course.toString()) return false;
    if (query.isDeleted !== undefined && d.isDeleted !== query.isDeleted) return false;
    if (query.type && d.type !== query.type) return false;
    if (query.isAnswered !== undefined && d.isAnswered !== query.isAnswered) return false;
    if (query.$or) {
      const matches = query.$or.some((clause) => {
        if (clause.title && clause.title.$regex) {
          return new RegExp(clause.title.$regex, clause.title.$options).test(d.title);
        }
        if (clause.body && clause.body.$regex) {
          return new RegExp(clause.body.$regex, clause.body.$options).test(d.body);
        }
        return false;
      });
      if (!matches) return false;
    }
    return true;
  });
  return Promise.resolve(filtered.length);
};

Discussion.find = function (query) {
  let list = mockDiscussions.filter((d) => {
    if (query.course && d.course.toString() !== query.course.toString()) return false;
    if (query.isDeleted !== undefined && d.isDeleted !== query.isDeleted) return false;
    if (query.type && d.type !== query.type) return false;
    if (query.isAnswered !== undefined && d.isAnswered !== query.isAnswered) return false;
    if (query.$or) {
      const matches = query.$or.some((clause) => {
        if (clause.title && clause.title.$regex) {
          return new RegExp(clause.title.$regex, clause.title.$options).test(d.title);
        }
        if (clause.body && clause.body.$regex) {
          return new RegExp(clause.body.$regex, clause.body.$options).test(d.body);
        }
        return false;
      });
      if (!matches) return false;
    }
    return true;
  });

  const queryObj = {
    _list: list,
    populate(field, select) {
      this._list = this._list.map((d) => {
        const copy = { ...d };
        if (field === 'author') {
          copy.author = mockUsers.find((u) => u._id.toString() === copy.author.toString()) || copy.author;
        }
        return copy;
      });
      return this;
    },
    sort(opts) {
      if (opts && opts.isPinned === -1) {
        this._list.sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));
      }
      return this;
    },
    skip(n) {
      this._list = this._list.slice(n);
      return this;
    },
    limit(n) {
      this._list = this._list.slice(0, n);
      return this;
    },
    lean() {
      return Promise.resolve(JSON.parse(JSON.stringify(this._list)));
    },
    then(resolve) {
      resolve(this._list);
    },
  };
  return queryObj;
};

// DiscussionReply Mongoose Stubs
DiscussionReply.create = function (data) {
  const doc = {
    _id: makeObjectId(),
    discussion: data.discussion,
    course: data.course,
    author: data.author,
    body: data.body,
    isAccepted: false,
    isDeleted: false,
    deletedAt: null,
    deletedBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    async save() {
      const idx = mockReplies.findIndex((r) => r._id.toString() === this._id.toString());
      if (idx !== -1) mockReplies[idx] = this;
      else mockReplies.push(this);
      return this;
    },
  };
  mockReplies.push(doc);
  return Promise.resolve(doc);
};

DiscussionReply.findById = function (id) {
  const idStr = id ? id.toString() : '';
  const item = mockReplies.find((r) => r._id.toString() === idStr);
  const queryObj = {
    _item: item,
    populate(field) {
      if (!this._item) return this;
      const copy = { ...this._item };
      if (field === 'author') {
        copy.author = mockUsers.find((u) => u._id.toString() === copy.author.toString()) || copy.author;
      }
      this._item = copy;
      return this;
    },
    lean() {
      return Promise.resolve(this._item ? JSON.parse(JSON.stringify(this._item)) : null);
    },
    then(resolve) {
      resolve(this._item || null);
    },
  };
  return queryObj;
};

DiscussionReply.countDocuments = function (query) {
  const filtered = mockReplies.filter((r) => {
    if (query.discussion && r.discussion.toString() !== query.discussion.toString()) return false;
    if (query.isDeleted !== undefined && r.isDeleted !== query.isDeleted) return false;
    return true;
  });
  return Promise.resolve(filtered.length);
};

DiscussionReply.find = function (query) {
  let list = mockReplies.filter((r) => {
    if (query.discussion && r.discussion.toString() !== query.discussion.toString()) return false;
    if (query.isDeleted !== undefined && r.isDeleted !== query.isDeleted) return false;
    return true;
  });

  const queryObj = {
    _list: list,
    populate(field) {
      this._list = this._list.map((r) => {
        const copy = { ...r };
        if (field === 'author') {
          copy.author = mockUsers.find((u) => u._id.toString() === copy.author.toString()) || copy.author;
        }
        return copy;
      });
      return this;
    },
    sort(opts) {
      return this;
    },
    skip(n) {
      this._list = this._list.slice(n);
      return this;
    },
    limit(n) {
      this._list = this._list.slice(0, n);
      return this;
    },
    lean() {
      return Promise.resolve(JSON.parse(JSON.stringify(this._list)));
    },
    then(resolve) {
      resolve(this._list);
    },
  };
  return queryObj;
};

DiscussionReply.updateMany = function (query, update) {
  let matched = 0;
  mockReplies.forEach((r) => {
    let match = true;
    if (query.discussion && r.discussion.toString() !== query.discussion.toString()) match = false;
    if (query.isAccepted !== undefined && r.isAccepted !== query.isAccepted) match = false;
    if (query.isDeleted !== undefined && r.isDeleted !== query.isDeleted) match = false;
    if (match) {
      matched++;
      if (update.$set) {
        Object.assign(r, update.$set);
      }
    }
  });
  return Promise.resolve({ matchedCount: matched, modifiedCount: matched });
};

// Helper to generate auth token for test requests
const getAuthToken = (user) => {
  return jwt.sign(
    { id: user._id.toString(), role: user.role, email: user.email },
    TEST_SECRET,
    { expiresIn: '1h' }
  );
};

test('Phase 7 Course Discussion Forum & Q&A Suite', async (t) => {
  let instructorAlice;
  let studentBob;
  let studentCharlie;
  let unenrolledStudentDavid;
  let courseCloudArchitecture;
  let tokenAlice;
  let tokenBob;
  let tokenCharlie;
  let tokenDavid;
  let createdDiscussionId;
  let createdReplyId;

  t.beforeEach(() => {
    resetTestDb();

    instructorAlice = createMockUser({
      name: 'Alice Instructor',
      email: 'alice.inst@learnspace.org',
      role: 'instructor',
    });

    studentBob = createMockUser({
      name: 'Bob Enrolled Student',
      email: 'bob.student@learnspace.org',
      role: 'student',
    });

    studentCharlie = createMockUser({
      name: 'Charlie Enrolled Student',
      email: 'charlie.student@learnspace.org',
      role: 'student',
    });

    unenrolledStudentDavid = createMockUser({
      name: 'David Unenrolled Student',
      email: 'david.unenrolled@learnspace.org',
      role: 'student',
    });

    courseCloudArchitecture = createMockCourse({
      title: 'Cloud Architecture & Microservices',
      slug: 'cloud-architecture-microservices',
      instructor: instructorAlice._id,
      status: 'published',
    });

    createMockEnrollment({
      student: studentBob._id,
      course: courseCloudArchitecture._id,
      status: 'active',
    });

    createMockEnrollment({
      student: studentCharlie._id,
      course: courseCloudArchitecture._id,
      status: 'active',
    });

    tokenAlice = getAuthToken(instructorAlice);
    tokenBob = getAuthToken(studentBob);
    tokenCharlie = getAuthToken(studentCharlie);
    tokenDavid = getAuthToken(unenrolledStudentDavid);
  });

  // 1. Authentication & Course Access Authorization Tests
  await t.test('1. Unauthenticated request to course discussions is rejected with 401', async () => {
    const res = await request(app).get(`/api/discussions/course/${courseCloudArchitecture._id}`);
    assert.strictEqual(res.status, 401);
  });

  await t.test('2. Unenrolled student cannot view or create course discussions (403 Forbidden)', async () => {
    const resGet = await request(app)
      .get(`/api/discussions/course/${courseCloudArchitecture._id}`)
      .set('Authorization', `Bearer ${tokenDavid}`);
    assert.strictEqual(resGet.status, 403);
    assert.match(resGet.body.error, /enrolled in this course/i);

    const resPost = await request(app)
      .post(`/api/discussions/course/${courseCloudArchitecture._id}`)
      .set('Authorization', `Bearer ${tokenDavid}`)
      .send({
        title: 'How does event sourcing work?',
        body: 'Can someone explain how event sourcing maintains aggregate consistency?',
        type: 'question',
      });
    assert.strictEqual(resPost.status, 403);
  });

  await t.test('3. Rejects discussion creation with missing or invalid fields (400)', async () => {
    const resShortTitle = await request(app)
      .post(`/api/discussions/course/${courseCloudArchitecture._id}`)
      .set('Authorization', `Bearer ${tokenBob}`)
      .send({
        title: 'Hi',
        body: 'This is a valid body description of a problem with sufficient length.',
      });
    assert.strictEqual(resShortTitle.status, 400);
    assert.match(resShortTitle.body.error, /at least 5 characters/i);

    const resShortBody = await request(app)
      .post(`/api/discussions/course/${courseCloudArchitecture._id}`)
      .set('Authorization', `Bearer ${tokenBob}`)
      .send({
        title: 'Valid Question Title Here',
        body: 'Too short',
      });
    assert.strictEqual(resShortBody.status, 400);
    assert.match(resShortBody.body.error, /at least 10 characters/i);
  });

  // 2. Discussion Creation & Author Verification Tests
  await t.test('4. Enrolled student creates a question-type discussion (201 Created)', async () => {
    const res = await request(app)
      .post(`/api/discussions/course/${courseCloudArchitecture._id}`)
      .set('Authorization', `Bearer ${tokenBob}`)
      .send({
        title: 'How do we handle CQRS read model projections?',
        body: 'When an event is published to Kafka, should the read projector update PostgreSQL synchronously or asynchronously?',
        type: 'question',
      });

    assert.strictEqual(res.status, 201);
    assert.ok(res.body.discussion);
    assert.strictEqual(res.body.discussion.title, 'How do we handle CQRS read model projections?');
    assert.strictEqual(res.body.discussion.type, 'question');
    assert.strictEqual(res.body.discussion.author._id.toString(), studentBob._id.toString());
    assert.strictEqual(res.body.discussion.replyCount, 0);
    assert.strictEqual(res.body.discussion.isAnswered, false);

    createdDiscussionId = res.body.discussion._id;
  });

  await t.test('5. Course instructor can create an announcement/discussion in their course', async () => {
    const res = await request(app)
      .post(`/api/discussions/course/${courseCloudArchitecture._id}`)
      .set('Authorization', `Bearer ${tokenAlice}`)
      .send({
        title: 'Midterm Capstone Architecture Guidelines Released',
        body: 'Please review the distributed transaction requirements in Module 4 before beginning the capstone project.',
        type: 'discussion',
      });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.discussion.type, 'discussion');
    assert.strictEqual(res.body.discussion.author._id.toString(), instructorAlice._id.toString());
  });

  // 3. Discussion Listing, Searching, and Filtering Tests
  await t.test('6. Enrolled student lists course discussions with pagination and search', async () => {
    // Populate two discussions
    await request(app)
      .post(`/api/discussions/course/${courseCloudArchitecture._id}`)
      .set('Authorization', `Bearer ${tokenBob}`)
      .send({
        title: 'Docker Swarm vs Kubernetes comparison',
        body: 'Which container orchestrator is optimal for small team distributed backends?',
        type: 'question',
      });

    await request(app)
      .post(`/api/discussions/course/${courseCloudArchitecture._id}`)
      .set('Authorization', `Bearer ${tokenCharlie}`)
      .send({
        title: 'Database connection pooling best practices',
        body: 'What is the recommended pool size when utilizing Prisma or Mongoose with serverless Lambdas?',
        type: 'question',
      });

    const resList = await request(app)
      .get(`/api/discussions/course/${courseCloudArchitecture._id}?limit=10&page=1`)
      .set('Authorization', `Bearer ${tokenBob}`);

    assert.strictEqual(resList.status, 200);
    assert.ok(Array.isArray(resList.body.discussions));
    assert.ok(resList.body.discussions.length >= 2);
    assert.ok(resList.body.pagination);

    // Search by keyword
    const resSearch = await request(app)
      .get(`/api/discussions/course/${courseCloudArchitecture._id}?search=Kubernetes`)
      .set('Authorization', `Bearer ${tokenBob}`);

    assert.strictEqual(resSearch.status, 200);
    assert.strictEqual(resSearch.body.discussions.length, 1);
    assert.match(resSearch.body.discussions[0].title, /Kubernetes/i);
  });

  // 4. Discussion Editing & Authorization
  await t.test('7. Discussion author can edit their discussion; unauthorized users are rejected', async () => {
    const resCreate = await request(app)
      .post(`/api/discussions/course/${courseCloudArchitecture._id}`)
      .set('Authorization', `Bearer ${tokenBob}`)
      .send({
        title: 'Initial Title with Typo in Projections',
        body: 'Initial body description that needs refinement and more code detail.',
        type: 'question',
      });
    const discId = resCreate.body.discussion._id;

    // Unauthorized edit by another student (Charlie)
    const resForbidden = await request(app)
      .patch(`/api/discussions/${discId}`)
      .set('Authorization', `Bearer ${tokenCharlie}`)
      .send({ title: 'Charlie trying to edit Bob discussion' });
    assert.strictEqual(resForbidden.status, 403);

    // Authorized edit by author (Bob)
    const resEdit = await request(app)
      .patch(`/api/discussions/${discId}`)
      .set('Authorization', `Bearer ${tokenBob}`)
      .send({
        title: 'Refined Question Title with Code Detail',
        body: 'Updated body with extensive details regarding read model synchronization.',
      });
    assert.strictEqual(resEdit.status, 200);
    assert.strictEqual(resEdit.body.discussion.title, 'Refined Question Title with Code Detail');
  });

  // 5. Replies & Answers Workflow
  await t.test('8. Enrolled participants can reply to a discussion and increment replyCount', async () => {
    const resDisc = await request(app)
      .post(`/api/discussions/course/${courseCloudArchitecture._id}`)
      .set('Authorization', `Bearer ${tokenBob}`)
      .send({
        title: 'What is the optimal caching layer for microservices?',
        body: 'Redis Cluster vs Memcached in a high throughput distributed setup.',
        type: 'question',
      });
    const discId = resDisc.body.discussion._id;

    // Charlie posts a reply
    const resReply1 = await request(app)
      .post(`/api/discussions/${discId}/replies`)
      .set('Authorization', `Bearer ${tokenCharlie}`)
      .send({
        body: 'Redis Cluster is generally preferred if you need pub/sub or complex data structures.',
      });

    assert.strictEqual(resReply1.status, 201);
    assert.ok(resReply1.body.reply);
    assert.strictEqual(resReply1.body.reply.author._id.toString(), studentCharlie._id.toString());
    assert.strictEqual(resReply1.body.reply.isAccepted, false);
    createdReplyId = resReply1.body.reply._id;

    // Verify parent discussion replyCount updated
    const resGet = await request(app)
      .get(`/api/discussions/${discId}`)
      .set('Authorization', `Bearer ${tokenBob}`);

    assert.strictEqual(resGet.status, 200);
    assert.strictEqual(resGet.body.discussion.replyCount, 1);
    assert.strictEqual(resGet.body.replies.length, 1);
  });

  // 6. Accepted Answer Designations
  await t.test('9. Question author or instructor can mark a reply as accepted answer', async () => {
    const resDisc = await request(app)
      .post(`/api/discussions/course/${courseCloudArchitecture._id}`)
      .set('Authorization', `Bearer ${tokenBob}`)
      .send({
        title: 'How to handle distributed saga rollbacks?',
        body: 'When step 3 of an orchestration saga fails, what triggers compensating transactions?',
        type: 'question',
      });
    const discId = resDisc.body.discussion._id;

    const resReply = await request(app)
      .post(`/api/discussions/${discId}/replies`)
      .set('Authorization', `Bearer ${tokenCharlie}`)
      .send({
        body: 'The central saga orchestrator listens for the failure event and dispatches backward compensating commands.',
      });
    const replyId = resReply.body.reply._id;

    // Unrelated student (e.g. Charlie himself, who is not author or instructor) cannot accept answer
    // Wait, Charlie is the replier, not the question author! Question author is Bob!
    const resUnrelated = await request(app)
      .patch(`/api/discussions/${discId}/replies/${replyId}/accept`)
      .set('Authorization', `Bearer ${tokenCharlie}`);
    assert.strictEqual(resUnrelated.status, 403);

    // Question author (Bob) marks answer as accepted
    const resAccept = await request(app)
      .patch(`/api/discussions/${discId}/replies/${replyId}/accept`)
      .set('Authorization', `Bearer ${tokenBob}`);

    assert.strictEqual(resAccept.status, 200);
    assert.strictEqual(resAccept.body.isAccepted, true);

    // Verify discussion isAnswered flag
    const resCheck = await request(app)
      .get(`/api/discussions/${discId}`)
      .set('Authorization', `Bearer ${tokenBob}`);
    assert.strictEqual(resCheck.body.discussion.isAnswered, true);
    assert.strictEqual(resCheck.body.replies[0].isAccepted, true);

    // Toggling accept again removes the accepted status
    const resToggleOff = await request(app)
      .patch(`/api/discussions/${discId}/replies/${replyId}/accept`)
      .set('Authorization', `Bearer ${tokenBob}`);
    assert.strictEqual(resToggleOff.status, 200);
    assert.strictEqual(resToggleOff.body.isAccepted, false);
  });

  // 7. Pinning & Locking Moderation
  await t.test('10. Instructor can pin and lock discussions; locked discussions reject new replies', async () => {
    const resDisc = await request(app)
      .post(`/api/discussions/course/${courseCloudArchitecture._id}`)
      .set('Authorization', `Bearer ${tokenBob}`)
      .send({
        title: 'General Course Guidelines Question',
        body: 'Where can we find the submission rubric for week 3?',
        type: 'question',
      });
    const discId = resDisc.body.discussion._id;

    // Student cannot pin or lock
    const resStudentPin = await request(app)
      .patch(`/api/discussions/${discId}/pin`)
      .set('Authorization', `Bearer ${tokenBob}`);
    assert.strictEqual(resStudentPin.status, 403);

    // Instructor pins discussion
    const resInstPin = await request(app)
      .patch(`/api/discussions/${discId}/pin`)
      .set('Authorization', `Bearer ${tokenAlice}`);
    assert.strictEqual(resInstPin.status, 200);
    assert.strictEqual(resInstPin.body.isPinned, true);

    // Instructor locks discussion
    const resInstLock = await request(app)
      .patch(`/api/discussions/${discId}/lock`)
      .set('Authorization', `Bearer ${tokenAlice}`);
    assert.strictEqual(resInstLock.status, 200);
    assert.strictEqual(resInstLock.body.isLocked, true);

    // Attempting to reply to a locked discussion fails
    const resLockedReply = await request(app)
      .post(`/api/discussions/${discId}/replies`)
      .set('Authorization', `Bearer ${tokenCharlie}`)
      .send({ body: 'Trying to reply to a locked thread.' });
    assert.strictEqual(resLockedReply.status, 400);
    assert.match(resLockedReply.body.error, /locked/i);
  });

  // 8. Soft Deletion Safety
  await t.test('11. Soft-deleting a discussion preserves database records but hides from active listing', async () => {
    const resDisc = await request(app)
      .post(`/api/discussions/course/${courseCloudArchitecture._id}`)
      .set('Authorization', `Bearer ${tokenBob}`)
      .send({
        title: 'Accidental Duplicate Discussion Post',
        body: 'I posted this by mistake and want to safely remove it.',
        type: 'discussion',
      });
    const discId = resDisc.body.discussion._id;

    const resDel = await request(app)
      .delete(`/api/discussions/${discId}`)
      .set('Authorization', `Bearer ${tokenBob}`);
    assert.strictEqual(resDel.status, 200);

    // Active listing no longer contains soft-deleted discussion
    const resList = await request(app)
      .get(`/api/discussions/course/${courseCloudArchitecture._id}`)
      .set('Authorization', `Bearer ${tokenBob}`);
    const found = resList.body.discussions.some((d) => d._id.toString() === discId.toString());
    assert.strictEqual(found, false);
  });

  // 9. Cross-Course & Role-Based Moderation Boundaries
  await t.test('12. Instructor from another course cannot moderate; Admin can moderate any course', async () => {
    const instructorEve = createMockUser({
      name: 'Eve Other Instructor',
      email: 'eve.inst@learnspace.org',
      role: 'instructor',
    });
    const tokenEve = getAuthToken(instructorEve);

    const adminFrank = createMockUser({
      name: 'Frank Administrator',
      email: 'frank.admin@learnspace.org',
      role: 'admin',
    });
    const tokenAdmin = getAuthToken(adminFrank);

    const resDisc = await request(app)
      .post(`/api/discussions/course/${courseCloudArchitecture._id}`)
      .set('Authorization', `Bearer ${tokenBob}`)
      .send({
        title: 'Authentication Microservice Security Protocol',
        body: 'Should we issue opaque tokens with server-side introspection or stateless JWTs?',
        type: 'question',
      });
    const discId = resDisc.body.discussion._id;

    // Eve (unauthorized instructor for this course) is blocked with 403
    const resEvePin = await request(app)
      .patch(`/api/discussions/${discId}/pin`)
      .set('Authorization', `Bearer ${tokenEve}`);
    assert.strictEqual(resEvePin.status, 403);

    // Admin can pin and moderate discussions across all courses
    const resAdminPin = await request(app)
      .patch(`/api/discussions/${discId}/pin`)
      .set('Authorization', `Bearer ${tokenAdmin}`);
    assert.strictEqual(resAdminPin.status, 200);
    assert.strictEqual(resAdminPin.body.isPinned, true);
  });

  // 10. Author Spoofing Prevention
  await t.test('13. Prevents author spoofing when submitting another user ID in body', async () => {
    const resDisc = await request(app)
      .post(`/api/discussions/course/${courseCloudArchitecture._id}`)
      .set('Authorization', `Bearer ${tokenBob}`)
      .send({
        title: 'Testing Author Spoofing Immunity',
        body: 'Attempting to inject a spoofed author ObjectId in discussion payload.',
        type: 'question',
        author: instructorAlice._id.toString(), // Bob attempting to impersonate Alice
      });

    assert.strictEqual(resDisc.status, 201);
    // Verified: The author is Bob, the authenticated session user, ignoring client-provided author field
    assert.strictEqual(resDisc.body.discussion.author._id.toString(), studentBob._id.toString());

    const discId = resDisc.body.discussion._id;
    const resReply = await request(app)
      .post(`/api/discussions/${discId}/replies`)
      .set('Authorization', `Bearer ${tokenBob}`)
      .send({
        body: 'Reply attempting to spoof author as Alice as well.',
        author: instructorAlice._id.toString(),
      });

    assert.strictEqual(resReply.status, 201);
    assert.strictEqual(resReply.body.reply.author._id.toString(), studentBob._id.toString());
  });

  // 11. Single Accepted Answer Constraint
  await t.test('14. Single accepted answer constraint enforces only one solution marked at a time', async () => {
    const resDisc = await request(app)
      .post(`/api/discussions/course/${courseCloudArchitecture._id}`)
      .set('Authorization', `Bearer ${tokenBob}`)
      .send({
        title: 'Optimal DB Isolation Level for Order Checkout',
        body: 'Is Read Committed sufficient or is Serializable required?',
        type: 'question',
      });
    const discId = resDisc.body.discussion._id;

    const resReply1 = await request(app)
      .post(`/api/discussions/${discId}/replies`)
      .set('Authorization', `Bearer ${tokenCharlie}`)
      .send({ body: 'Solution 1: Use Read Committed with pessimistic row-level SELECT FOR UPDATE.' });
    const reply1Id = resReply1.body.reply._id;

    const resReply2 = await request(app)
      .post(`/api/discussions/${discId}/replies`)
      .set('Authorization', `Bearer ${tokenAlice}`)
      .send({ body: 'Solution 2: Use Serializable with retry loops for true ACID isolation.' });
    const reply2Id = resReply2.body.reply._id;

    // Bob accepts reply 1
    const resAcc1 = await request(app)
      .patch(`/api/discussions/${discId}/replies/${reply1Id}/accept`)
      .set('Authorization', `Bearer ${tokenBob}`);
    assert.strictEqual(resAcc1.status, 200);
    assert.strictEqual(resAcc1.body.isAccepted, true);

    // Bob now accepts reply 2
    const resAcc2 = await request(app)
      .patch(`/api/discussions/${discId}/replies/${reply2Id}/accept`)
      .set('Authorization', `Bearer ${tokenBob}`);
    assert.strictEqual(resAcc2.status, 200);
    assert.strictEqual(resAcc2.body.isAccepted, true);

    // Verify discussion details: only Reply 2 is marked accepted, Reply 1 was cleared
    const resDetails = await request(app)
      .get(`/api/discussions/${discId}`)
      .set('Authorization', `Bearer ${tokenBob}`);

    const rep1 = resDetails.body.replies.find((r) => r._id.toString() === reply1Id.toString());
    const rep2 = resDetails.body.replies.find((r) => r._id.toString() === reply2Id.toString());
    assert.strictEqual(rep1.isAccepted, false);
    assert.strictEqual(rep2.isAccepted, true);
    assert.strictEqual(resDetails.body.discussion.acceptedAnswer.toString(), reply2Id.toString());
  });

  // 12. Deletion Recounting & Cascade Consistency
  await t.test('15. Deleting a reply decrements reply count and resets accepted state; deleting discussion cascades', async () => {
    const resDisc = await request(app)
      .post(`/api/discussions/course/${courseCloudArchitecture._id}`)
      .set('Authorization', `Bearer ${tokenBob}`)
      .send({
        title: 'Cascade Deletion and Reply Count Integrity',
        body: 'Checking that deleting replies and discussions maintains mathematical counts.',
        type: 'question',
      });
    const discId = resDisc.body.discussion._id;

    const resRep1 = await request(app)
      .post(`/api/discussions/${discId}/replies`)
      .set('Authorization', `Bearer ${tokenCharlie}`)
      .send({ body: 'First reply body that will be accepted then deleted.' });
    const rep1Id = resRep1.body.reply._id;

    const resRep2 = await request(app)
      .post(`/api/discussions/${discId}/replies`)
      .set('Authorization', `Bearer ${tokenCharlie}`)
      .send({ body: 'Second reply body that stays active.' });

    // Accept reply 1
    await request(app)
      .patch(`/api/discussions/${discId}/replies/${rep1Id}/accept`)
      .set('Authorization', `Bearer ${tokenBob}`);

    let check1 = await request(app)
      .get(`/api/discussions/${discId}`)
      .set('Authorization', `Bearer ${tokenBob}`);
    assert.strictEqual(check1.body.discussion.replyCount, 2);
    assert.strictEqual(check1.body.discussion.isAnswered, true);

    // Charlie deletes accepted reply 1
    const resDelReply = await request(app)
      .delete(`/api/discussions/${discId}/replies/${rep1Id}`)
      .set('Authorization', `Bearer ${tokenCharlie}`);
    assert.strictEqual(resDelReply.status, 200);

    let check2 = await request(app)
      .get(`/api/discussions/${discId}`)
      .set('Authorization', `Bearer ${tokenBob}`);
    // Reply count accurately decremented to 1
    assert.strictEqual(check2.body.discussion.replyCount, 1);
    // Accepted state accurately reset to false
    assert.strictEqual(check2.body.discussion.isAnswered, false);
    assert.strictEqual(check2.body.discussion.acceptedAnswer, null);

    // Instructor soft-deletes discussion
    const resDelDisc = await request(app)
      .delete(`/api/discussions/${discId}`)
      .set('Authorization', `Bearer ${tokenAlice}`);
    assert.strictEqual(resDelDisc.status, 200);

    // Discussion is no longer accessible via single discussion endpoint
    const resDiscAfter = await request(app)
      .get(`/api/discussions/${discId}`)
      .set('Authorization', `Bearer ${tokenBob}`);
    assert.strictEqual(resDiscAfter.status, 404);
  });

  // 13. Locked Discussion Enforcement
  await t.test('16. Locked discussion prevents non-moderator author from changing accepted answer or editing', async () => {
    const resDisc = await request(app)
      .post(`/api/discussions/course/${courseCloudArchitecture._id}`)
      .set('Authorization', `Bearer ${tokenBob}`)
      .send({
        title: 'Thread To Be Moderated and Locked',
        body: 'This thread will be locked to verify student edit and answer rejection.',
        type: 'question',
      });
    const discId = resDisc.body.discussion._id;

    const resReply = await request(app)
      .post(`/api/discussions/${discId}/replies`)
      .set('Authorization', `Bearer ${tokenCharlie}`)
      .send({ body: 'A reply posted prior to thread lock.' });
    const replyId = resReply.body.reply._id;

    // Alice locks the thread
    await request(app)
      .patch(`/api/discussions/${discId}/lock`)
      .set('Authorization', `Bearer ${tokenAlice}`);

    // Student Bob attempts to edit locked thread -> 400
    const resEditLocked = await request(app)
      .patch(`/api/discussions/${discId}`)
      .set('Authorization', `Bearer ${tokenBob}`)
      .send({ title: 'Attempting to edit title when locked' });
    assert.strictEqual(resEditLocked.status, 400);
    assert.match(resEditLocked.body.error, /locked/i);

    // Student Bob attempts to accept answer when locked -> 400
    const resAcceptLocked = await request(app)
      .patch(`/api/discussions/${discId}/replies/${replyId}/accept`)
      .set('Authorization', `Bearer ${tokenBob}`);
    assert.strictEqual(resAcceptLocked.status, 400);
    assert.match(resAcceptLocked.body.error, /locked/i);
  });

  // 14. Input Validation & Bounds
  await t.test('17. Rejects invalid discussion types and enforces pagination bounds', async () => {
    // Invalid discussion type
    const resInvalidType = await request(app)
      .post(`/api/discussions/course/${courseCloudArchitecture._id}`)
      .set('Authorization', `Bearer ${tokenBob}`)
      .send({
        title: 'Valid Question Title Here',
        body: 'Valid question body context description of sufficient length.',
        type: 'invalid_category_type',
      });
    assert.strictEqual(resInvalidType.status, 400);
    assert.match(resInvalidType.body.error, /Invalid discussion type/i);

    // Pagination bounds: limit=100 is capped to 50
    const resPaging = await request(app)
      .get(`/api/discussions/course/${courseCloudArchitecture._id}?limit=100&page=-5`)
      .set('Authorization', `Bearer ${tokenBob}`);
    assert.strictEqual(resPaging.status, 200);
    assert.strictEqual(resPaging.body.pagination.limit, 50);
    assert.strictEqual(resPaging.body.pagination.page, 1);
  });
});
