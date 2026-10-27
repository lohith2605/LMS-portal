const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { app } = require('../server');
const User = require('../models/User');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');

const TEST_SECRET = 'test_jwt_secret_key_12345678901234567890';
process.env.JWT_SECRET = TEST_SECRET;
process.env.NODE_ENV = 'test';

// In-memory mock stores
let mockUsers = [];
let mockCourses = [];
let mockEnrollments = [];
let idCounter = 1;

const makeObjectId = () => {
  const hex = (idCounter++).toString(16).padStart(24, '0');
  return new mongoose.Types.ObjectId(hex);
};

const resetTestDb = () => {
  mockUsers = [];
  mockCourses = [];
  mockEnrollments = [];
  idCounter = 1;
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
  const courseId = data._id || makeObjectId();
  const sections = (data.sections || []).map((sec, sIdx) => {
    const secId = sec._id || makeObjectId();
    const lessons = (sec.lessons || []).map((les, lIdx) => ({
      _id: les._id || makeObjectId(),
      title: les.title || `Lesson ${lIdx + 1}`,
      description: les.description || '',
      contentType: les.contentType || 'video',
      videoUrl: les.videoUrl || 'https://example.com/video.mp4',
      textContent: les.textContent || 'Lesson content here',
      attachmentUrl: les.attachmentUrl || '',
      duration: les.duration || '10 mins',
      sortOrder: les.sortOrder !== undefined ? les.sortOrder : lIdx,
      isPublished: les.isPublished !== undefined ? les.isPublished : true,
    }));

    return {
      _id: secId,
      title: sec.title || `Section ${sIdx + 1}`,
      description: sec.description || '',
      sortOrder: sec.sortOrder !== undefined ? sec.sortOrder : sIdx,
      lessons,
    };
  });

  const course = {
    _id: courseId,
    title: data.title || 'Test Course',
    slug: data.slug || `test-course-${courseId.toString().slice(-4)}`,
    summary: data.summary || 'Summary of test course',
    description: data.description || 'Full description of test course',
    instructor: data.instructor ? data.instructor._id || data.instructor : makeObjectId(),
    category: data.category || 'Development',
    level: data.level || 'Intermediate',
    thumbnail: data.thumbnail || '',
    learningObjectives: data.learningObjectives || ['Objective 1'],
    prerequisites: data.prerequisites || '',
    intendedAudience: data.intendedAudience || '',
    estimatedDuration: data.estimatedDuration || '4 weeks',
    language: data.language || 'English',
    status: data.status || 'draft',
    rejectionReason: data.rejectionReason || '',
    publishedAt: data.status === 'published' ? new Date() : null,
    sections,
    createdAt: new Date(),
    updatedAt: new Date(),
    async save() {
      const idx = mockCourses.findIndex((c) => c._id.toString() === this._id.toString());
      if (idx !== -1) mockCourses[idx] = this;
      else mockCourses.push(this);
      return this;
    },
    async deleteOne() {
      const idx = mockCourses.findIndex((c) => c._id.toString() === this._id.toString());
      if (idx !== -1) mockCourses.splice(idx, 1);
      return { acknowledged: true, deletedCount: 1 };
    },
  };

  // Attach subdocument helpers to sections and lessons
  course.sections.id = function (id) {
    return this.find((s) => s._id.toString() === id.toString());
  };
  course.sections.pull = function ({ _id }) {
    const idx = this.findIndex((s) => s._id.toString() === _id.toString());
    if (idx !== -1) this.splice(idx, 1);
  };
  course.sections.forEach((sec) => {
    sec.lessons.id = function (id) {
      return this.find((l) => l._id.toString() === id.toString());
    };
    sec.lessons.pull = function ({ _id }) {
      const idx = this.findIndex((l) => l._id.toString() === _id.toString());
      if (idx !== -1) this.splice(idx, 1);
    };
  });

  mockCourses.push(course);
  return course;
};

const makeToken = (user) => {
  return jwt.sign(
    { id: user._id.toString(), role: user.role },
    TEST_SECRET,
    { expiresIn: '1h' }
  );
};

