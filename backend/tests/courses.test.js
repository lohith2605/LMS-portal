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
    price: data.price !== undefined ? data.price : 0,
    currency: data.currency || 'INR',
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
    p.select = () => p;
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

  const filterCourseList = (query = {}) => {
    let list = [...mockCourses];
    if (query.status) list = list.filter((c) => c.status === query.status);
    if (query.instructor) list = list.filter((c) => c.instructor.toString() === query.instructor.toString());
    if (query.category) list = list.filter((c) => c.category === query.category);
    if (query.level) list = list.filter((c) => c.level === query.level);
    if (query.$or && Array.isArray(query.$or)) {
      list = list.filter((c) => {
        return query.$or.some((cond) => {
          if (cond.title && cond.title.$regex) {
            const re = new RegExp(cond.title.$regex, cond.title.$options || 'i');
            if (re.test(c.title || '')) return true;
          }
          if (cond.summary && cond.summary.$regex) {
            const re = new RegExp(cond.summary.$regex, cond.summary.$options || 'i');
            if (re.test(c.summary || '')) return true;
          }
          if (cond.description && cond.description.$regex) {
            const re = new RegExp(cond.description.$regex, cond.description.$options || 'i');
            if (re.test(c.description || '')) return true;
          }
          return false;
        });
      });
    }
    return list;
  };

  Course.find = (query = {}) => {
    let list = filterCourseList(query);
    let skipVal = 0;
    let limitVal = list.length;
    let sortObj = null;

    const queryObj = {
      populate: (path) => {
        list = list.map((c) => {
          if (path.startsWith('instructor')) {
            const inst = mockUsers.find((u) => u._id.toString() === (c.instructor ? (c.instructor._id || c.instructor).toString() : ''));
            return { ...c, instructor: inst || { _id: c.instructor, name: 'Instructor', email: 'instructor@example.com' } };
          }
          return c;
        });
        return queryObj;
      },
      select: () => queryObj,
      sort: (s) => {
        sortObj = s;
        return queryObj;
      },
      skip: (n) => {
        skipVal = Math.max(0, n || 0);
        return queryObj;
      },
      limit: (n) => {
        limitVal = Math.max(0, n || 0);
        return queryObj;
      },
      lean: () => {
        let res = [...list];
        if (sortObj) {
          if (sortObj.title === 1) {
            res.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
          } else if (sortObj.createdAt === -1) {
            res.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          } else if (sortObj.updatedAt === -1) {
            res.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
          }
        }
        return Promise.resolve(res.slice(skipVal, skipVal + limitVal));
      },
      then: (resolve) => queryObj.lean().then(resolve),
    };
    return queryObj;
  };

  Course.countDocuments = (query = {}) => {
    const list = filterCourseList(query);
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
      if (query.status) {
        if (typeof query.status === 'object' && Array.isArray(query.status.$in)) {
          if (!query.status.$in.includes(e.status)) return false;
        } else if (e.status !== query.status) {
          return false;
        }
      }
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
    if (query.course) {
      if (typeof query.course === 'object' && Array.isArray(query.course.$in)) {
        list = list.filter((e) => query.course.$in.some((id) => id.toString() === e.course.toString()));
      } else {
        list = list.filter((e) => e.course.toString() === query.course.toString());
      }
    }
    if (query.status) {
      if (typeof query.status === 'object' && Array.isArray(query.status.$in)) {
        list = list.filter((e) => query.status.$in.includes(e.status));
      } else {
        list = list.filter((e) => e.status === query.status);
      }
    }

    const queryObj = {
      populate: (path) => {
        list = list.map((e) => {
          const cloned = { ...e };
          if (path === 'student') {
            const st = mockUsers.find((u) => u._id.toString() === (e.student._id || e.student).toString());
            cloned.student = st || { _id: e.student, name: 'Student', email: 'student@example.com' };
          }
          if (path === 'course') {
            const cr = mockCourses.find((c) => c._id.toString() === (e.course._id || e.course).toString());
            cloned.course = cr || { _id: e.course, title: 'Course', sections: [] };
          }
          return cloned;
        });
        return queryObj;
      },
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

test('11. GET /api/courses searches published courses by keyword across title, summary, and description', async () => {
  const instructor = createMockUser({ name: 'Teacher', email: 'teacher@example.com', role: 'instructor' });
  createMockCourse({
    title: 'Modern TypeScript and Node',
    summary: 'Build robust backend architectures with type safety.',
    description: 'Deep dive into advanced TypeScript patterns.',
    category: 'Development',
    status: 'published',
    instructor: instructor._id,
  });
  createMockCourse({
    title: 'Figma to UI Components',
    summary: 'Design systems and accessible interfaces.',
    description: 'Learn modern design token workflows.',
    category: 'Design',
    status: 'published',
    instructor: instructor._id,
  });
  createMockCourse({
    title: 'Draft Secret Node Course',
    summary: 'Node internals under construction.',
    description: 'Not yet ready for learners.',
    category: 'Development',
    status: 'draft',
    instructor: instructor._id,
  });

  const res = await request(app).get('/api/courses?search=typescript');
  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.body.courses.length, 1);
  assert.strictEqual(res.body.courses[0].title, 'Modern TypeScript and Node');
  assert.strictEqual(res.body.pagination.total, 1);

  // Search matching summary keyword
  const summaryRes = await request(app).get('/api/courses?search=interfaces');
  assert.strictEqual(summaryRes.statusCode, 200);
  assert.strictEqual(summaryRes.body.courses.length, 1);
  assert.strictEqual(summaryRes.body.courses[0].title, 'Figma to UI Components');
});

test('12. GET /api/courses filters courses by category and ignores All', async () => {
  const instructor = createMockUser({ name: 'Teacher', email: 'teacher@example.com', role: 'instructor' });
  createMockCourse({
    title: 'PostgreSQL Database Optimization',
    category: 'Data',
    status: 'published',
    instructor: instructor._id,
  });
  createMockCourse({
    title: 'Product Management Essentials',
    category: 'Business',
    status: 'published',
    instructor: instructor._id,
  });

  // Filter category Data
  const dataRes = await request(app).get('/api/courses?category=Data');
  assert.strictEqual(dataRes.statusCode, 200);
  assert.strictEqual(dataRes.body.courses.length, 1);
  assert.strictEqual(dataRes.body.courses[0].category, 'Data');

  // category=All should return all published courses
  const allRes = await request(app).get('/api/courses?category=All');
  assert.strictEqual(allRes.statusCode, 200);
  assert.strictEqual(allRes.body.courses.length, 2);
});

test('13. GET /api/courses filters courses by level and ignores All', async () => {
  const instructor = createMockUser({ name: 'Teacher', email: 'teacher@example.com', role: 'instructor' });
  createMockCourse({
    title: 'Intro to Python',
    level: 'Beginner',
    status: 'published',
    instructor: instructor._id,
  });
  createMockCourse({
    title: 'Advanced Distributed Systems',
    level: 'Advanced',
    status: 'published',
    instructor: instructor._id,
  });

  const advRes = await request(app).get('/api/courses?level=Advanced');
  assert.strictEqual(advRes.statusCode, 200);
  assert.strictEqual(advRes.body.courses.length, 1);
  assert.strictEqual(advRes.body.courses[0].level, 'Advanced');

  const allRes = await request(app).get('/api/courses?level=All');
  assert.strictEqual(allRes.statusCode, 200);
  assert.strictEqual(allRes.body.courses.length, 2);
});

test('14. GET /api/courses sorts courses by title and newest', async () => {
  const instructor = createMockUser({ name: 'Teacher', email: 'teacher@example.com', role: 'instructor' });
  createMockCourse({
    title: 'Zebra Testing Track',
    status: 'published',
    instructor: instructor._id,
  });
  createMockCourse({
    title: 'Alpha Architecture Track',
    status: 'published',
    instructor: instructor._id,
  });

  const sortRes = await request(app).get('/api/courses?sort=title');
  assert.strictEqual(sortRes.statusCode, 200);
  assert.strictEqual(sortRes.body.courses[0].title, 'Alpha Architecture Track');
  assert.strictEqual(sortRes.body.courses[1].title, 'Zebra Testing Track');
});

test('15. GET /api/courses enforces bounded pagination', async () => {
  const instructor = createMockUser({ name: 'Teacher', email: 'teacher@example.com', role: 'instructor' });
  for (let i = 1; i <= 5; i++) {
    createMockCourse({
      title: `Course Number ${i}`,
      status: 'published',
      instructor: instructor._id,
    });
  }

  // Page 1 with limit 2
  const p1Res = await request(app).get('/api/courses?page=1&limit=2');
  assert.strictEqual(p1Res.statusCode, 200);
  assert.strictEqual(p1Res.body.courses.length, 2);
  assert.strictEqual(p1Res.body.pagination.page, 1);
  assert.strictEqual(p1Res.body.pagination.limit, 2);
  assert.strictEqual(p1Res.body.pagination.total, 5);
  assert.strictEqual(p1Res.body.pagination.totalPages, 3);

  // Negative page or excessive limit bounds safely
  const boundedRes = await request(app).get('/api/courses?page=-5&limit=200');
  assert.strictEqual(boundedRes.statusCode, 200);
  assert.strictEqual(boundedRes.body.pagination.page, 1);
  assert.strictEqual(boundedRes.body.pagination.limit, 50);
});

test('16. GET /api/courses returns empty results and never leaks unpublished courses', async () => {
  const instructor = createMockUser({ name: 'Teacher', email: 'teacher@example.com', role: 'instructor' });
  createMockCourse({
    title: 'Draft Unreleased Course',
    summary: 'Secret subject',
    status: 'draft',
    instructor: instructor._id,
  });
  createMockCourse({
    title: 'Pending Review Course',
    summary: 'Awaiting admin approval',
    status: 'pending_review',
    instructor: instructor._id,
  });

  const res = await request(app).get('/api/courses?search=Secret');
  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.body.courses.length, 0);
  assert.strictEqual(res.body.pagination.total, 0);
});

