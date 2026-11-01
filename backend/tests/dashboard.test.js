const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { app } = require('../server');
const User = require('../models/User');

const TEST_SECRET = 'test_jwt_secret_key_12345678901234567890';
process.env.JWT_SECRET = TEST_SECRET;
process.env.NODE_ENV = 'test';

let mockUsers = [];
let nextId = 100;

const resetMockDb = () => {
  mockUsers = [];
  nextId = 100;
};

const createMockUser = (data) => {
  const user = {
    _id: data._id || `user_${nextId++}`,
    name: data.name,
    email: data.email.toLowerCase(),
    role: data.role || 'student',
    accountStatus: data.accountStatus || 'active',
    emailVerified: Boolean(data.emailVerified),
    createdAt: data.createdAt || new Date(),
    updatedAt: new Date(),
    changedPasswordAfter() {
      return false;
    },
    async save() {
      const idx = mockUsers.findIndex((u) => u._id.toString() === this._id.toString());
      if (idx !== -1) {
        mockUsers[idx] = this;
      } else {
        mockUsers.push(this);
      }
      return this;
    },
    toObject() {
      return { ...this };
    },
  };
  mockUsers.push(user);
  return user;
};

const makeToken = (user) => {
  return jwt.sign(
    { id: user._id.toString(), role: user.role },
    TEST_SECRET,
    { expiresIn: '1h' }
  );
};

const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const Assignment = require('../models/Assignment');
const AssignmentSubmission = require('../models/AssignmentSubmission');
const Certificate = require('../models/Certificate');

// Wire User, Course, and Enrollment model stubs for dashboard tests
test.beforeEach(() => {
  resetMockDb();

  User.findById = (id) => {
    const found = mockUsers.find((u) => u._id.toString() === id.toString());
    const p = Promise.resolve(found || null);
    p.select = () => p;
    return p;
  };

  User.countDocuments = (query = {}) => {
    let list = [...mockUsers];
    if (query.role) list = list.filter((u) => u.role === query.role);
    if (query.accountStatus) list = list.filter((u) => u.accountStatus === query.accountStatus);
    return Promise.resolve(list.length);
  };

  User.find = (query = {}) => {
    let list = [...mockUsers];
    if (query.role) list = list.filter((u) => u.role === query.role);
    if (query.accountStatus) list = list.filter((u) => u.accountStatus === query.accountStatus);

    const queryObj = {
      select: () => queryObj,
      sort: () => queryObj,
      skip: () => queryObj,
      limit: () => queryObj,
      lean: () => Promise.resolve(list),
      then: (resolve) => Promise.resolve(list).then(resolve),
    };
    return queryObj;
  };

  Course.countDocuments = () => Promise.resolve(0);
  Course.find = () => ({
    sort: () => ({
      limit: () => ({
        lean: () => Promise.resolve([]),
      }),
    }),
  });

  Enrollment.find = () => ({
    populate: () => ({
      sort: () => ({
        lean: () => Promise.resolve([]),
      }),
    }),
  });
  Enrollment.countDocuments = () => Promise.resolve(0);
  Enrollment.aggregate = () => Promise.resolve([]);

  AssignmentSubmission.find = () => ({
    populate: () => ({
      sort: () => ({
        limit: () => ({
          lean: () => Promise.resolve([]),
        }),
      }),
    }),
    select: () => Promise.resolve([]),
  });

  Certificate.find = () => ({
    select: () => ({
      populate: () => ({
        sort: () => ({
          limit: () => ({
            lean: () => Promise.resolve([]),
          }),
        }),
      }),
    }),
  });
});

test('1. Student Dashboard requires authentication (401)', async () => {
  const res = await request(app).get('/api/dashboard/student');
  assert.strictEqual(res.statusCode, 401);
  assert.ok(res.body.error);
});

test('2. Student Dashboard returns 200 for authenticated student', async () => {
  const student = createMockUser({ name: 'Alice Student', email: 'alice@example.com', role: 'student' });
  const token = makeToken(student);

  const res = await request(app)
    .get('/api/dashboard/student')
    .set('Cookie', [`jwt=${token}`]);

  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(typeof res.body.overview.enrolledCount, 'number');
  assert.ok(Array.isArray(res.body.announcements));
});

test('3. Instructor Dashboard requires authentication (401)', async () => {
  const res = await request(app).get('/api/dashboard/instructor');
  assert.strictEqual(res.statusCode, 401);
});