// Setup model mocks before each test
test.beforeEach(() => {
  resetTestDb();

  // User model stubs
  User.findById = (id) => {
    const found = mockUsers.find((u) => u._id.toString() === (id ? id.toString() : ''));
    const p = Promise.resolve(found || null);
    p.select = () => p;
    return p;
  };

  User.findOne = (query) => {
    const found = mockUsers.find((u) => {
      if (query.email && u.email !== query.email.toLowerCase()) return false;
      if (query.role && u.role !== query.role) return false;
      return true;
    });
    const p = Promise.resolve(found || null);
    p.select = () => p;
    return p;
  };

  // Course model stubs
  Course.generateSlug = async (title) => {
    const base = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return `${base}-${Date.now().toString().slice(-4)}`;
  };

  Course.create = async (data) => {
    return createMockCourse(data);
  };

  Course.findById = (id) => {
    const found = mockCourses.find((c) => c._id.toString() === (id ? id.toString() : ''));
    const p = Promise.resolve(found || null);
    p.populate = () => p;
    return p;
  };

  Course.findOne = (query) => {
    const found = mockCourses.find((c) => {
      if (query._id && c._id.toString() !== query._id.toString()) return false;
      if (query.slug && c.slug !== query.slug) return false;
      if (query.title && c.title !== query.title) return false;
      return true;
    });
    const p = Promise.resolve(found ? { ...found } : null);
    p.populate = (path, fields) => {
      if (found && path === 'instructor') {
        const instUser = mockUsers.find((u) => u._id.toString() === found.instructor.toString());
        found.instructor = instUser || { _id: found.instructor, name: 'Instructor', email: 'inst@test.com' };
      }
      return Promise.resolve(found ? { ...found } : null);
    };
    return p;
  };

  Course.find = (query = {}) => {
    let list = [...mockCourses];
    if (query.status) list = list.filter((c) => c.status === query.status);
    if (query.instructor) list = list.filter((c) => c.instructor.toString() === query.instructor.toString());
    if (query.category) list = list.filter((c) => c.category === query.category);
    if (query.level) list = list.filter((c) => c.level === query.level);

    const queryObj = {
      populate: (path) => {
        list = list.map((c) => {
          if (path === 'instructor') {
            const inst = mockUsers.find((u) => u._id.toString() === c.instructor.toString());
            return { ...c, instructor: inst || { _id: c.instructor, name: 'Instructor' } };
          }
          return c;
        });
        return queryObj;
      },
      sort: () => queryObj,
      skip: () => queryObj,
      limit: () => queryObj,
      lean: () => Promise.resolve(list),
      then: (resolve) => Promise.resolve(list).then(resolve),
    };
    return queryObj;
  };

  Course.countDocuments = (query = {}) => {
    let list = [...mockCourses];
    if (query.status) list = list.filter((c) => c.status === query.status);
    if (query.instructor) list = list.filter((c) => c.instructor.toString() === query.instructor.toString());
    return Promise.resolve(list.length);
  };

  // Enrollment model stubs
  Enrollment.create = async (data) => {
    const enrollment = {
      _id: makeObjectId(),
      student: data.student,
      course: data.course,
      enrolledAt: data.enrolledAt || new Date(),
      status: data.status || 'active',
      completedLessons: data.completedLessons || [],
      lastAccessedLesson: data.lastAccessedLesson || null,
      lastAccessedAt: new Date(),
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

  Enrollment.findOne = (query = {}) => {
    const found = mockEnrollments.find((e) => {
      if (query.student && e.student.toString() !== query.student.toString()) return false;
      if (query.course && e.course.toString() !== query.course.toString()) return false;
      if (query.status && e.status !== query.status) return false;
      return true;
    });

    const p = Promise.resolve(found || null);
    p.lean = () => Promise.resolve(found ? { ...found } : null);
    p.populate = () => p;
    return p;
  };

  Enrollment.find = (query = {}) => {
    let list = [...mockEnrollments];
    if (query.student) list = list.filter((e) => e.student.toString() === query.student.toString());
    if (query.status) list = list.filter((e) => e.status === query.status);

    const queryObj = {
      populate: () => queryObj,
      sort: () => queryObj,
      lean: () => Promise.resolve(list),
      then: (resolve) => Promise.resolve(list).then(resolve),
    };
    return queryObj;
  };

  Enrollment.countDocuments = (query = {}) => {
    let list = [...mockEnrollments];
    if (query.course) list = list.filter((e) => e.course.toString() === query.course.toString());
    if (query.student) list = list.filter((e) => e.student.toString() === query.student.toString());
    if (query.status) list = list.filter((e) => e.status === query.status);
    return Promise.resolve(list.length);
  };

  Enrollment.aggregate = () => Promise.resolve([]);
});

// --- Test Suites ---

test('1. GET /api/courses returns only published courses to public catalog', async () => {
  const instructor = createMockUser({ name: 'Prof Smith', email: 'smith@example.com', role: 'instructor' });
  createMockCourse({ title: 'Published Track', status: 'published', instructor: instructor._id });
  createMockCourse({ title: 'Draft Secrets', status: 'draft', instructor: instructor._id });

  const res = await request(app).get('/api/courses');
  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.body.courses.length, 1);
  assert.strictEqual(res.body.courses[0].title, 'Published Track');
  assert.strictEqual(res.body.pagination.total, 1);
});

test('2. GET /api/courses sanitizes curriculum preview (no private videoUrl or textContent)', async () => {
  const instructor = createMockUser({ name: 'Prof Smith', email: 'smith@example.com', role: 'instructor' });
  const course = createMockCourse({
    title: 'Secure Course',
    slug: 'secure-course',
    status: 'published',
    instructor: instructor._id,
    sections: [
      {
        title: 'Section 1',
        lessons: [
          {
            title: 'Secret Lesson 1',
            videoUrl: 'https://cdn.example.com/private-video.mp4',
            textContent: 'Confidential lecture notes',
          },
        ],
      },
    ],
  });

  const res = await request(app).get(`/api/courses/${course.slug}`);
  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.body.isEnrolled, false);
  assert.strictEqual(res.body.hasFullAccess, false);

  const previewLesson = res.body.course.sections[0].lessons[0];
  assert.strictEqual(previewLesson.title, 'Secret Lesson 1');
  assert.strictEqual(previewLesson.videoUrl, undefined, 'videoUrl should not be exposed to unenrolled public');
  assert.strictEqual(previewLesson.textContent, undefined, 'textContent should not be exposed to unenrolled public');
});