test('17. Instructor creates course with curriculum sections as draft; draft is excluded from admin pending queue', async () => {
  const instructor = createMockUser({ name: 'Curriculum Author', email: 'author@example.com', role: 'instructor' });
  const admin = createMockUser({ name: 'Admin Overseer', email: 'admin@learnspace.io', role: 'admin' });
  const instructorToken = makeToken(instructor);
  const adminToken = makeToken(admin);

  // Instructor creates course with atomic sections
  const createRes = await request(app)
    .post('/api/instructor/courses')
    .set('Authorization', `Bearer ${instructorToken}`)
    .send({
      title: 'Distributed Systems & Cloud Patterns',
      summary: 'Production architectures and resilient cloud design',
      description: 'Comprehensive guide covering microservices, consensus, and event streaming.',
      category: 'Cloud Computing',
      level: 'Advanced',
      sections: [
        {
          title: 'Module 1: Distributed Fundamentals',
          description: 'CAP Theorem and Consensus Protocols',
          lessons: [
            {
              title: 'Lesson 1.1: Raft and Paxos',
              contentType: 'video',
              videoUrl: 'https://example.com/raft.mp4',
              duration: '15 mins',
            },
          ],
        },
      ],
    });

  assert.strictEqual(createRes.statusCode, 201);
  assert.strictEqual(createRes.body.course.status, 'draft');
  assert.strictEqual(createRes.body.course.sections.length, 1);
  assert.strictEqual(createRes.body.course.sections[0].lessons.length, 1);

  // Admin pending queue must be empty
  const pendingRes = await request(app)
    .get('/api/admin/courses/pending')
    .set('Authorization', `Bearer ${adminToken}`);

  assert.strictEqual(pendingRes.statusCode, 200);
  assert.strictEqual(pendingRes.body.pendingCourses.length, 0);
  assert.strictEqual(pendingRes.body.count, 0);
});

