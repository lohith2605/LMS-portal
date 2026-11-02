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
const { setTransporter, sendPaymentReceiptEmail, sendInstructorEnrollmentNotificationEmail } = require('../services/emailService');

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
let dispatchedEmails = [];
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
  dispatchedEmails = [];
  idCounter = 1;
};

const createMockUser = (data) => {
  const user = {
    _id: data._id || makeObjectId(),
    name: data.name,
    email: data.email ? data.email.toLowerCase() : '',
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
  const course = {
    _id: courseId,
    title: data.title || 'Course Title',
    slug: data.slug || `course-${courseId.toString().slice(-4)}`,
    summary: data.summary || 'Course summary',
    description: data.description || 'Full course description',
    instructor: data.instructor ? (data.instructor._id || data.instructor) : makeObjectId(),
    category: data.category || 'Development',
    level: data.level || 'Intermediate',
    thumbnail: data.thumbnail || '',
    price: data.price !== undefined ? data.price : 0,
    currency: data.currency || 'INR',
    status: data.status || 'published',
    sections: [],
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

  // Register mock transporter to record dispatched messages
  dispatchedEmails = [];
  setTransporter({
    async sendMail(mailOptions) {
      dispatchedEmails.push(mailOptions);
      return { messageId: `mock-msg-${Date.now()}` };
    },
  });

  // Mock User
  User.findById = (id) => {
    const found = mockUsers.find((u) => u._id.toString() === (id ? id.toString() : ''));
    const p = {
      select() {
        return this;
      },
      then(resolve, reject) {
        return Promise.resolve(found || null).then(resolve, reject);
      },
    };
    return p;
  };

  User.findOne = (query) => {
    const found = mockUsers.find((u) => {
      if (query.email && u.email !== query.email.toLowerCase()) return false;
      if (query.role && u.role !== query.role) return false;
      return true;
    });
    const p = {
      select() {
        return this;
      },
      then(resolve, reject) {
        return Promise.resolve(found || null).then(resolve, reject);
      },
    };
    return p;
  };

  // Mock Course
  Course.findById = (id) => {
    const found = mockCourses.find((c) => c._id.toString() === (id ? id.toString() : ''));
    let courseObj = found ? { ...found } : null;
    const p = {
      populate(path) {
        if (courseObj && path === 'instructor') {
          const instUser = mockUsers.find(
            (u) => u._id.toString() === (courseObj.instructor ? (courseObj.instructor._id || courseObj.instructor).toString() : '')
          );
          if (instUser) {
            courseObj = {
              ...courseObj,
              instructor: {
                _id: instUser._id,
                name: instUser.name,
                email: instUser.email,
              },
            };
          }
        }
        return this;
      },
      select() {
        return this;
      },
      then(resolve, reject) {
        return Promise.resolve(courseObj).then(resolve, reject);
      },
    };
    return p;
  };

  Course.findOne = (query) => {
    const found = mockCourses.find((c) => {
      if (query._id && c._id.toString() !== query._id.toString()) return false;
      if (query.slug && c.slug !== query.slug) return false;
      return true;
    });
    const p = {
      populate() {
        return this;
      },
      lean() {
        return Promise.resolve(found ? { ...found } : null);
      },
      then(resolve, reject) {
        return Promise.resolve(found || null).then(resolve, reject);
      },
    };
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
      instructorNotificationSent: data.instructorNotificationSent || false,
      instructorNotificationSentAt: data.instructorNotificationSentAt || null,
      instructorNotificationError: data.instructorNotificationError || null,
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

  Enrollment.findOne = (query) => {
    const found = mockEnrollments.find((e) => {
      if (query.student && e.student.toString() !== query.student.toString()) return false;
      if (query.course && e.course.toString() !== query.course.toString()) return false;
      if (query.status && e.status !== query.status) return false;
      return true;
    });
    const p = {
      populate() {
        return this;
      },
      lean() {
        return Promise.resolve(found ? { ...found } : null);
      },
      then(resolve, reject) {
        return Promise.resolve(found || null).then(resolve, reject);
      },
    };
    return p;
  };

  Enrollment.find = () => ({
    populate: () => ({
      sort: () => ({
        lean: () => Promise.resolve([]),
      }),
    }),
  });

  // Mock Payment
  Payment.create = async (data) => {
    const payment = {
      _id: makeObjectId(),
      student: data.student,
      course: data.course,
      razorpayOrderId: data.razorpayOrderId,
      razorpayPaymentId: data.razorpayPaymentId || '',
      razorpaySignature: data.razorpaySignature || '',
      amount: data.amount,
      currency: data.currency || 'INR',
      status: data.status || 'created',
      receipt: data.receipt || '',
      failureReason: data.failureReason || '',
      paidAt: data.paidAt || null,
      receiptEmailSent: data.receiptEmailSent || false,
      receiptEmailSentAt: data.receiptEmailSentAt || null,
      receiptEmailError: data.receiptEmailError || null,
      instructorNotificationSent: data.instructorNotificationSent || false,
      instructorNotificationSentAt: data.instructorNotificationSentAt || null,
      instructorNotificationError: data.instructorNotificationError || null,
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

  Payment.findOne = (query) => {
    const found = mockPayments.find((p) => {
      if (query.razorpayOrderId && p.razorpayOrderId !== query.razorpayOrderId) return false;
      if (query._id && p._id.toString() !== query._id.toString()) return false;
      return true;
    });
    return Promise.resolve(found || null);
  };

  Payment.findOneAndUpdate = async (filter, update) => {
    const found = mockPayments.find((p) => {
      if (filter.razorpayOrderId && p.razorpayOrderId !== filter.razorpayOrderId) return false;
      return true;
    });
    if (found) {
      Object.assign(found, update);
    }
    return found || null;
  };

  Payment.find = () => ({
    populate: () => ({
      sort: () => ({
        lean: () => Promise.resolve([]),
      }),
    }),
  });

  // Mock Razorpay instance orders & payments
  const razorpay = getRazorpayInstance();
  razorpay.orders = {
    create: async (opts) => {
      const order = {
        id: `order_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        amount: opts.amount,
        currency: opts.currency,
        receipt: opts.receipt,
        status: 'created',
      };
      return order;
    },
  };
  razorpay.payments = {
    fetch: async (paymentId) => {
      const p = mockPayments.find((m) => m.razorpayPaymentId === paymentId || m.status === 'created');
      return {
        id: paymentId,
        amount: p ? Math.round(p.amount * 100) : 99900,
        currency: p ? p.currency : 'INR',
        status: 'captured',
      };
    },
  };
});

test.afterEach(() => {
  setTransporter(null);
  resetTestDb();
});

/* ==========================================================================
 * Suite: Email Notification System (Phase 2)
 * ========================================================================== */

test('1. Successful paid enrollment sends a student receipt with correct details', async () => {
  const instructor = createMockUser({ name: 'Professor Alan', email: 'alan@univ.edu', role: 'instructor' });
  const student = createMockUser({ name: 'Jane Doe', email: 'jane@example.com', role: 'student' });
  const token = makeToken(student);

  const course = createMockCourse({
    title: 'Advanced Neural Networks',
    price: 999,
    status: 'published',
    instructor: instructor._id,
  });

  const orderId = 'order_receipt_test_001';
  const paymentId = 'pay_receipt_test_001';
  const signature = generateValidSignature(orderId, paymentId);

  await Payment.create({
    student: student._id,
    course: course._id,
    razorpayOrderId: orderId,
    amount: 999,
    currency: 'INR',
    receipt: 'rcpt_jane_123',
    status: 'created',
  });

  const res = await request(app)
    .post('/api/payments/verify')
    .set('Authorization', `Bearer ${token}`)
    .send({
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: signature,
      courseId: course._id.toString(),
    });

  assert.strictEqual(res.statusCode, 200);

  // Verify student receipt email dispatched
  const studentMail = dispatchedEmails.find((m) => m.to === 'jane@example.com');
  assert.ok(studentMail, 'Student receipt email must be sent to student');
  assert.ok(studentMail.subject.includes('Advanced Neural Networks'), 'Subject must contain course title');
  assert.ok(studentMail.text.includes('Jane Doe'), 'Plaintext must contain student name');
  assert.ok(studentMail.text.includes('999'), 'Plaintext must contain amount');
  assert.ok(studentMail.text.includes(paymentId), 'Plaintext must contain Razorpay payment ID');
  assert.ok(studentMail.text.includes(orderId), 'Plaintext must contain Razorpay order ID');
  assert.ok(studentMail.text.includes('rcpt_jane_123'), 'Plaintext must contain receipt ID');
  assert.ok(studentMail.html.includes('Jane Doe'), 'HTML must contain student name');
  assert.ok(studentMail.html.includes('Professor Alan'), 'HTML must contain instructor name');

  // Verify Payment record delivery state
  const updatedPayment = await Payment.findOne({ razorpayOrderId: orderId });
  assert.strictEqual(updatedPayment.receiptEmailSent, true);
  assert.ok(updatedPayment.receiptEmailSentAt instanceof Date);
  assert.strictEqual(updatedPayment.receiptEmailError, null);
});

test('2. Successful paid enrollment notifies the correct instructor', async () => {
  const instructor = createMockUser({ name: 'Dr. Katherine Bell', email: 'kbell@cs.org', role: 'instructor' });
  const student = createMockUser({ name: 'Alex Rivera', email: 'alex@example.com', role: 'student' });
  const token = makeToken(student);

  const course = createMockCourse({
    title: 'Quantum Computing Intro',
    price: 1299,
    status: 'published',
    instructor: instructor._id,
  });

  const orderId = 'order_inst_paid_002';
  const paymentId = 'pay_inst_paid_002';
  const signature = generateValidSignature(orderId, paymentId);

  await Payment.create({
    student: student._id,
    course: course._id,
    razorpayOrderId: orderId,
    amount: 1299,
    currency: 'INR',
    receipt: 'rcpt_alex_999',
    status: 'created',
  });

  const res = await request(app)
    .post('/api/payments/verify')
    .set('Authorization', `Bearer ${token}`)
    .send({
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: signature,
      courseId: course._id.toString(),
    });

  assert.strictEqual(res.statusCode, 200);

  // Verify instructor notification email
  const instMail = dispatchedEmails.find((m) => m.to === 'kbell@cs.org');
  assert.ok(instMail, 'Instructor notification must be delivered to registered instructor email');
  assert.ok(instMail.subject.includes('Quantum Computing Intro'), 'Subject must contain course title');
  assert.ok(instMail.text.includes('Dr. Katherine Bell'), 'Plaintext must greet the instructor');
  assert.ok(instMail.text.includes('Alex Rivera'), 'Plaintext must state student name');
  assert.ok(instMail.text.includes('alex@example.com'), 'Plaintext must state student email');
  assert.ok(instMail.text.includes('1,299') || instMail.text.includes('1299'), 'Plaintext must specify paid amount');
  assert.ok(instMail.html.includes('PAID ENROLLMENT'), 'HTML must designate paid enrollment');

  // Verify Payment record instructor notification state
  const updatedPayment = await Payment.findOne({ razorpayOrderId: orderId });
  assert.strictEqual(updatedPayment.instructorNotificationSent, true);
  assert.ok(updatedPayment.instructorNotificationSentAt instanceof Date);
  assert.strictEqual(updatedPayment.instructorNotificationError, null);
});

test('3. Free enrollment notifies the instructor without creating a payment receipt for a nonexistent payment', async () => {
  const instructor = createMockUser({ name: 'Prof Linus', email: 'linus@openkernel.org', role: 'instructor' });
  const student = createMockUser({ name: 'Sam Green', email: 'sam@learner.org', role: 'student' });
  const token = makeToken(student);

  const course = createMockCourse({
    title: 'Operating Systems from Scratch',
    price: 0,
    status: 'published',
    instructor: instructor._id,
  });

  const res = await request(app)
    .post(`/api/courses/${course._id.toString()}/enroll`)
    .set('Authorization', `Bearer ${token}`)
    .send();

  assert.strictEqual(res.statusCode, 201);

  // Exactly 1 email should be dispatched: the instructor notification (NO payment receipt)
  assert.strictEqual(dispatchedEmails.length, 1, 'Only instructor notification should be dispatched');
  const instMail = dispatchedEmails[0];
  assert.strictEqual(instMail.to, 'linus@openkernel.org');
  assert.ok(instMail.text.includes('Operating Systems from Scratch'));
  assert.ok(instMail.text.includes('Sam Green'));
  assert.ok(instMail.text.includes('Free Enrollment'));
  assert.ok(instMail.html.includes('FREE ENROLLMENT'));

  // Ensure student received NO payment receipt
  const studentMail = dispatchedEmails.find((m) => m.to === 'sam@learner.org');
  assert.strictEqual(studentMail, undefined, 'Free enrollments must never send payment receipts');

  // Verify Enrollment record delivery state
  const enrollment = await Enrollment.findOne({ student: student._id, course: course._id });
  assert.strictEqual(enrollment.instructorNotificationSent, true);
  assert.ok(enrollment.instructorNotificationSentAt instanceof Date);
  assert.strictEqual(enrollment.instructorNotificationError, null);
});

test('4. Failed or pending payment sends neither payment receipt nor paid-enrollment notification', async () => {
  const instructor = createMockUser({ name: 'Teacher Bob', email: 'bob@inst.org', role: 'instructor' });
  const student = createMockUser({ name: 'Diana Prince', email: 'diana@hero.com', role: 'student' });
  const token = makeToken(student);

  const course = createMockCourse({
    title: 'Defensive Security',
    price: 799,
    status: 'published',
    instructor: instructor._id,
  });

  // Step 1: Order creation (pending/created)
  const resOrder = await request(app)
    .post('/api/payments/create-order')
    .set('Authorization', `Bearer ${token}`)
    .send({ courseId: course._id.toString() });

  assert.strictEqual(resOrder.statusCode, 201);
  assert.strictEqual(dispatchedEmails.length, 0, 'Creating an order must not trigger emails');

  // Verify payment status in DB is still 'created'
  const payment = await Payment.findOne({ razorpayOrderId: resOrder.body.orderId });
  assert.strictEqual(payment.status, 'created');
  assert.strictEqual(payment.receiptEmailSent, false);
  assert.strictEqual(payment.instructorNotificationSent, false);
});

test('5. Invalid payment signature sends no emails', async () => {
  const instructor = createMockUser({ name: 'Teacher Bob', email: 'bob@inst.org', role: 'instructor' });
  const student = createMockUser({ name: 'Diana Prince', email: 'diana@hero.com', role: 'student' });
  const token = makeToken(student);

  const course = createMockCourse({
    title: 'Defensive Security',
    price: 799,
    status: 'published',
    instructor: instructor._id,
  });

  const orderId = 'order_tampered_sig_005';
  await Payment.create({
    student: student._id,
    course: course._id,
    razorpayOrderId: orderId,
    amount: 799,
    status: 'created',
  });

  const res = await request(app)
    .post('/api/payments/verify')
    .set('Authorization', `Bearer ${token}`)
    .send({
      razorpay_order_id: orderId,
      razorpay_payment_id: 'pay_random_123',
      razorpay_signature: 'invalid_forged_signature_0000000000000000000000000000000000000000000000000000000000000000',
      courseId: course._id.toString(),
    });

  assert.strictEqual(res.statusCode, 400);
  assert.strictEqual(dispatchedEmails.length, 0, 'Failed signature must not send any emails');

  const updatedPayment = await Payment.findOne({ razorpayOrderId: orderId });
  assert.strictEqual(updatedPayment.status, 'failed');
  assert.strictEqual(updatedPayment.receiptEmailSent, false);
});

test('6. Repeated payment verification does not send duplicate emails', async () => {
  const instructor = createMockUser({ name: 'Prof Alice', email: 'alice@math.org', role: 'instructor' });
  const student = createMockUser({ name: 'Tom Hardy', email: 'tom@hardy.com', role: 'student' });
  const token = makeToken(student);

  const course = createMockCourse({
    title: 'Discrete Mathematics',
    price: 499,
    status: 'published',
    instructor: instructor._id,
  });

  const orderId = 'order_dup_verify_006';
  const paymentId = 'pay_dup_verify_006';
  const signature = generateValidSignature(orderId, paymentId);

  await Payment.create({
    student: student._id,
    course: course._id,
    razorpayOrderId: orderId,
    amount: 499,
    status: 'created',
    receipt: 'rcpt_tom_006',
  });

  // First verification
  const res1 = await request(app)
    .post('/api/payments/verify')
    .set('Authorization', `Bearer ${token}`)
    .send({
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: signature,
      courseId: course._id.toString(),
    });

  assert.strictEqual(res1.statusCode, 200);
  assert.strictEqual(dispatchedEmails.length, 2, 'Initial verification sends receipt + instructor notification');

  // Repeated verification call (e.g. page refresh / retry)
  const res2 = await request(app)
    .post('/api/payments/verify')
    .set('Authorization', `Bearer ${token}`)
    .send({
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: signature,
      courseId: course._id.toString(),
    });

  assert.strictEqual(res2.statusCode, 200);
  assert.strictEqual(res2.body.isAlreadyEnrolled, true);
  assert.strictEqual(dispatchedEmails.length, 2, 'No additional emails must be dispatched on repeated calls');
});

test('7. Repeated free enrollment does not send duplicate instructor notifications', async () => {
  const instructor = createMockUser({ name: 'Prof Euclid', email: 'euclid@geometry.org', role: 'instructor' });
  const student = createMockUser({ name: 'Ada Lovelace', email: 'ada@computing.org', role: 'student' });
  const token = makeToken(student);

  const course = createMockCourse({
    title: 'Foundations of Algorithms',
    price: 0,
    status: 'published',
    instructor: instructor._id,
  });

  // First enrollment
  const res1 = await request(app)
    .post(`/api/courses/${course._id.toString()}/enroll`)
    .set('Authorization', `Bearer ${token}`)
    .send();

  assert.strictEqual(res1.statusCode, 201);
  assert.strictEqual(dispatchedEmails.length, 1);

  // Second enrollment attempt
  const res2 = await request(app)
    .post(`/api/courses/${course._id.toString()}/enroll`)
    .set('Authorization', `Bearer ${token}`)
    .send();

  assert.strictEqual(res2.statusCode, 200);
  assert.ok(res2.body.message.includes('already enrolled'));
  assert.strictEqual(dispatchedEmails.length, 1, 'No duplicate notification sent on re-enrollment');
});

test('8. SMTP failure does not undo a successful payment or enrollment', async () => {
  // Mock transporter that throws network / SMTP timeout error
  setTransporter({
    async sendMail() {
      throw new Error('Connection refused: SMTP host unreachable at port 587');
    },
  });

  const instructor = createMockUser({ name: 'Prof Sagan', email: 'sagan@cosmos.edu', role: 'instructor' });
  const student = createMockUser({ name: 'Carl Smith', email: 'carl@star.edu', role: 'student' });
  const token = makeToken(student);

  const course = createMockCourse({
    title: 'Astrophysics 101',
    price: 899,
    status: 'published',
    instructor: instructor._id,
  });

  const orderId = 'order_smtp_fail_008';
  const paymentId = 'pay_smtp_fail_008';
  const signature = generateValidSignature(orderId, paymentId);

  await Payment.create({
    student: student._id,
    course: course._id,
    razorpayOrderId: orderId,
    amount: 899,
    status: 'created',
  });

  // Verification request must still succeed with 200
  const res = await request(app)
    .post('/api/payments/verify')
    .set('Authorization', `Bearer ${token}`)
    .send({
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: signature,
      courseId: course._id.toString(),
    });

  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.body.payment.status, 'completed');

  // Verify enrollment in DB remains active
  const enrollment = await Enrollment.findOne({ student: student._id, course: course._id });
  assert.ok(enrollment, 'Enrollment must exist');
  assert.strictEqual(enrollment.status, 'active');

  // Verify payment status remains completed, with failure recorded in status fields
  const payment = await Payment.findOne({ razorpayOrderId: orderId });
  assert.strictEqual(payment.status, 'completed');
  assert.strictEqual(payment.receiptEmailSent, false);
  assert.ok(payment.receiptEmailError.includes('Connection refused'));
  assert.strictEqual(payment.instructorNotificationSent, false);
  assert.ok(payment.instructorNotificationError.includes('Connection refused'));
});

test('9. Missing instructor email is handled safely', async () => {
  // Course whose instructor has no email or instructor reference is empty
  const instructorWithoutEmail = createMockUser({ name: 'Mystery Instructor', email: '', role: 'instructor' });
  const student = createMockUser({ name: 'Nancy Drew', email: 'nancy@detective.org', role: 'student' });
  const token = makeToken(student);

  const course = createMockCourse({
    title: 'Investigative Techniques',
    price: 299,
    status: 'published',
    instructor: instructorWithoutEmail._id,
  });

  const orderId = 'order_no_inst_email_009';
  const paymentId = 'pay_no_inst_email_009';
  const signature = generateValidSignature(orderId, paymentId);

  await Payment.create({
    student: student._id,
    course: course._id,
    razorpayOrderId: orderId,
    amount: 299,
    status: 'created',
  });

  const res = await request(app)
    .post('/api/payments/verify')
    .set('Authorization', `Bearer ${token}`)
    .send({
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: signature,
      courseId: course._id.toString(),
    });

  assert.strictEqual(res.statusCode, 200);

  // Student should still get receipt
  const studentMail = dispatchedEmails.find((m) => m.to === 'nancy@detective.org');
  assert.ok(studentMail, 'Student receipt should still be sent');

  // Instructor email should safely not be sent
  const payment = await Payment.findOne({ razorpayOrderId: orderId });
  assert.strictEqual(payment.instructorNotificationSent, false);
  assert.strictEqual(payment.instructorNotificationError, 'Instructor email not available');
});

test('10. Email content uses the correct student, instructor, course, amount, and payment details', async () => {
  let capturedReceipt = null;
  let capturedInstructor = null;

  setTransporter({
    async sendMail(mailOptions) {
      if (mailOptions.subject.includes('Receipt')) {
        capturedReceipt = mailOptions;
      } else {
        capturedInstructor = mailOptions;
      }
      return { messageId: 'unit-test-captured' };
    },
  });

  // Test sendPaymentReceiptEmail directly
  const receiptSent = await sendPaymentReceiptEmail({
    to: 'unit_student@learn.io',
    studentName: 'Maya Lin',
    courseTitle: 'Modern Architectural Design',
    instructorName: 'Prof Frank Gehry',
    amount: 1499.5,
    currency: 'INR',
    paymentDate: new Date('2026-11-02T12:00:00Z'),
    razorpayPaymentId: 'pay_capture_987654',
    razorpayOrderId: 'order_capture_123456',
    receiptId: 'rcpt_maya_9999',
    courseUrl: 'https://learnspace.io/courses/modern-architecture',
  });

  assert.strictEqual(receiptSent, true);
  assert.ok(capturedReceipt);
  assert.strictEqual(capturedReceipt.to, 'unit_student@learn.io');
  assert.ok(capturedReceipt.subject.includes('Modern Architectural Design'));
  assert.ok(capturedReceipt.text.includes('Maya Lin'));
  assert.ok(capturedReceipt.text.includes('1,499.50') || capturedReceipt.text.includes('1499.5'));
  assert.ok(capturedReceipt.text.includes('rcpt_maya_9999'));
  assert.ok(capturedReceipt.text.includes('pay_capture_987654'));
  assert.ok(capturedReceipt.text.includes('order_capture_123456'));
  assert.ok(capturedReceipt.text.includes('https://learnspace.io/courses/modern-architecture'));
  assert.ok(capturedReceipt.html.includes('Prof Frank Gehry'));

  // Test sendInstructorEnrollmentNotificationEmail directly
  const instSent = await sendInstructorEnrollmentNotificationEmail({
    to: 'unit_instructor@learn.io',
    instructorName: 'Prof Frank Gehry',
    studentName: 'Maya Lin',
    studentEmail: 'unit_student@learn.io',
    courseTitle: 'Modern Architectural Design',
    enrollmentDate: new Date('2026-11-02T12:00:00Z'),
    enrollmentType: 'paid',
    amount: 1499.5,
    currency: 'INR',
    dashboardUrl: 'https://learnspace.io/instructor/dashboard',
  });

  assert.strictEqual(instSent, true);
  assert.ok(capturedInstructor);
  assert.strictEqual(capturedInstructor.to, 'unit_instructor@learn.io');
  assert.ok(capturedInstructor.subject.includes('Modern Architectural Design'));
  assert.ok(capturedInstructor.text.includes('Prof Frank Gehry'));
  assert.ok(capturedInstructor.text.includes('Maya Lin'));
  assert.ok(capturedInstructor.text.includes('unit_student@learn.io'));
  assert.ok(capturedInstructor.html.includes('PAID ENROLLMENT'));
  assert.ok(capturedInstructor.html.includes('https://learnspace.io/instructor/dashboard'));
});