test('4. Student is rejected from Instructor Dashboard (403)', async () => {
  const student = createMockUser({ name: 'Bob Student', email: 'bob@example.com', role: 'student' });
  const token = makeToken(student);

  const res = await request(app)
    .get('/api/dashboard/instructor')
    .set('Cookie', [`jwt=${token}`]);

  assert.strictEqual(res.statusCode, 403);
  assert.ok(res.body.error.includes('Forbidden'));
});

test('5. Approved Instructor accesses Instructor Dashboard (200)', async () => {
  const instructor = createMockUser({ name: 'Dr. Smith', email: 'smith@example.com', role: 'instructor', accountStatus: 'active' });
  const token = makeToken(instructor);

  const res = await request(app)
    .get('/api/dashboard/instructor')
    .set('Cookie', [`jwt=${token}`]);

  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.body.isApproved, true);
  assert.strictEqual(res.body.accountStatus, 'active');
  assert.strictEqual(typeof res.body.overview.createdCoursesCount, 'number');
});

test('6. Non-admin is rejected from Admin Overview (403)', async () => {
  const instructor = createMockUser({ name: 'Teacher', email: 'teacher@example.com', role: 'instructor' });
  const token = makeToken(instructor);

  const res = await request(app)
    .get('/api/admin/overview')
    .set('Cookie', [`jwt=${token}`]);

  assert.strictEqual(res.statusCode, 403);
});

test('7. Admin accesses Admin Overview with real metrics (200)', async () => {
  createMockUser({ name: 'Student 1', email: 's1@example.com', role: 'student' });
  createMockUser({ name: 'Pending Inst', email: 'pinst@example.com', role: 'instructor', accountStatus: 'pending' });
  const admin = createMockUser({ name: 'Root Admin', email: 'admin@example.com', role: 'admin' });
  const token = makeToken(admin);

  const res = await request(app)
    .get('/api/admin/overview')
    .set('Cookie', [`jwt=${token}`]);

  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.body.metrics.totalUsers, 3);
  assert.strictEqual(res.body.metrics.totalStudents, 1);
  assert.strictEqual(res.body.metrics.pendingInstructors, 1);
});

test('8. Admin retrieves pending instructor queue (200)', async () => {
  createMockUser({ name: 'Applicant', email: 'app@example.com', role: 'instructor', accountStatus: 'pending' });
  const admin = createMockUser({ name: 'Admin', email: 'admin@example.com', role: 'admin' });
  const token = makeToken(admin);

  const res = await request(app)
    .get('/api/admin/instructors/pending')
    .set('Cookie', [`jwt=${token}`]);

  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.body.count, 1);
  assert.strictEqual(res.body.pendingInstructors[0].email, 'app@example.com');
});

test('9. Admin approves pending instructor application (200)', async () => {
  const pending = createMockUser({ _id: 'inst_to_approve', name: 'New Instructor', email: 'newinst@example.com', role: 'instructor', accountStatus: 'pending' });
  const admin = createMockUser({ name: 'Admin', email: 'admin@example.com', role: 'admin' });
  const token = makeToken(admin);

  const res = await request(app)
    .patch('/api/admin/instructors/inst_to_approve/approve')
    .set('Cookie', [`jwt=${token}`]);

  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(pending.accountStatus, 'active');
  assert.ok(res.body.message.includes('approved'));
});

test('10. Admin rejects instructor application (200)', async () => {
  const pending = createMockUser({ _id: 'inst_to_reject', name: 'Reject Inst', email: 'reject@example.com', role: 'instructor', accountStatus: 'pending' });
  const admin = createMockUser({ name: 'Admin', email: 'admin@example.com', role: 'admin' });
  const token = makeToken(admin);

  const res = await request(app)
    .patch('/api/admin/instructors/inst_to_reject/reject')
    .set('Cookie', [`jwt=${token}`]);

  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(pending.accountStatus, 'suspended');
});

test('11. Admin retrieves paginated user list (200)', async () => {
  createMockUser({ name: 'User 1', email: 'u1@example.com', role: 'student' });
  createMockUser({ name: 'User 2', email: 'u2@example.com', role: 'student' });
  const admin = createMockUser({ name: 'Admin', email: 'admin@example.com', role: 'admin' });
  const token = makeToken(admin);

  const res = await request(app)
    .get('/api/admin/users?page=1&limit=2')
    .set('Cookie', [`jwt=${token}`]);

  assert.strictEqual(res.statusCode, 200);
  assert.ok(Array.isArray(res.body.users));
  assert.ok(res.body.pagination);
});