test('3. Student cannot create course via instructor API (403 Forbidden)', async () => {
  const student = createMockUser({ name: 'Bob Student', email: 'bob@example.com', role: 'student' });
  const token = makeToken(student);

  const res = await request(app)
    .post('/api/instructor/courses')
    .set('Cookie', `jwt=${token}`)
    .send({
      title: 'Hacked Course',
      summary: 'Summary',
      description: 'Description',
    });

  assert.strictEqual(res.statusCode, 403);
  assert.ok(res.body.error);
});

test('4. Authorized instructor can create course as draft', async () => {
  const instructor = createMockUser({ name: 'Alice Teacher', email: 'alice@example.com', role: 'instructor' });
  const token = makeToken(instructor);

  const res = await request(app)
    .post('/api/instructor/courses')
    .set('Cookie', `jwt=${token}`)
    .send({
      title: 'New React Mastery',
      summary: 'Hands-on React engineering from fundamentals to hooks.',
      description: 'Comprehensive React course description.',
      category: 'Development',
      level: 'Intermediate',
    });

  assert.strictEqual(res.statusCode, 201);
  assert.strictEqual(res.body.course.title, 'New React Mastery');
  assert.strictEqual(res.body.course.status, 'draft');
  assert.ok(res.body.course.slug);
});

test('5. Instructor cannot edit another instructor\'s course (403 Forbidden)', async () => {
  const instructorA = createMockUser({ name: 'Instructor A', email: 'inst_a@example.com', role: 'instructor' });
  const instructorB = createMockUser({ name: 'Instructor B', email: 'inst_b@example.com', role: 'instructor' });

  const courseA = createMockCourse({
    title: 'Instructor A Course',
    instructor: instructorA._id,
    status: 'draft',
  });

  const tokenB = makeToken(instructorB);

  const res = await request(app)
    .patch(`/api/instructor/courses/${courseA._id}`)
    .set('Cookie', `jwt=${tokenB}`)
    .send({ title: 'Hijacked Title' });

  assert.strictEqual(res.statusCode, 403);
});

test('6. Instructor can add section and lesson to their own course', async () => {
  const instructor = createMockUser({ name: 'Instructor A', email: 'inst_a@example.com', role: 'instructor' });
  const course = createMockCourse({
    title: 'Interactive Web',
    instructor: instructor._id,
    status: 'draft',
  });

  const token = makeToken(instructor);

  // Add section
  const secRes = await request(app)
    .post(`/api/instructor/courses/${course._id}/sections`)
    .set('Cookie', `jwt=${token}`)
    .send({ title: 'Section 1: Architecture', description: 'Overview' });

  assert.strictEqual(secRes.statusCode, 201);
  assert.strictEqual(secRes.body.section.title, 'Section 1: Architecture');

  const sectionId = secRes.body.section._id;

  // Add lesson
  const lesRes = await request(app)
    .post(`/api/instructor/courses/${course._id}/sections/${sectionId}/lessons`)
    .set('Cookie', `jwt=${token}`)
    .send({
      title: 'Lesson 1.1: Component Trees',
      contentType: 'video',
      videoUrl: 'https://youtube.com/watch?v=12345',
      duration: '15 mins',
    });

  assert.strictEqual(lesRes.statusCode, 201);
  assert.strictEqual(lesRes.body.lesson.title, 'Lesson 1.1: Component Trees');
});