test('18. Instructor submits course for review via POST /api/instructor/courses/:id/submit-for-review', async () => {
  const instructor = createMockUser({ name: 'Curriculum Author', email: 'author@example.com', role: 'instructor' });
  const token = makeToken(instructor);

  const course = createMockCourse({
    title: 'Modern React Architecture',
    summary: 'Design systems and performance tuning in React 19',
    description: 'Learn modern React with concurrent mode, suspense, and server components.',
    instructor: instructor._id,
    status: 'draft',
    sections: [
      {
        title: 'Section 1: Foundations',
        lessons: [
          { title: 'Lesson 1: React 19 Compiler', duration: '12 mins' },
        ],
      },
    ],
  });

  const submitRes = await request(app)
    .post(`/api/instructor/courses/${course._id}/submit-for-review`)
    .set('Authorization', `Bearer ${token}`);

  assert.strictEqual(submitRes.statusCode, 200);
  assert.strictEqual(submitRes.body.course.status, 'pending_review');
  assert.strictEqual(submitRes.body.course.rejectionReason, '');
});

test('19. Admin GET /api/admin/courses/pending returns submitted course with populated instructor and counts', async () => {
  const instructor = createMockUser({ name: 'Prof. Ada Lovelace', email: 'ada@computing.org', role: 'instructor' });
  const admin = createMockUser({ name: 'Platform Admin', email: 'admin@learnspace.io', role: 'admin' });
  const adminToken = makeToken(admin);

  createMockCourse({
    title: 'Algorithms and Data Structures',
    summary: 'Essential computer science algorithms',
    description: 'Master binary search trees, graph theory, and dynamic programming.',
    category: 'Computer Science',
    level: 'Intermediate',
    instructor: instructor._id,
    status: 'pending_review',
    sections: [
      {
        title: 'Graphs & Shortest Paths',
        lessons: [
          { title: 'Dijkstra and A* Search', duration: '20 mins' },
          { title: 'Bellman-Ford Algorithm', duration: '15 mins' },
        ],
      },
    ],
  });

  const res = await request(app)
    .get('/api/admin/courses/pending')
    .set('Authorization', `Bearer ${adminToken}`);

  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.body.count, 1);
  assert.strictEqual(res.body.pendingCourses.length, 1);

  const pending = res.body.pendingCourses[0];
  assert.strictEqual(pending.title, 'Algorithms and Data Structures');
  assert.strictEqual(pending.status, 'pending_review');
  assert.strictEqual(pending.totalSections, 1);
  assert.strictEqual(pending.totalLessons, 2);
  assert.strictEqual(pending.instructor.name, 'Prof. Ada Lovelace');
  assert.strictEqual(pending.instructor.email, 'ada@computing.org');
  assert(Array.isArray(pending.sections));
});