test('12. Student Dashboard counts notStartedCount and handles zero-lesson courses without division by zero', async () => {
  const student = createMockUser({ _id: '507f191e810c19729de860ea', name: 'Dan Student', email: 'dan@example.com', role: 'student' });
  const token = makeToken(student);

  const mockEnrollments = [
    {
      _id: 'enroll_zero_lessons',
      student: student._id,
      status: 'active',
      completedLessons: [],
      lastAccessedAt: new Date(),
      enrolledAt: new Date(),
      course: {
        _id: 'course_empty',
        title: 'Empty Course',
        slug: 'empty-course',
        status: 'published',
        sections: [],
      },
    },
    {
      _id: 'enroll_not_started',
      student: student._id,
      status: 'active',
      completedLessons: [],
      lastAccessedAt: new Date(),
      enrolledAt: new Date(),
      course: {
        _id: 'course_normal',
        title: 'Normal Course',
        slug: 'normal-course',
        status: 'published',
        sections: [
          {
            title: 'Sec 1',
            lessons: [
              { _id: 'l1', title: 'Lesson 1', isPublished: true },
              { _id: 'l2', title: 'Lesson 2', isPublished: true },
            ],
          },
        ],
      },
    },
  ];

  Enrollment.find = () => ({
    populate: () => ({
      sort: () => ({
        lean: () => Promise.resolve(mockEnrollments),
      }),
    }),
  });

  const res = await request(app)
    .get('/api/dashboard/student')
    .set('Cookie', [`jwt=${token}`]);

  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.body.overview.enrolledCount, 2);
  assert.strictEqual(res.body.overview.notStartedCount, 2);
  assert.strictEqual(res.body.overview.inProgressCount, 0);
  assert.strictEqual(res.body.overview.completedCount, 0);
  assert.strictEqual(res.body.enrolledCourses[0].progressPercentage, 0);
  assert.strictEqual(res.body.enrolledCourses[0].totalLessons, 0);
  assert.strictEqual(res.body.enrolledCourses[1].progressPercentage, 0);
  assert.strictEqual(res.body.enrolledCourses[1].totalLessons, 2);
});

test('13. Student Dashboard ignores unpublished lessons when computing totalLessons and progress', async () => {
  const student = createMockUser({ _id: '507f191e810c19729de860eb', name: 'Eve Student', email: 'eve@example.com', role: 'student' });
  const token = makeToken(student);

  const mockEnrollments = [
    {
      _id: 'enroll_mix_published',
      student: student._id,
      status: 'active',
      completedLessons: ['l1', 'l3_draft'],
      lastAccessedAt: new Date(),
      enrolledAt: new Date(),
      course: {
        _id: 'course_mix',
        title: 'Mix Course',
        slug: 'mix-course',
        status: 'published',
        sections: [
          {
            title: 'Sec 1',
            lessons: [
              { _id: 'l1', title: 'Published 1', isPublished: true },
              { _id: 'l2', title: 'Published 2', isPublished: true },
              { _id: 'l3_draft', title: 'Draft 3', isPublished: false },
            ],
          },
        ],
      },
    },
  ];

  Enrollment.find = () => ({
    populate: () => ({
      sort: () => ({
        lean: () => Promise.resolve(mockEnrollments),
      }),
    }),
  });

  const res = await request(app)
    .get('/api/dashboard/student')
    .set('Cookie', [`jwt=${token}`]);

  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.body.overview.enrolledCount, 1);
  assert.strictEqual(res.body.overview.inProgressCount, 1);
  assert.strictEqual(res.body.overview.completedCount, 0);
  assert.strictEqual(res.body.overview.notStartedCount, 0);
  assert.strictEqual(res.body.enrolledCourses[0].totalLessons, 2);
  assert.strictEqual(res.body.enrolledCourses[0].completedCount, 1);
  assert.strictEqual(res.body.enrolledCourses[0].progressPercentage, 50);
  assert.strictEqual(res.body.enrolledCourses[0].firstLessonTitle, 'Published 1');
  assert.strictEqual(res.body.enrolledCourses[0].nextLessonTitle, 'Published 2');
  assert.strictEqual(res.body.enrolledCourses[0].certificateIssued, false);
});