test('7. Student can enroll in published course and duplicate enrollment is idempotent', async () => {
  const instructor = createMockUser({ name: 'Prof Smith', email: 'smith@example.com', role: 'instructor' });
  const student = createMockUser({ name: 'Charlie', email: 'charlie@example.com', role: 'student' });
  const course = createMockCourse({
    title: 'Published Course',
    status: 'published',
    instructor: instructor._id,
  });

  const token = makeToken(student);

  // 1st enrollment: 201 Created
  const res1 = await request(app)
    .post(`/api/courses/${course._id}/enroll`)
    .set('Cookie', `jwt=${token}`);

  assert.strictEqual(res1.statusCode, 201);
  assert.strictEqual(res1.body.enrollment.status, 'active');

  // 2nd duplicate enrollment: 200 OK (idempotent, no error)
  const res2 = await request(app)
    .post(`/api/courses/${course._id}/enroll`)
    .set('Cookie', `jwt=${token}`);

  assert.strictEqual(res2.statusCode, 200);
  assert.strictEqual(res2.body.message, 'You are already enrolled in this course.');
});

test('8. Unenrolled student cannot access protected lesson content (403 Forbidden)', async () => {
  const instructor = createMockUser({ name: 'Prof Smith', email: 'smith@example.com', role: 'instructor' });
  const unenrolledStudent = createMockUser({ name: 'Visitor', email: 'visitor@example.com', role: 'student' });
  const course = createMockCourse({
    title: 'Protected Curriculum',
    slug: 'protected-curriculum',
    status: 'published',
    instructor: instructor._id,
    sections: [
      {
        title: 'Section 1',
        lessons: [{ title: 'Secret Lesson', videoUrl: 'https://secret.mp4' }],
      },
    ],
  });

  const lessonId = course.sections[0].lessons[0]._id;
  const token = makeToken(unenrolledStudent);

  const res = await request(app)
    .get(`/api/courses/${course.slug}/lessons/${lessonId}`)
    .set('Cookie', `jwt=${token}`);

  assert.strictEqual(res.statusCode, 403);
  assert.ok(res.body.error);
});

test('9. Enrolled student accesses full lesson content and can mark it complete', async () => {
  const instructor = createMockUser({ name: 'Prof Smith', email: 'smith@example.com', role: 'instructor' });
  const student = createMockUser({ name: 'Enrolled Sam', email: 'sam@example.com', role: 'student' });
  const course = createMockCourse({
    title: 'Full Course',
    slug: 'full-course',
    status: 'published',
    instructor: instructor._id,
    sections: [
      {
        title: 'Section 1',
        lessons: [
          {
            title: 'Full Lesson',
            videoUrl: 'https://cdn.example.com/video.mp4',
            textContent: '# Full Markdown Text',
          },
        ],
      },
    ],
  });

  const lessonId = course.sections[0].lessons[0]._id;

  // Enroll Sam
  await Enrollment.create({
    student: student._id,
    course: course._id,
    status: 'active',
  });

  const token = makeToken(student);

  // Sam views lesson
  const res = await request(app)
    .get(`/api/courses/${course.slug}/lessons/${lessonId}`)
    .set('Cookie', `jwt=${token}`);

  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.body.lesson.title, 'Full Lesson');
  assert.strictEqual(res.body.lesson.videoUrl, 'https://cdn.example.com/video.mp4');
  assert.strictEqual(res.body.lesson.textContent, '# Full Markdown Text');

  // Sam marks lesson complete
  const completeRes = await request(app)
    .post(`/api/courses/${course._id}/lessons/${lessonId}/complete`)
    .set('Cookie', `jwt=${token}`);

  assert.strictEqual(completeRes.statusCode, 200);
  assert.strictEqual(completeRes.body.isCompleted, true);
});

test('10. Admin can approve or reject pending courses', async () => {
  const instructor = createMockUser({ name: 'Teacher', email: 'teacher@example.com', role: 'instructor' });
  const admin = createMockUser({ name: 'Admin', email: 'admin@example.com', role: 'admin' });

  const pendingCourse = createMockCourse({
    title: 'Pending Course for Review',
    status: 'pending_review',
    instructor: instructor._id,
  });

  const adminToken = makeToken(admin);

  // Admin approves course
  const approveRes = await request(app)
    .patch(`/api/admin/courses/${pendingCourse._id}/approve`)
    .set('Cookie', `jwt=${adminToken}`);

  assert.strictEqual(approveRes.statusCode, 200);
  assert.strictEqual(approveRes.body.course.status, 'published');

  // Admin rejects course
  const rejectRes = await request(app)
    .patch(`/api/admin/courses/${pendingCourse._id}/reject`)
    .set('Cookie', `jwt=${adminToken}`)
    .send({ rejectionReason: 'Video audio is distorted in lesson 2.' });

  assert.strictEqual(rejectRes.statusCode, 200);
  assert.strictEqual(rejectRes.body.course.status, 'rejected');
  assert.strictEqual(rejectRes.body.course.rejectionReason, 'Video audio is distorted in lesson 2.');
});