test('20. Non-admin calling GET /api/admin/courses/pending is rejected with 403 Forbidden', async () => {
  const student = createMockUser({ name: 'Regular Learner', email: 'learner@example.com', role: 'student' });
  const studentToken = makeToken(student);

  const res = await request(app)
    .get('/api/admin/courses/pending')
    .set('Authorization', `Bearer ${studentToken}`);

  assert.strictEqual(res.statusCode, 403);
});

test('21. Admin approves course -> status becomes published and leaves pending queue', async () => {
  const instructor = createMockUser({ name: 'Instructor Bob', email: 'bob@example.com', role: 'instructor' });
  const admin = createMockUser({ name: 'Super Admin', email: 'admin@learnspace.io', role: 'admin' });
  const adminToken = makeToken(admin);

  const course = createMockCourse({
    title: 'Zero-Trust Security Systems',
    summary: 'Enterprise identity and network security',
    description: 'Practical implementation of mutual TLS, OAuth 2.1, and micro-segmentation.',
    instructor: instructor._id,
    status: 'pending_review',
    sections: [
      {
        title: 'Identity Provider Setup',
        lessons: [{ title: 'Configuring OIDC and PKCE', duration: '18 mins' }],
      },
    ],
  });

  // Admin approves course
  const approveRes = await request(app)
    .patch(`/api/admin/courses/${course._id}/approve`)
    .set('Authorization', `Bearer ${adminToken}`);

  assert.strictEqual(approveRes.statusCode, 200);
  assert.strictEqual(approveRes.body.course.status, 'published');
  assert(approveRes.body.course.publishedAt);

  // Verify pending queue is now empty
  const pendingRes = await request(app)
    .get('/api/admin/courses/pending')
    .set('Authorization', `Bearer ${adminToken}`);

  assert.strictEqual(pendingRes.statusCode, 200);
  assert.strictEqual(pendingRes.body.pendingCourses.length, 0);
  assert.strictEqual(pendingRes.body.count, 0);
});