test('14. Student Dashboard returns certificate details and completed state for 100% course', async () => {
  const student = createMockUser({ _id: '507f191e810c19729de860ec', name: 'Frank Student', email: 'frank@example.com', role: 'student' });
  const token = makeToken(student);

  const mockEnrollments = [
    {
      _id: 'enroll_completed',
      student: student._id,
      status: 'completed',
      isCompleted: true,
      certificateIssued: true,
      certificateId: 'LS-2026-COMP-0001',
      completedLessons: ['l1', 'l2'],
      lastAccessedAt: new Date(),
      enrolledAt: new Date(),
      course: {
        _id: 'course_completed_1',
        title: 'Completed Course',
        slug: 'completed-course',
        status: 'published',
        sections: [
          {
            title: 'Sec 1',
            lessons: [
              { _id: 'l1', title: 'Lesson 1', isPublished: true },
              { _id: 'l2', title: 'Lesson 2', isPublished: true },
            ],
          },
        ],
      },
    },
  ];

  Enrollment.find = () => ({
    populate: () => ({
      sort: () => ({
        lean: () => Promise.resolve(mockEnrollments),
      }),
    }),
  });

  const res = await request(app)
    .get('/api/dashboard/student')
    .set('Cookie', [`jwt=${token}`]);

  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.body.overview.completedCount, 1);
  assert.strictEqual(res.body.enrolledCourses[0].progressPercentage, 100);
  assert.strictEqual(res.body.enrolledCourses[0].certificateIssued, true);
  assert.strictEqual(res.body.enrolledCourses[0].certificateId, 'LS-2026-COMP-0001');
  assert.strictEqual(res.body.enrolledCourses[0].nextLessonTitle, null);
  assert.strictEqual(res.body.resumeLearning, null);
});

test('15. Student Dashboard returns resumeLearning pointing to lastAccessedLesson when valid', async () => {
  const student = createMockUser({ _id: '507f191e810c19729de860ed', name: 'Grace Student', email: 'grace@example.com', role: 'student' });
  const token = makeToken(student);

  const mockEnrollments = [
    {
      _id: 'enroll_resume_1',
      student: student._id,
      status: 'active',
      completedLessons: ['l1'],
      lastAccessedLesson: 'l2',
      lastAccessedAt: new Date('2026-10-30T10:00:00Z'),
      enrolledAt: new Date('2026-10-01T10:00:00Z'),
      course: {
        _id: 'course_cloud_101',
        title: 'Cloud Systems',
        slug: 'cloud-systems',
        status: 'published',
        sections: [
          {
            title: 'Section 1: Architecture',
            lessons: [
              { _id: 'l1', title: 'Lesson 1: Intro', isPublished: true },
              { _id: 'l2', title: 'Lesson 2: Kubernetes', isPublished: true },
              { _id: 'l3', title: 'Lesson 3: Serverless', isPublished: true },
            ],
          },
        ],
      },
    },
  ];

  Enrollment.find = () => ({
    populate: () => ({
      sort: () => ({
        lean: () => Promise.resolve(mockEnrollments),
      }),
    }),
  });

  const res = await request(app)
    .get('/api/dashboard/student')
    .set('Cookie', [`jwt=${token}`]);

  assert.strictEqual(res.statusCode, 200);
  assert.ok(res.body.resumeLearning);
  assert.strictEqual(res.body.resumeLearning.courseTitle, 'Cloud Systems');
  assert.strictEqual(res.body.resumeLearning.sectionTitle, 'Section 1: Architecture');
  assert.strictEqual(res.body.resumeLearning.lessonId, 'l2');
  assert.strictEqual(res.body.resumeLearning.lessonTitle, 'Lesson 2: Kubernetes');
  assert.strictEqual(res.body.resumeLearning.progressPercentage, 33);
});

