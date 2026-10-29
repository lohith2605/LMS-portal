const test = require('node:test');
const assert = require('node:assert');
const nodemailer = require('nodemailer');
const User = require('../models/User');

// Save original environment
const originalEnv = { ...process.env };

const createMockRes = () => {
  const res = {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
  };
  return res;
};

test.describe('Instructor Approval Email & Admin Controller Suite', () => {

  test.beforeEach(() => {
    process.env = { ...originalEnv };
  });

  test.afterEach(() => {
    process.env = { ...originalEnv };
  });

  /* -------------------------------------------------------------
   * 1. Email Service Tests
   * ----------------------------------------------------------- */
  test('sendInstructorApprovalEmail returns false gracefully in test/simulation mode', async () => {
    process.env.NODE_ENV = 'test';
    delete require.cache[require.resolve('../services/emailService')];
    const { sendInstructorApprovalEmail } = require('../services/emailService');

    const result = await sendInstructorApprovalEmail({
      to: 'instructor1@example.com',
      name: 'Professor Smith',
      loginUrl: 'http://localhost:5173/login',
    });

    assert.strictEqual(result, false, 'Should return false when running in test simulation mode');
  });

  test('sendInstructorApprovalEmail sends email with correct parameters when transporter is configured', async () => {
    process.env.NODE_ENV = 'production';
    process.env.EMAIL_HOST = 'smtp.testserver.com';
    process.env.EMAIL_PORT = '587';
    process.env.EMAIL_USER = 'admin@learnspace.io';
    process.env.EMAIL_PASS = 'secretpassword';
    process.env.EMAIL_FROM = '"LearnSpace Admin" <admin@learnspace.io>';

    let capturedMail = null;
    const origCreateTransport = nodemailer.createTransport;
    nodemailer.createTransport = () => ({
      async sendMail(mailOptions) {
        capturedMail = mailOptions;
        return { messageId: 'mock-msg-123' };
      },
    });

    try {
      delete require.cache[require.resolve('../services/emailService')];
      const { sendInstructorApprovalEmail } = require('../services/emailService');

      const result = await sendInstructorApprovalEmail({
        to: 'instructor_verified@example.com',
        name: 'Dr. Jane Watson',
        loginUrl: 'http://localhost:5173/login',
      });

      assert.strictEqual(result, true, 'Should return true when email send succeeds');
      assert.ok(capturedMail, 'Transporter sendMail should have been called');
      assert.strictEqual(capturedMail.to, 'instructor_verified@example.com');
      assert.strictEqual(capturedMail.subject, 'LearnSpace — Instructor Application Approved');
      assert.ok(capturedMail.text.includes('Dr. Jane Watson'), 'Plaintext must contain instructor name');
      assert.ok(capturedMail.text.includes('http://localhost:5173/login'), 'Plaintext must contain login link');
      assert.ok(capturedMail.html.includes('Dr. Jane Watson'), 'HTML must contain instructor name');
      assert.ok(capturedMail.html.includes('http://localhost:5173/login'), 'HTML must contain login link');
      assert.ok(capturedMail.html.includes('Instructor Application Approved'), 'HTML must state approved status');
    } finally {
      nodemailer.createTransport = origCreateTransport;
    }
  });

  test('sendInstructorApprovalEmail safely catches sendMail rejection and returns false', async () => {
    process.env.NODE_ENV = 'production';
    process.env.EMAIL_HOST = 'smtp.testserver.com';
    process.env.EMAIL_PORT = '587';
    process.env.EMAIL_USER = 'admin@learnspace.io';
    process.env.EMAIL_PASS = 'secretpassword';

    const origCreateTransport = nodemailer.createTransport;
    nodemailer.createTransport = () => ({
      async sendMail() {
        throw new Error('SMTP connection timed out');
      },
    });

    try {
      delete require.cache[require.resolve('../services/emailService')];
      const { sendInstructorApprovalEmail } = require('../services/emailService');

      const result = await sendInstructorApprovalEmail({
        to: 'failed_instructor@example.com',
        name: 'Alex Taylor',
      });

      assert.strictEqual(result, false, 'Should catch SMTP error and return false without crashing');
    } finally {
      nodemailer.createTransport = origCreateTransport;
    }
  });

  /* -------------------------------------------------------------
   * 2. Admin Controller approveInstructor Tests
   * ----------------------------------------------------------- */
  test('approveInstructor activates pending instructor and triggers approval email', async () => {
    let emailDispatchedWith = null;
    let saved = false;

    const mockInstructor = {
      _id: 'inst_101',
      name: 'Alan Turing',
      email: 'alan.turing@learnspace.io',
      role: 'instructor',
      accountStatus: 'pending',
      async save() {
        saved = true;
        return this;
      },
      toObject() {
        return { ...this };
      },
    };

    const origFindById = User.findById;
    User.findById = async (id) => {
      if (id === 'inst_101') return mockInstructor;
      return null;
    };

    // Mock emailService
    delete require.cache[require.resolve('../services/emailService')];
    const emailService = require('../services/emailService');
    emailService.sendInstructorApprovalEmail = async (opts) => {
      emailDispatchedWith = opts;
      return true;
    };

    delete require.cache[require.resolve('../controllers/adminController')];
    const { approveInstructor } = require('../controllers/adminController');

    const req = {
      params: { id: 'inst_101' },
      user: { email: 'superadmin@learnspace.io' },
    };
    const res = createMockRes();

    try {
      await approveInstructor(req, res);

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(mockInstructor.accountStatus, 'active', 'Instructor accountStatus must be updated to active');
      assert.strictEqual(saved, true, 'User.save() must be called');
      assert.ok(emailDispatchedWith, 'sendInstructorApprovalEmail must be invoked');
      assert.strictEqual(emailDispatchedWith.to, 'alan.turing@learnspace.io');
      assert.strictEqual(emailDispatchedWith.name, 'Alan Turing');
      assert.ok(emailDispatchedWith.loginUrl.includes('/login'));
      assert.ok(res.body.message.includes('Alan Turing has been approved'));
    } finally {
      User.findById = origFindById;
    }
  });

  test('approveInstructor does NOT send duplicate email if instructor is already active', async () => {
    let emailDispatchedCount = 0;
    let saved = false;

    const mockInstructor = {
      _id: 'inst_102',
      name: 'Grace Hopper',
      email: 'grace.hopper@learnspace.io',
      role: 'instructor',
      accountStatus: 'active', // Already active
      async save() {
        saved = true;
        return this;
      },
      toObject() {
        return { ...this };
      },
    };

    const origFindById = User.findById;
    User.findById = async (id) => {
      if (id === 'inst_102') return mockInstructor;
      return null;
    };

    delete require.cache[require.resolve('../services/emailService')];
    const emailService = require('../services/emailService');
    emailService.sendInstructorApprovalEmail = async () => {
      emailDispatchedCount++;
      return true;
    };

    delete require.cache[require.resolve('../controllers/adminController')];
    const { approveInstructor } = require('../controllers/adminController');

    const req = {
      params: { id: 'inst_102' },
      user: { email: 'superadmin@learnspace.io' },
    };
    const res = createMockRes();

    try {
      await approveInstructor(req, res);

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(saved, true);
      assert.strictEqual(emailDispatchedCount, 0, 'Must NOT send duplicate email if already active');
    } finally {
      User.findById = origFindById;
    }
  });

  test('approveInstructor rejects non-instructor account with 400 and sends no email', async () => {
    let emailDispatchedCount = 0;

    const mockStudent = {
      _id: 'stud_201',
      name: 'Student Bob',
      email: 'bob@learnspace.io',
      role: 'student',
      accountStatus: 'active',
      async save() {
        return this;
      },
      toObject() {
        return { ...this };
      },
    };

    const origFindById = User.findById;
    User.findById = async () => mockStudent;

    delete require.cache[require.resolve('../services/emailService')];
    const emailService = require('../services/emailService');
    emailService.sendInstructorApprovalEmail = async () => {
      emailDispatchedCount++;
      return true;
    };

    delete require.cache[require.resolve('../controllers/adminController')];
    const { approveInstructor } = require('../controllers/adminController');

    const req = {
      params: { id: 'stud_201' },
      user: { email: 'superadmin@learnspace.io' },
    };
    const res = createMockRes();

    try {
      await approveInstructor(req, res);

      assert.strictEqual(res.statusCode, 400);
      assert.strictEqual(res.body.error, 'Target user is not an instructor account.');
      assert.strictEqual(emailDispatchedCount, 0, 'Must not send email to non-instructor');
    } finally {
      User.findById = origFindById;
    }
  });

  test('approveInstructor returns 404 when user is not found and sends no email', async () => {
    let emailDispatchedCount = 0;

    const origFindById = User.findById;
    User.findById = async () => null;

    delete require.cache[require.resolve('../services/emailService')];
    const emailService = require('../services/emailService');
    emailService.sendInstructorApprovalEmail = async () => {
      emailDispatchedCount++;
      return true;
    };

    delete require.cache[require.resolve('../controllers/adminController')];
    const { approveInstructor } = require('../controllers/adminController');

    const req = {
      params: { id: 'nonexistent_id' },
      user: { email: 'superadmin@learnspace.io' },
    };
    const res = createMockRes();

    try {
      await approveInstructor(req, res);

      assert.strictEqual(res.statusCode, 404);
      assert.strictEqual(res.body.error, 'Instructor account not found.');
      assert.strictEqual(emailDispatchedCount, 0);
    } finally {
      User.findById = origFindById;
    }
  });

  test('email dispatch failure does NOT roll back account status or return 500 error', async () => {
    const mockInstructor = {
      _id: 'inst_103',
      name: 'Ada Lovelace',
      email: 'ada@learnspace.io',
      role: 'instructor',
      accountStatus: 'pending',
      async save() {
        return this;
      },
      toObject() {
        return { ...this };
      },
    };

    const origFindById = User.findById;
    User.findById = async () => mockInstructor;

    delete require.cache[require.resolve('../services/emailService')];
    const emailService = require('../services/emailService');
    emailService.sendInstructorApprovalEmail = async () => {
      throw new Error('Network transport crashed');
    };

    delete require.cache[require.resolve('../controllers/adminController')];
    const { approveInstructor } = require('../controllers/adminController');

    const req = {
      params: { id: 'inst_103' },
      user: { email: 'superadmin@learnspace.io' },
    };
    const res = createMockRes();

    try {
      await approveInstructor(req, res);

      assert.strictEqual(res.statusCode, 200, 'Must return 200 even if email service throws');
      assert.strictEqual(mockInstructor.accountStatus, 'active', 'Instructor account must remain active');
      assert.ok(res.body.message.includes('Ada Lovelace has been approved'));
    } finally {
      User.findById = origFindById;
    }
  });
});