test('22. Admin rejects course with feedback -> status becomes rejected; instructor edits and resubmits', async () => {
  const instructor = createMockUser({ name: 'Instructor Carol', email: 'carol@example.com', role: 'instructor' });
  const admin = createMockUser({ name: 'Super Admin', email: 'admin@learnspace.io', role: 'admin' });
  const instructorToken = makeToken(instructor);
  const adminToken = makeToken(admin);

  const course = createMockCourse({
    title: 'Introductory Python Course',
    summary: 'Beginner Python scripting',
    description: 'Learn variables, loops, and functions in Python.',
    instructor: instructor._id,
    status: 'pending_review',
    sections: [
      {
        title: 'Getting Started',
        lessons: [{ title: 'Hello World in Python', duration: '5 mins' }],
      },
    ],
  });

  // Admin rejects course
  const rejectRes = await request(app)
    .patch(`/api/admin/courses/${course._id}/reject`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ rejectionReason: 'Please add more comprehensive coding exercises and video explanations.' });

  assert.strictEqual(rejectRes.statusCode, 200);
  assert.strictEqual(rejectRes.body.course.status, 'rejected');
  assert.strictEqual(rejectRes.body.course.rejectionReason, 'Please add more comprehensive coding exercises and video explanations.');

  // Instructor edits course -> status returns to draft and clears rejectionReason
  const updateRes = await request(app)
    .patch(`/api/instructor/courses/${course._id}`)
    .set('Authorization', `Bearer ${instructorToken}`)
    .send({ summary: 'Updated beginner Python course with hands-on coding exercises' });

  assert.strictEqual(updateRes.statusCode, 200);
  assert.strictEqual(updateRes.body.course.status, 'draft');
  assert.strictEqual(updateRes.body.course.rejectionReason, '');

  // Instructor resubmits for review -> status returns to pending_review
  const resubmitRes = await request(app)
    .post(`/api/instructor/courses/${course._id}/submit-for-review`)
    .set('Authorization', `Bearer ${instructorToken}`);

  assert.strictEqual(resubmitRes.statusCode, 200);
  assert.strictEqual(resubmitRes.body.course.status, 'pending_review');

  // Admin sees it back in pending courses
  const pendingRes = await request(app)
    .get('/api/admin/courses/pending')
    .set('Authorization', `Bearer ${adminToken}`);

  assert.strictEqual(pendingRes.statusCode, 200);
  assert.strictEqual(pendingRes.body.pendingCourses.length, 1);
  assert.strictEqual(pendingRes.body.pendingCourses[0].title, 'Introductory Python Course');
});

test('23. Instructor can fetch enrolled learners directory via GET /api/instructor/learners', async () => {
  const instructor = createMockUser({ name: 'Professor Turing', email: 'turing@univ.edu', role: 'instructor' });
  const student = createMockUser({ name: 'Enrolled Learner', email: 'learner@school.edu', role: 'student' });
  const instructorToken = makeToken(instructor);

  const course = createMockCourse({
    title: 'Theoretical Computer Science',
    instructor: instructor._id,
    status: 'published',
    sections: [
      {
        title: 'Section 1',
        lessons: [{ title: 'Lesson 1', duration: '10 mins' }],
      },
    ],
  });

  // Create active enrollment for this course
  await Enrollment.create({
    student: student._id,
    course: course._id,
    status: 'active',
    enrollmentType: 'free',
  });

  const res = await request(app)
    .get('/api/instructor/learners')
    .set('Authorization', `Bearer ${instructorToken}`);

  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.body.count, 1);
  assert.strictEqual(res.body.learners.length, 1);
  assert.strictEqual(res.body.learners[0].student.email, 'learner@school.edu');
  assert.strictEqual(res.body.learners[0].student.name, 'Enrolled Learner');
  assert.strictEqual(res.body.learners[0].course.title, 'Theoretical Computer Science');
});

test('24. Non-instructor calling GET /api/instructor/learners is rejected with 403 Forbidden', async () => {
  const student = createMockUser({ name: 'Student Hacker', email: 'hacker@school.edu', role: 'student' });
  const studentToken = makeToken(student);

  const res = await request(app)
    .get('/api/instructor/learners')
    .set('Authorization', `Bearer ${studentToken}`);

  assert.strictEqual(res.statusCode, 403);
});