test('16. Student Dashboard falls back to first unfinished published lesson if lastAccessedLesson is unpublished or missing', async () => {
  const student = createMockUser({ _id: '507f191e810c19729de860ee', name: 'Henry Student', email: 'henry@example.com', role: 'student' });
  const token = makeToken(student);

  const mockEnrollments = [
    {
      _id: 'enroll_resume_fallback',
      student: student._id,
      status: 'active',
      completedLessons: ['l1'],
      lastAccessedLesson: 'l_deleted_or_draft',
      lastAccessedAt: new Date(),
      enrolledAt: new Date(),
      course: {
        _id: 'course_ai_201',
        title: 'AI Engineering',
        slug: 'ai-engineering',
        status: 'published',
        sections: [
          {
            title: 'Section 1: Fundamentals',
            lessons: [
              { _id: 'l1', title: 'Completed Lesson 1', isPublished: true },
              { _id: 'l_deleted_or_draft', title: 'Draft Lesson', isPublished: false }, // unpublished!
              { _id: 'l3_real', title: 'First Unfinished Published Lesson', isPublished: true },
            ],
          },
        ],
      },
    },
  ];

  Enrollment.find = () => ({
    populate: () => ({
      sort: () => ({
        lean: () => Promise.resolve(mockEnrollments),
      }),
    }),
  });

  const res = await request(app)
    .get('/api/dashboard/student')
    .set('Cookie', [`jwt=${token}`]);

  assert.strictEqual(res.statusCode, 200);
  assert.ok(res.body.resumeLearning);
  assert.strictEqual(res.body.resumeLearning.lessonId, 'l3_real');
  assert.strictEqual(res.body.resumeLearning.lessonTitle, 'First Unfinished Published Lesson');
  assert.strictEqual(res.body.resumeLearning.progressPercentage, 50); // 1 completed out of 2 published
});

test('17. Student Dashboard returns synthesized recentActivity with sorted timeline events', async () => {
  const student = createMockUser({ _id: '507f191e810c19729de860ef', name: 'Ivy Student', email: 'ivy@example.com', role: 'student' });
  const token = makeToken(student);

  const mockEnrollments = [
    {
      _id: 'enroll_act_1',
      student: student._id,
      status: 'active',
      completedLessons: ['l1'],
      lastAccessedLesson: 'l1',
      lastAccessedAt: new Date('2026-10-30T08:00:00Z'),
      enrolledAt: new Date('2026-10-01T10:00:00Z'),
      course: {
        _id: 'course_act_1',
        title: 'Fullstack Dev',
        slug: 'fullstack-dev',
        status: 'published',
        sections: [
          {
            title: 'Sec 1',
            lessons: [{ _id: 'l1', title: 'Lesson 1', isPublished: true }],
          },
        ],
      },
    },
  ];

  Enrollment.find = () => ({
    populate: () => ({
      sort: () => ({
        lean: () => Promise.resolve(mockEnrollments),
      }),
    }),
  });

  AssignmentSubmission.find = (q) => {
    if (q && q.assignment) {
      return Promise.resolve([]);
    }
    return {
      populate: () => ({
        sort: () => ({
          limit: () => ({
            lean: () => Promise.resolve([
              {
                _id: 'sub_1',
                student: student._id,
                status: 'graded',
                grade: 95,
                submittedAt: new Date('2026-10-30T09:00:00Z'),
                gradedAt: new Date('2026-10-30T10:00:00Z'),
                assignment: {
                  title: 'React Architecture Lab',
                  maxMarks: 100,
                  course: { title: 'Fullstack Dev', slug: 'fullstack-dev' },
                },
              },
            ]),
          }),
        }),
      }),
    };
  };

  Certificate.find = () => ({
    select: () => ({
      populate: () => ({
        sort: () => ({
          limit: () => ({
            lean: () => Promise.resolve([
              {
                certificateId: 'LS-2026-IVY-001',
                courseTitleSnapshot: 'Fullstack Dev',
                issueDate: new Date('2026-10-30T11:00:00Z'),
              },
            ]),
          }),
        }),
      }),
    }),
  });

  const res = await request(app)
    .get('/api/dashboard/student')
    .set('Cookie', [`jwt=${token}`]);

  assert.strictEqual(res.statusCode, 200);
  assert.ok(Array.isArray(res.body.recentActivity));
  assert.strictEqual(res.body.recentActivity.length, 4);
  assert.strictEqual(res.body.recentActivity[0].type, 'certificate_issued');
  assert.strictEqual(res.body.recentActivity[1].type, 'grade_published');
  assert.strictEqual(res.body.recentActivity[2].type, 'assignment_submission');
  assert.strictEqual(res.body.recentActivity[3].type, 'lesson_access');
});
