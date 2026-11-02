const test = require('node:test');
const assert = require('node:assert');
const crypto = require('crypto');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { app } = require('../server');
const User = require('../models/User');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const Payment = require('../models/Payment');
const { getRazorpayInstance } = require('../config/razorpay');

const TEST_SECRET = 'test_jwt_secret_key_12345678901234567890';
const TEST_RAZORPAY_KEY = 'rzp_test_LearnSpace123456';
const TEST_RAZORPAY_SECRET = 'test_razorpay_secret_key_123456';

process.env.JWT_SECRET = TEST_SECRET;
process.env.RAZORPAY_KEY_ID = TEST_RAZORPAY_KEY;
process.env.RAZORPAY_KEY_SECRET = TEST_RAZORPAY_SECRET;
process.env.NODE_ENV = 'test';

// In-memory mock stores
let mockUsers = [];
let mockCourses = [];
let mockEnrollments = [];
let mockPayments = [];
let mockRazorpayOrders = [];
let idCounter = 1;

const makeObjectId = () => {
  const hex = (idCounter++).toString(16).padStart(24, '0');
  return new mongoose.Types.ObjectId(hex);
};

const resetTestDb = () => {
  mockUsers = [];
  mockCourses = [];
  mockEnrollments = [];
  mockPayments = [];
  mockRazorpayOrders = [];
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
  const sections = (data.sections || []).map((sec, sIdx) => ({
    _id: sec._id || makeObjectId(),
    title: sec.title || `Section ${sIdx + 1}`,
    description: sec.description || '',
    sortOrder: sIdx,
    lessons: (sec.lessons || []).map((les, lIdx) => ({
      _id: les._id || makeObjectId(),
      title: les.title || `Lesson ${lIdx + 1}`,
      description: les.description || '',
      contentType: les.contentType || 'video',
      videoUrl: les.videoUrl || 'https://example.com/video.mp4',
      textContent: les.textContent || '',
      attachmentUrl: '',
      duration: les.duration || '10 mins',
      sortOrder: lIdx,
      isPublished: true,
    })),
  }));

  const course = {
    _id: courseId,
    title: data.title || 'Course Title',
    slug: data.slug || `course-${courseId.toString().slice(-4)}`,
    summary: data.summary || 'Course summary',
    description: data.description || 'Full course description',
    instructor: data.instructor ? data.instructor._id || data.instructor : makeObjectId(),
    category: data.category || 'Development',
    level: data.level || 'Intermediate',
    thumbnail: data.thumbnail || '',
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

const generateValidSignature = (orderId, paymentId) => {
  return crypto
    .createHmac('sha256', TEST_RAZORPAY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
};

test.beforeEach(() => {
  resetTestDb();

  // Mock User
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

  // Mock Course
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
      return true;
    });
    const p = Promise.resolve(found || null);
    p.populate = () => p;
    p.lean = () => Promise.resolve(found ? { ...found } : null);
    return p;
  };

  // Mock Enrollment
  Enrollment.create = async (data) => {
    const enrollment = {
      _id: makeObjectId(),
      student: data.student,
      course: data.course,
      enrolledAt: data.enrolledAt || new Date(),
      status: data.status || 'active',
      completedLessons: data.completedLessons || [],
      lastAccessedLesson: null,
      lastAccessedAt: new Date(),
      enrollmentType: data.enrollmentType || 'free',
      payment: data.payment || null,
      amountPaid: data.amountPaid || 0,
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

  // Mock Payment
  Payment.create = async (data) => {
    const payment = {
      _id: makeObjectId(),
      student: data.student,
      course: data.course,
      razorpayOrderId: data.razorpayOrderId,
      razorpayPaymentId: data.razorpayPaymentId || null,
      razorpaySignature: data.razorpaySignature || '',
      amount: data.amount,
      currency: data.currency || 'INR',
      status: data.status || 'created',
      failureReason: data.failureReason || '',
      receipt: data.receipt || '',
      paidAt: data.paidAt || null,
      createdAt: new Date(),
      updatedAt: new Date(),
      async save() {
        const idx = mockPayments.findIndex((p) => p._id.toString() === this._id.toString());
        if (idx !== -1) mockPayments[idx] = this;
        else mockPayments.push(this);
        return this;
      },
    };
    mockPayments.push(payment);
    return payment;
  };

  Payment.findOne = (query = {}) => {
    const found = mockPayments.find((p) => {
      if (query.razorpayOrderId && p.razorpayOrderId !== query.razorpayOrderId) return false;
      if (query.razorpayPaymentId && p.razorpayPaymentId !== query.razorpayPaymentId) return false;
      if (query.student && p.student.toString() !== query.student.toString()) return false;
      return true;
    });
    const p = Promise.resolve(found || null);
    p.lean = () => Promise.resolve(found ? { ...found } : null);
    p.populate = () => p;
    return p;
  };

  Payment.findOneAndUpdate = async (query, update) => {
    const payment = await Payment.findOne(query);
    if (!payment) return null;
    if (update.status) payment.status = update.status;
    if (update.failureReason) payment.failureReason = update.failureReason;
    await payment.save();
    return payment;
  };

  Payment.find = (query = {}) => {
    let list = [...mockPayments];
    if (query.student) list = list.filter((p) => p.student.toString() === query.student.toString());
    const queryObj = {
      populate: () => queryObj,
      sort: () => queryObj,
      lean: () => Promise.resolve(list),
      then: (resolve) => Promise.resolve(list).then(resolve),
    };
    return queryObj;
  };

  // Mock Razorpay instance orders & payments
  const razorpay = getRazorpayInstance();
  razorpay.orders = {
    create: async (opts) => {
      const order = {
        id: `order_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        amount: opts.amount,
        currency: opts.currency,
        receipt: opts.receipt,
        notes: opts.notes,
        status: 'created',
      };
      mockRazorpayOrders.push(order);
      return order;
    },
  };
  razorpay.payments = {
    fetch: async (paymentId) => {
      return {
        id: paymentId,
        amount: 49900,
        currency: 'INR',
        status: 'captured',
      };
    },
  };
});

// ==========================================
// TEST CASES
// ==========================================

test('1. Free-course (₹0) enrollment succeeds directly via POST /api/courses/:id/enroll', async () => {
  const instructor = createMockUser({ name: 'Teacher Dave', email: 'dave@example.com', role: 'instructor' });
  const student = createMockUser({ name: 'Alice Student', email: 'alice@example.com', role: 'student' });
  const token = makeToken(student);

  const course = createMockCourse({
    title: 'Free Web Fundamentals',
    price: 0,
    status: 'published',
    instructor: instructor._id,
  });

  const res = await request(app)
    .post(`/api/courses/${course._id}/enroll`)
    .set('Authorization', `Bearer ${token}`);

  assert.strictEqual(res.statusCode, 201);
  assert.strictEqual(res.body.enrollment.courseId, course._id.toString());
  assert.strictEqual(mockEnrollments.length, 1);
  assert.strictEqual(mockEnrollments[0].enrollmentType, 'free');
});

test('2. Duplicate free enrollment is handled idempotently without duplicate records', async () => {
  const instructor = createMockUser({ name: 'Teacher Dave', email: 'dave@example.com', role: 'instructor' });
  const student = createMockUser({ name: 'Alice Student', email: 'alice@example.com', role: 'student' });
  const token = makeToken(student);

  const course = createMockCourse({
    title: 'Free Web Fundamentals',
    price: 0,
    status: 'published',
    instructor: instructor._id,
  });

  // First enrollment
  const res1 = await request(app)
    .post(`/api/courses/${course._id}/enroll`)
    .set('Authorization', `Bearer ${token}`);
  assert.strictEqual(res1.statusCode, 201);

  // Duplicate enrollment attempt
  const res2 = await request(app)
    .post(`/api/courses/${course._id}/enroll`)
    .set('Authorization', `Bearer ${token}`);
  assert.strictEqual(res2.statusCode, 200);
  assert(res2.body.message.includes('already enrolled'));
  assert.strictEqual(mockEnrollments.length, 1);
});

test('3. Direct enrollment via POST /api/courses/:id/enroll is rejected for paid courses (₹499)', async () => {
  const instructor = createMockUser({ name: 'Teacher Dave', email: 'dave@example.com', role: 'instructor' });
  const student = createMockUser({ name: 'Alice Student', email: 'alice@example.com', role: 'student' });
  const token = makeToken(student);

  const paidCourse = createMockCourse({
    title: 'Advanced React Architecture',
    price: 499,
    status: 'published',
    instructor: instructor._id,
  });

  const res = await request(app)
    .post(`/api/courses/${paidCourse._id}/enroll`)
    .set('Authorization', `Bearer ${token}`);

  assert.strictEqual(res.statusCode, 400);
  assert(res.body.error.includes('paid course'));
  assert.strictEqual(res.body.price, 499);
  assert.strictEqual(mockEnrollments.length, 0);
});

test('4. Paid course order creation uses server database price and creates Razorpay order', async () => {
  const instructor = createMockUser({ name: 'Teacher Dave', email: 'dave@example.com', role: 'instructor' });
  const student = createMockUser({ name: 'Bob Buyer', email: 'bob@example.com', role: 'student' });
  const token = makeToken(student);

  const paidCourse = createMockCourse({
    title: 'Cloud Distributed Systems',
    price: 999,
    status: 'published',
    instructor: instructor._id,
  });

  const res = await request(app)
    .post('/api/payments/create-order')
    .set('Authorization', `Bearer ${token}`)
    .send({ courseId: paidCourse._id.toString() });

  assert.strictEqual(res.statusCode, 201);
  assert(res.body.orderId.startsWith('order_'));
  assert.strictEqual(res.body.amount, 99900); // 999 INR in paise
  assert.strictEqual(res.body.currency, 'INR');
  assert.strictEqual(res.body.keyId, TEST_RAZORPAY_KEY);
  assert.strictEqual(res.body.course.title, 'Cloud Distributed Systems');

  // Verify Payment document was persisted in database
  assert.strictEqual(mockPayments.length, 1);
  assert.strictEqual(mockPayments[0].amount, 999);
  assert.strictEqual(mockPayments[0].status, 'created');
  assert.strictEqual(mockPayments[0].razorpayOrderId, res.body.orderId);
});

test('5. Frontend price tampering cannot alter the server payment order amount', async () => {
  const instructor = createMockUser({ name: 'Teacher Dave', email: 'dave@example.com', role: 'instructor' });
  const student = createMockUser({ name: 'Malicious Learner', email: 'bad@example.com', role: 'student' });
  const token = makeToken(student);

  const paidCourse = createMockCourse({
    title: 'Zero Trust Cybersecurity',
    price: 1499,
    status: 'published',
    instructor: instructor._id,
  });

  // Client attempts to pass a tampered amount or price of ₹1
  const res = await request(app)
    .post('/api/payments/create-order')
    .set('Authorization', `Bearer ${token}`)
    .send({
      courseId: paidCourse._id.toString(),
      price: 1,
      amount: 100,
    });

  assert.strictEqual(res.statusCode, 201);
  // Must strictly use the database course price of 1499, NOT the client's 1
  assert.strictEqual(res.body.amount, 149900);
  assert.strictEqual(mockPayments[0].amount, 1499);
});

test('6. Creating order for unapproved / unpublished course is rejected with 400', async () => {
  const instructor = createMockUser({ name: 'Teacher Dave', email: 'dave@example.com', role: 'instructor' });
  const student = createMockUser({ name: 'Student Dan', email: 'dan@example.com', role: 'student' });
  const token = makeToken(student);

  const draftCourse = createMockCourse({
    title: 'Unpublished Draft Course',
    price: 499,
    status: 'draft',
    instructor: instructor._id,
  });

  const res = await request(app)
    .post('/api/payments/create-order')
    .set('Authorization', `Bearer ${token}`)
    .send({ courseId: draftCourse._id.toString() });

  assert.strictEqual(res.statusCode, 400);
  assert(res.body.error.includes('unapproved or unpublished'));
  assert.strictEqual(mockPayments.length, 0);
});

test('7. Instructor cannot create payment order to purchase course (403 role restriction and self-purchase guard)', async () => {
  const instructor = createMockUser({ name: 'Author Emma', email: 'emma@example.com', role: 'instructor' });
  const instructorToken = makeToken(instructor);

  const course = createMockCourse({
    title: 'Machine Learning Pipelines',
    price: 799,
    status: 'published',
    instructor: instructor._id,
  });

  // Standard instructor is restricted by role middleware (403)
  const res1 = await request(app)
    .post('/api/payments/create-order')
    .set('Authorization', `Bearer ${instructorToken}`)
    .send({ courseId: course._id.toString() });

  assert.strictEqual(res1.statusCode, 403);

  // Privileged user (e.g. admin) who is author of course is guarded against self-purchase (400)
  const adminAuthor = createMockUser({ name: 'Admin Author', email: 'adminauthor@example.com', role: 'admin' });
  const adminToken = makeToken(adminAuthor);
  const adminCourse = createMockCourse({
    title: 'Advanced AI Architectures',
    price: 999,
    status: 'published',
    instructor: adminAuthor._id,
  });

  const res2 = await request(app)
    .post('/api/payments/create-order')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ courseId: adminCourse._id.toString() });

  assert.strictEqual(res2.statusCode, 400);
  assert(res2.body.error.includes('Instructors cannot purchase their own courses'));
});

test('8. Valid Razorpay payment verification confirms enrollment and sets status completed', async () => {
  const instructor = createMockUser({ name: 'Teacher Dave', email: 'dave@example.com', role: 'instructor' });
  const student = createMockUser({ name: 'Charlie Learner', email: 'charlie@example.com', role: 'student' });
  const token = makeToken(student);

  const course = createMockCourse({
    title: 'Microservices with Kubernetes',
    price: 499,
    status: 'published',
    instructor: instructor._id,
  });

  // Step 1: Create order
  const orderRes = await request(app)
    .post('/api/payments/create-order')
    .set('Authorization', `Bearer ${token}`)
    .send({ courseId: course._id.toString() });

  assert.strictEqual(orderRes.statusCode, 201);
  const orderId = orderRes.body.orderId;
  const paymentId = 'pay_test_998877665544';
  const validSignature = generateValidSignature(orderId, paymentId);

  // Step 2: Verify payment
  const verifyRes = await request(app)
    .post('/api/payments/verify')
    .set('Authorization', `Bearer ${token}`)
    .send({
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: validSignature,
      courseId: course._id.toString(),
    });

  assert.strictEqual(verifyRes.statusCode, 200);
  assert(verifyRes.body.message.includes('verified successfully'));
  assert.strictEqual(verifyRes.body.payment.status, 'completed');
  assert.strictEqual(verifyRes.body.payment.paymentId, paymentId);

  // Verify enrollment was activated in database
  assert.strictEqual(mockEnrollments.length, 1);
  assert.strictEqual(mockEnrollments[0].status, 'active');
  assert.strictEqual(mockEnrollments[0].enrollmentType, 'paid');
  assert.strictEqual(mockEnrollments[0].amountPaid, 499);
  assert.strictEqual(mockPayments[0].status, 'completed');
});

test('9. Invalid Razorpay signature is rejected with 400 and does NOT grant course access', async () => {
  const instructor = createMockUser({ name: 'Teacher Dave', email: 'dave@example.com', role: 'instructor' });
  const student = createMockUser({ name: 'Charlie Learner', email: 'charlie@example.com', role: 'student' });
  const token = makeToken(student);

  const course = createMockCourse({
    title: 'Microservices with Kubernetes',
    price: 499,
    status: 'published',
    instructor: instructor._id,
  });

  const orderRes = await request(app)
    .post('/api/payments/create-order')
    .set('Authorization', `Bearer ${token}`)
    .send({ courseId: course._id.toString() });

  const orderId = orderRes.body.orderId;
  const paymentId = 'pay_test_fraudulent_123';
  const forgedSignature = 'forged_fake_signature_hash_00000000000000000000000000000000';

  const verifyRes = await request(app)
    .post('/api/payments/verify')
    .set('Authorization', `Bearer ${token}`)
    .send({
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: forgedSignature,
      courseId: course._id.toString(),
    });

  assert.strictEqual(verifyRes.statusCode, 400);
  assert(verifyRes.body.error.includes('Invalid payment signature'));
  assert.strictEqual(mockEnrollments.length, 0); // Access denied
  assert.strictEqual(mockPayments[0].status, 'failed');
});

test('10. Verification with mismatched course ID is rejected with 400', async () => {
  const instructor = createMockUser({ name: 'Teacher Dave', email: 'dave@example.com', role: 'instructor' });
  const student = createMockUser({ name: 'Charlie Learner', email: 'charlie@example.com', role: 'student' });
  const token = makeToken(student);

  const courseA = createMockCourse({ title: 'Course A', price: 499, status: 'published', instructor: instructor._id });
  const courseB = createMockCourse({ title: 'Course B', price: 499, status: 'published', instructor: instructor._id });

  const orderRes = await request(app)
    .post('/api/payments/create-order')
    .set('Authorization', `Bearer ${token}`)
    .send({ courseId: courseA._id.toString() });

  const orderId = orderRes.body.orderId;
  const paymentId = 'pay_test_order_mismatch';
  const validSignature = generateValidSignature(orderId, paymentId);

  // Client attempts to claim Course B with order created for Course A
  const verifyRes = await request(app)
    .post('/api/payments/verify')
    .set('Authorization', `Bearer ${token}`)
    .send({
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: validSignature,
      courseId: courseB._id.toString(), // Wrong course
    });

  assert.strictEqual(verifyRes.statusCode, 400);
  assert(verifyRes.body.error.includes('does not match'));
  assert.strictEqual(mockEnrollments.length, 0);
});

test('11. Verification with mismatched student is rejected with 403 Forbidden', async () => {
  const instructor = createMockUser({ name: 'Teacher Dave', email: 'dave@example.com', role: 'instructor' });
  const studentA = createMockUser({ name: 'Student A', email: 'studentA@example.com', role: 'student' });
  const studentB = createMockUser({ name: 'Student B', email: 'studentB@example.com', role: 'student' });
  const tokenA = makeToken(studentA);
  const tokenB = makeToken(studentB);

  const course = createMockCourse({ title: 'Secure Enclaves', price: 499, status: 'published', instructor: instructor._id });

  // Student A creates order
  const orderRes = await request(app)
    .post('/api/payments/create-order')
    .set('Authorization', `Bearer ${tokenA}`)
    .send({ courseId: course._id.toString() });

  const orderId = orderRes.body.orderId;
  const paymentId = 'pay_test_order_student_mismatch';
  const validSignature = generateValidSignature(orderId, paymentId);

  // Student B attempts to claim the order created by Student A
  const verifyRes = await request(app)
    .post('/api/payments/verify')
    .set('Authorization', `Bearer ${tokenB}`)
    .send({
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: validSignature,
      courseId: course._id.toString(),
    });

  assert.strictEqual(verifyRes.statusCode, 403);
  assert(verifyRes.body.error.includes('does not belong to the authenticated user'));
  assert.strictEqual(mockEnrollments.length, 0);
});

test('12. Repeated / concurrent verification of completed order is idempotent and does not create duplicate enrollments', async () => {
  const instructor = createMockUser({ name: 'Teacher Dave', email: 'dave@example.com', role: 'instructor' });
  const student = createMockUser({ name: 'Charlie Learner', email: 'charlie@example.com', role: 'student' });
  const token = makeToken(student);

  const course = createMockCourse({
    title: 'Microservices with Kubernetes',
    price: 499,
    status: 'published',
    instructor: instructor._id,
  });

  const orderRes = await request(app)
    .post('/api/payments/create-order')
    .set('Authorization', `Bearer ${token}`)
    .send({ courseId: course._id.toString() });

  const orderId = orderRes.body.orderId;
  const paymentId = 'pay_test_concurrent_id';
  const validSignature = generateValidSignature(orderId, paymentId);

  // First verification
  const verify1 = await request(app)
    .post('/api/payments/verify')
    .set('Authorization', `Bearer ${token}`)
    .send({
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: validSignature,
      courseId: course._id.toString(),
    });
  assert.strictEqual(verify1.statusCode, 200);

  // Repeated second verification
  const verify2 = await request(app)
    .post('/api/payments/verify')
    .set('Authorization', `Bearer ${token}`)
    .send({
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: validSignature,
      courseId: course._id.toString(),
    });
  assert.strictEqual(verify2.statusCode, 200);
  assert.strictEqual(verify2.body.isAlreadyEnrolled, true);
  // Ensure still only 1 enrollment was created
  assert.strictEqual(mockEnrollments.length, 1);
});

test('13. Authenticated student can retrieve their payment transaction history via GET /api/payments/my-payments', async () => {
  const instructor = createMockUser({ name: 'Teacher Dave', email: 'dave@example.com', role: 'instructor' });
  const student = createMockUser({ name: 'Charlie Learner', email: 'charlie@example.com', role: 'student' });
  const token = makeToken(student);

  const course = createMockCourse({ title: 'Fullstack Track', price: 499, status: 'published', instructor: instructor._id });

  // Create & verify payment
  const orderRes = await request(app)
    .post('/api/payments/create-order')
    .set('Authorization', `Bearer ${token}`)
    .send({ courseId: course._id.toString() });

  const orderId = orderRes.body.orderId;
  const paymentId = 'pay_history_123';
  await request(app)
    .post('/api/payments/verify')
    .set('Authorization', `Bearer ${token}`)
    .send({
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: generateValidSignature(orderId, paymentId),
      courseId: course._id.toString(),
    });

  const historyRes = await request(app)
    .get('/api/payments/my-payments')
    .set('Authorization', `Bearer ${token}`);

  assert.strictEqual(historyRes.statusCode, 200);
  assert.strictEqual(historyRes.body.count, 1);
  assert.strictEqual(historyRes.body.payments[0].amount, 499);
  assert.strictEqual(historyRes.body.payments[0].status, 'completed');
});