test('25. Lesson completion with explicit payload is idempotent on repeated requests', async () => {
  const student = createMockUser({ name: 'Sam Idempotent', email: 'sam.idem@example.com', role: 'student' });
  const lessonId = makeObjectId();

  const course = createMockCourse({
    title: 'Idempotency Test Course',
    status: 'published',
    sections: [
      {
        title: 'Section 1',
        lessons: [
          {
            _id: lessonId,
            title: 'Idempotent Lesson',
            isPublished: true,
          },
        ],
      },
    ],
  });

  const enrollment = {
    _id: makeObjectId(),
    student: student._id,
    course: course._id,
    status: 'active',
    completedLessons: [],
    async save() { return this; },
  };
  mockEnrollments.push(enrollment);

  const token = makeToken(student);

  // 1. Explicit complete: true
  const res1 = await request(app)
    .post(`/api/courses/${course._id}/lessons/${lessonId}/complete`)
    .set('Cookie', `jwt=${token}`)
    .send({ completed: true });

  assert.strictEqual(res1.statusCode, 200);
  assert.strictEqual(res1.body.isCompleted, true);
  assert.strictEqual(res1.body.completedLessons.length, 1);

  // 2. Repeated explicit complete: true (idempotent, does not duplicate or toggle off)
  const res2 = await request(app)
    .post(`/api/courses/${course._id}/lessons/${lessonId}/complete`)
    .set('Cookie', `jwt=${token}`)
    .send({ completed: true });

  assert.strictEqual(res2.statusCode, 200);
  assert.strictEqual(res2.body.isCompleted, true);
  assert.strictEqual(res2.body.completedLessons.length, 1);

  // 3. Explicit complete: false
  const res3 = await request(app)
    .post(`/api/courses/${course._id}/lessons/${lessonId}/complete`)
    .set('Cookie', `jwt=${token}`)
    .send({ completed: false });

  assert.strictEqual(res3.statusCode, 200);
  assert.strictEqual(res3.body.isCompleted, false);
  assert.strictEqual(res3.body.completedLessons.length, 0);

  // 4. Repeated explicit complete: false (idempotent)
  const res4 = await request(app)
    .post(`/api/courses/${course._id}/lessons/${lessonId}/complete`)
    .set('Cookie', `jwt=${token}`)
    .send({ completed: false });

  assert.strictEqual(res4.statusCode, 200);
  assert.strictEqual(res4.body.isCompleted, false);
  assert.strictEqual(res4.body.completedLessons.length, 0);
});

test('26. Lesson completion rejects invalid lesson/course combinations (404) and non-enrolled user (403)', async () => {
  const student = createMockUser({ name: 'Unenrolled Student', email: 'unenrolled@example.com', role: 'student' });
  const instructor = createMockUser({ name: 'Course Instructor', email: 'instructor@example.com', role: 'instructor' });
  const validLessonId = makeObjectId();
  const foreignLessonId = makeObjectId();

  const course = createMockCourse({
    title: 'Access Control Course',
    instructor: instructor._id,
    status: 'published',
    sections: [
      {
        title: 'Section 1',
        lessons: [
          {
            _id: validLessonId,
            title: 'Valid Lesson',
            isPublished: true,
          },
        ],
      },
    ],
  });

  const studentToken = makeToken(student);
  const instructorToken = makeToken(instructor);

  // 1. Unenrolled student tries to mark complete -> 403 Forbidden
  const unenrolledRes = await request(app)
    .post(`/api/courses/${course._id}/lessons/${validLessonId}/complete`)
    .set('Cookie', `jwt=${studentToken}`);

  assert.strictEqual(unenrolledRes.statusCode, 403);

  // 2. Instructor tries to mark lesson complete -> 403 Forbidden (restricted to student/admin)
  const instructorRes = await request(app)
    .post(`/api/courses/${course._id}/lessons/${validLessonId}/complete`)
    .set('Cookie', `jwt=${instructorToken}`);

  assert.strictEqual(instructorRes.statusCode, 403);

  // Now enroll student
  mockEnrollments.push({
    _id: makeObjectId(),
    student: student._id,
    course: course._id,
    status: 'active',
    completedLessons: [],
    async save() { return this; },
  });

  // 3. Foreign lesson ID not in course curriculum -> 404
  const foreignRes = await request(app)
    .post(`/api/courses/${course._id}/lessons/${foreignLessonId}/complete`)
    .set('Cookie', `jwt=${studentToken}`);

  assert.strictEqual(foreignRes.statusCode, 404);
  assert.strictEqual(foreignRes.body.error, 'Lesson not found in this course.');
});
