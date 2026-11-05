const nodemailer = require('nodemailer');
const { logger } = require('../utils/logger');

const getClientBaseUrl = () => {
  const raw = process.env.CLIENT_URL || process.env.FRONTEND_URL || 'http://localhost:5174';
  return raw.toString().trim().replace(/\/+$/, '');
};

let transporter = null;
let customTransporter = null;

/**
 * Override or inject a custom transporter (useful for testing and mocks)
 * @param {Object|null} mockTransporter
 */
const setTransporter = (mockTransporter) => {
  customTransporter = mockTransporter;
};

/**
 * Get or initialize nodemailer transporter
 */
const getTransporter = () => {
  if (customTransporter) return customTransporter;

  if (process.env.NODE_ENV === 'test') {
    return null;
  }

  if (transporter) return transporter;

  const host = process.env.EMAIL_HOST;
  const port = Number(process.env.EMAIL_PORT) || 587;
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (host && user && pass) {
    try {
      transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
      return transporter;
    } catch (err) {
      logger.warn(`Failed to create email transporter: ${err.message}`);
      return null;
    }
  }

  return null;
};

/**
 * Send password reset email
 * @param {Object} options - { to, name, resetUrl }
 * @returns {Promise<boolean>}
 */
const sendPasswordResetEmail = async ({ to, name, resetUrl }) => {
  const mailTransporter = getTransporter();

  const subject = 'LearnSpace — Password Reset Request';
  const text = `Hello ${name},\n\nYou recently requested to reset your password for your LearnSpace account. Click the link below to set a new password:\n\n${resetUrl}\n\nThis link will expire in 15 minutes. If you did not make this request, you can safely ignore this email.\n\n— The LearnSpace Team`;
  const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 580px; margin: 0 auto; padding: 24px; background-color: #F8F8F6; border: 1px solid #E4E4E1; border-radius: 12px; color: #171717;">
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 20px;">
        <span style="font-size: 18px; font-weight: 800; color: #171717;">LearnSpace</span>
        <span style="font-size: 11px; font-weight: 600; text-transform: uppercase; background: #E9EFF2; color: #4A6376; padding: 2px 8px; border-radius: 9999px;">Security</span>
      </div>
      <h2 style="font-size: 20px; font-weight: 700; margin-bottom: 12px; color: #171717;">Reset your password</h2>
      <p style="font-size: 14px; line-height: 1.6; color: #686868; margin-bottom: 24px;">
        Hello <strong>${name}</strong>,<br/>
        We received a request to reset the password for your LearnSpace account. Click the button below to choose a new password:
      </p>
      <div style="margin-bottom: 24px;">
        <a href="${resetUrl}" style="display: inline-block; background-color: #171717; color: #FFFFFF; font-size: 14px; font-weight: 600; text-decoration: none; padding: 12px 24px; border-radius: 8px;">Reset Password</a>
      </div>
      <p style="font-size: 12px; color: #8A8A86; line-height: 1.5;">
        This reset link is valid for <strong>15 minutes</strong>. If you did not request a password reset, please disregard this email; your account remains secure.
      </p>
      <hr style="border: none; border-top: 1px solid #E4E4E1; margin: 24px 0;" />
      <p style="font-size: 11px; color: #8A8A86;">LearnSpace LMS Platform • Secure Authentication</p>
    </div>
  `;

  if (!mailTransporter) {
    logger.info(`[Email Service Simulation] Password reset requested for ${to}. Email credentials not configured or operating in local test mode.`);
    return false;
  }

  try {
    const fromAddress = process.env.EMAIL_FROM || `"LearnSpace" <${process.env.EMAIL_USER}>`;
    await mailTransporter.sendMail({
      from: fromAddress,
      to,
      subject,
      text,
      html,
    });
    logger.success(`Password reset email delivered to ${to}`);
    return true;
  } catch (error) {
    logger.warn(`Failed to dispatch password reset email to ${to}: ${error.message}`);
    return false;
  }
};

/**
 * Send email verification link
 * @param {Object} options - { to, name, verifyUrl }
 * @returns {Promise<boolean>}
 */
const sendVerificationEmail = async ({ to, name, verifyUrl }) => {
  const mailTransporter = getTransporter();

  const subject = 'LearnSpace — Verify Your Email Address';
  const text = `Hello ${name},\n\nThank you for registering on LearnSpace. Please verify your email by clicking:\n\n${verifyUrl}\n\n— The LearnSpace Team`;
  const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 580px; margin: 0 auto; padding: 24px; background-color: #F8F8F6; border: 1px solid #E4E4E1; border-radius: 12px; color: #171717;">
      <h2 style="font-size: 20px; font-weight: 700; margin-bottom: 12px;">Welcome to LearnSpace</h2>
      <p style="font-size: 14px; line-height: 1.6; color: #686868; margin-bottom: 24px;">
        Hello <strong>${name}</strong>,<br/>
        Please confirm your email address by clicking the link below:
      </p>
      <div style="margin-bottom: 24px;">
        <a href="${verifyUrl}" style="display: inline-block; background-color: #171717; color: #FFFFFF; font-size: 14px; font-weight: 600; text-decoration: none; padding: 12px 24px; border-radius: 8px;">Verify Email</a>
      </div>
    </div>
  `;

  if (!mailTransporter) {
    logger.info(`[Email Service Simulation] Email verification link created for ${to}.`);
    return false;
  }

  try {
    const fromAddress = process.env.EMAIL_FROM || `"LearnSpace" <${process.env.EMAIL_USER}>`;
    await mailTransporter.sendMail({
      from: fromAddress,
      to,
      subject,
      text,
      html,
    });
    logger.success(`Verification email delivered to ${to}`);
    return true;
  } catch (error) {
    logger.warn(`Failed to send verification email to ${to}: ${error.message}`);
    return false;
  }
};

/**
 * Send instructor application approval email
 * @param {Object} options - { to, name, loginUrl }
 * @returns {Promise<boolean>}
 */
const sendInstructorApprovalEmail = async ({ to, name, loginUrl }) => {
  const mailTransporter = getTransporter();

  const resolvedLoginUrl = loginUrl || `${getClientBaseUrl()}/login`;
  const subject = 'LearnSpace — Instructor Application Approved';
  const text = `Hello ${name},\n\nCongratulations! Your instructor application for LearnSpace has been reviewed and approved by the platform administration team.\n\nYour instructor permissions are now active. You can log in to your account, access the Instructor Workspace, create and manage courses, and review student submissions.\n\nSign in to your account here:\n${resolvedLoginUrl}\n\nWelcome to the LearnSpace teaching community!\n\n— The LearnSpace Team`;
  const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 580px; margin: 0 auto; padding: 24px; background-color: #F8F8F6; border: 1px solid #E4E4E1; border-radius: 12px; color: #171717;">
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 20px;">
        <span style="font-size: 18px; font-weight: 800; color: #171717;">LearnSpace</span>
        <span style="font-size: 11px; font-weight: 600; text-transform: uppercase; background: #E2ECE5; color: #2E5B3E; padding: 2px 8px; border-radius: 9999px;">Instructor</span>
      </div>
      <h2 style="font-size: 20px; font-weight: 700; margin-bottom: 12px; color: #171717;">Instructor Application Approved</h2>
      <p style="font-size: 14px; line-height: 1.6; color: #686868; margin-bottom: 16px;">
        Hello <strong>${name}</strong>,<br/>
        Congratulations! Your application to teach on LearnSpace has been reviewed and approved by the platform administration team.
      </p>
      <p style="font-size: 14px; line-height: 1.6; color: #686868; margin-bottom: 24px;">
        Your instructor permissions are now fully active. You can log in to your account, access the Instructor Workspace, create and publish courses, author quizzes and assignments, and review learner submissions.
      </p>
      <div style="margin-bottom: 24px;">
        <a href="${resolvedLoginUrl}" style="display: inline-block; background-color: #171717; color: #FFFFFF; font-size: 14px; font-weight: 600; text-decoration: none; padding: 12px 24px; border-radius: 8px;">Log In to Instructor Workspace</a>
      </div>
      <p style="font-size: 12px; color: #8A8A86; line-height: 1.5;">
        You can sign in directly using your registered email address (<strong>${to}</strong>) and password. If you need any assistance getting started, please reach out to our platform support team.
      </p>
      <hr style="border: none; border-top: 1px solid #E4E4E1; margin: 24px 0;" />
      <p style="font-size: 11px; color: #8A8A86;">LearnSpace LMS Platform • Educator Community</p>
    </div>
  `;

  if (!mailTransporter) {
    logger.info(`[Email Service Simulation] Instructor approval notification prepared for ${to}. Email credentials not configured or operating in local test mode.`);
    return false;
  }

  try {
    const fromAddress = process.env.EMAIL_FROM || `"LearnSpace" <${process.env.EMAIL_USER}>`;
    await mailTransporter.sendMail({
      from: fromAddress,
      to,
      subject,
      text,
      html,
    });
    logger.success(`Instructor approval email delivered to ${to}`);
    return true;
  } catch (error) {
    logger.warn(`Failed to dispatch instructor approval email to ${to}: ${error.message}`);
    return false;
  }
};

/**
 * Escape HTML characters to prevent template injection
 */
const escapeHtml = (str) => {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

/**
 * Send assignment deadline reminder email (24-hour or 1-hour warning)
 * @param {Object} options - { to, name, assignmentTitle, courseTitle, dueDate, reminderType, assignmentUrl }
 * @returns {Promise<boolean>}
 */
const sendAssignmentDeadlineReminderEmail = async ({
  to,
  name,
  assignmentTitle,
  courseTitle,
  dueDate,
  reminderType = '24h',
  assignmentUrl,
}) => {
  const mailTransporter = getTransporter();

  const is1h = reminderType === '1h';
  const subjectPrefix = is1h
    ? 'Final Reminder: Assignment due in 1 hour — '
    : 'Reminder: Assignment due tomorrow — ';
  const subject = `${subjectPrefix}${assignmentTitle || 'Course Assignment'}`;

  const safeName = escapeHtml(name || 'Learner');
  const safeAssignmentTitle = escapeHtml(assignmentTitle || 'Course Assignment');
  const safeCourseTitle = escapeHtml(courseTitle || 'Enrolled Course');

  const formattedDueDate = dueDate
    ? new Date(dueDate).toUTCString()
    : 'Upcoming Deadline';

  const timeRemainingText = is1h ? 'in less than 1 hour' : 'tomorrow (in 24 hours)';

  const resolvedAssignmentUrl =
    assignmentUrl ||
    `${getClientBaseUrl()}/student/dashboard?tab=assignments`;

  const text = `Hello ${safeName},\n\nThis is a reminder that your assignment "${assignmentTitle}" for "${courseTitle}" is due ${timeRemainingText}.\n\nDeadline (UTC): ${formattedDueDate}\n\nPlease ensure your deliverables are submitted before the deadline.\n\nView Assignment:\n${resolvedAssignmentUrl}\n\n— The LearnSpace Team`;

  const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 580px; margin: 0 auto; padding: 24px; background-color: #F8F8F6; border: 1px solid #E4E4E1; border-radius: 12px; color: #171717;">
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 20px;">
        <span style="font-size: 18px; font-weight: 800; color: #171717;">LearnSpace</span>
        <span style="font-size: 11px; font-weight: 600; text-transform: uppercase; background: ${is1h ? '#FDE8E8' : '#FEF3C7'}; color: ${is1h ? '#9B1C1C' : '#92400E'}; padding: 2px 8px; border-radius: 9999px;">
          ${is1h ? 'Final 1-Hour Reminder' : '24-Hour Deadline Reminder'}
        </span>
      </div>
      <h2 style="font-size: 20px; font-weight: 700; margin-bottom: 8px; color: #171717;">
        ${is1h ? 'Assignment Due in 1 Hour' : 'Assignment Due Tomorrow'}
      </h2>
      <p style="font-size: 14px; line-height: 1.6; color: #686868; margin-bottom: 16px;">
        Hello <strong>${safeName}</strong>,<br/>
        This is an automated reminder that your assignment <strong>${safeAssignmentTitle}</strong> in <strong>${safeCourseTitle}</strong> is due <strong>${timeRemainingText}</strong>.
      </p>
      <div style="background-color: #FFFFFF; border: 1px solid #E4E4E1; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
        <div style="font-size: 12px; font-weight: 600; text-transform: uppercase; color: #8A8A86; margin-bottom: 4px;">Deadline (UTC)</div>
        <div style="font-size: 16px; font-weight: 700; color: #171717;">${formattedDueDate}</div>
      </div>
      <div style="margin-bottom: 24px;">
        <a href="${resolvedAssignmentUrl}" style="display: inline-block; background-color: #171717; color: #FFFFFF; font-size: 14px; font-weight: 600; text-decoration: none; padding: 12px 24px; border-radius: 8px;">
          Open Assignment in LearnSpace
        </a>
      </div>
      <p style="font-size: 12px; color: #8A8A86; line-height: 1.5;">
        Please make sure all required text responses and attached deliverables are submitted before the deadline.
      </p>
      <hr style="border: none; border-top: 1px solid #E4E4E1; margin: 24px 0;" />
      <p style="font-size: 11px; color: #8A8A86;">LearnSpace LMS Platform • Automated Academic Reminders</p>
    </div>
  `;

  if (!mailTransporter) {
    logger.info(`[Email Service Simulation] Assignment deadline reminder prepared for ${to}. Email credentials not configured or operating in local test mode.`);
    return false;
  }

  try {
    const fromAddress = process.env.EMAIL_FROM || `"LearnSpace" <${process.env.EMAIL_USER}>`;
    await mailTransporter.sendMail({
      from: fromAddress,
      to,
      subject,
      text,
      html,
    });
    logger.success(`Assignment deadline reminder email delivered to ${to}`);
    return true;
  } catch (error) {
    logger.warn(`Failed to dispatch assignment deadline reminder email to ${to}: ${error.message}`);
    return false;
  }
};

/**
 * Send two-factor authentication email OTP
 * @param {Object} options - { to, name, otp }
 * @returns {Promise<boolean>}
 */
const sendQuizDeadlineReminderEmail = async ({
  to,
  name,
  quizTitle,
  courseTitle,
  dueDate,
  reminderType = '24h',
  quizUrl,
}) => {
  const mailTransporter = getTransporter();

  const is1h = reminderType === '1h';
  const subjectPrefix = is1h
    ? 'Final Reminder: Quiz deadline in 1 hour — '
    : 'Reminder: Quiz due tomorrow — ';
  const subject = `${subjectPrefix}${quizTitle || 'Course Quiz'}`;

  const safeName = escapeHtml(name || 'Learner');
  const safeQuizTitle = escapeHtml(quizTitle || 'Course Quiz');
  const safeCourseTitle = escapeHtml(courseTitle || 'Enrolled Course');

  const formattedDueDate = dueDate
    ? new Date(dueDate).toUTCString()
    : 'Upcoming Deadline';

  const timeRemainingText = is1h ? 'in less than 1 hour' : 'tomorrow (in 24 hours)';

  const resolvedQuizUrl =
    quizUrl ||
    `${getClientBaseUrl()}/student/dashboard?tab=calendar`;

  const text = `Hello ${safeName},\n\nThis is a reminder that your quiz "${quizTitle}" for "${courseTitle}" is due ${timeRemainingText}.\n\nDeadline (UTC): ${formattedDueDate}\n\nPlease complete your attempts before the deadline.\n\nTake Quiz:\n${resolvedQuizUrl}\n\n— The LearnSpace Team`;

  const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 580px; margin: 0 auto; padding: 24px; background-color: #F8F8F6; border: 1px solid #E4E4E1; border-radius: 12px; color: #171717;">
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 20px;">
        <span style="font-size: 18px; font-weight: 800; color: #171717;">LearnSpace</span>
        <span style="font-size: 11px; font-weight: 600; text-transform: uppercase; background: ${is1h ? '#FDE8E8' : '#FEF3C7'}; color: ${is1h ? '#9B1C1C' : '#92400E'}; padding: 2px 8px; border-radius: 9999px;">
          ${is1h ? 'Final 1-Hour Quiz Reminder' : '24-Hour Quiz Reminder'}
        </span>
      </div>
      <h2 style="font-size: 20px; font-weight: 700; margin-bottom: 8px; color: #171717;">
        ${is1h ? 'Quiz Due in 1 Hour' : 'Quiz Due Tomorrow'}
      </h2>
      <p style="font-size: 14px; line-height: 1.6; color: #686868; margin-bottom: 16px;">
        Hello <strong>${safeName}</strong>,<br/>
        This is an automated reminder that your quiz <strong>${safeQuizTitle}</strong> in <strong>${safeCourseTitle}</strong> is due <strong>${timeRemainingText}</strong>.
      </p>
      <div style="background-color: #FFFFFF; border: 1px solid #E4E4E1; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
        <div style="font-size: 12px; font-weight: 600; text-transform: uppercase; color: #8A8A86; margin-bottom: 4px;">Deadline (UTC)</div>
        <div style="font-size: 16px; font-weight: 700; color: #171717;">${formattedDueDate}</div>
      </div>
      <div style="margin-bottom: 24px;">
        <a href="${resolvedQuizUrl}" style="display: inline-block; background-color: #171717; color: #FFFFFF; font-size: 14px; font-weight: 600; padding: 12px 24px; border-radius: 8px; text-decoration: none;">
          Take Quiz Now
        </a>
      </div>
      <div style="font-size: 12px; color: #8A8A86; line-height: 1.5; border-top: 1px solid #E4E4E1; padding-top: 16px;">
        Make sure you allow sufficient time to answer all questions before the deadline closes.<br/>
        If you have already achieved a passing score, you may safely ignore this message.
      </div>
    </div>
  `;

  if (!mailTransporter) {
    logger.info(
      `[Email Service Simulation] Quiz deadline reminder prepared for ${to}. Email credentials not configured or operating in local test mode.`
    );
    return true;
  }

  try {
    const fromAddress =
      process.env.EMAIL_FROM ||
      (process.env.SMTP_USER ? `"LearnSpace" <${process.env.SMTP_USER}>` : '"LearnSpace" <noreply@learnspace.org>');

    const info = await mailTransporter.sendMail({
      from: fromAddress,
      to,
      subject,
      text,
      html,
    });

    logger.success(`Quiz deadline reminder email delivered to ${to} (${info.messageId || 'ok'})`);
    return true;
  } catch (error) {
    logger.warn(`Failed to dispatch quiz deadline reminder email to ${to}: ${error.message}`);
    throw error;
  }
};

const sendMfaEmailOtp = async ({ to, name, otp }) => {
  const mailTransporter = getTransporter();

  const safeName = (name || 'Learner').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const subject = 'LearnSpace — Your Two-Factor Verification Code';
  const text = `Hello ${safeName},\n\nYour LearnSpace two-factor verification code is: ${otp}\n\nThis code will expire in 10 minutes. If you did not request this sign-in attempt, please reset your password immediately.\n\n— The LearnSpace Security Team`;

  const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 540px; margin: 0 auto; padding: 28px; background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; color: #0F172A;">
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 24px;">
        <span style="font-size: 20px; font-weight: 800; color: #0F172A;">Learn<span style="color: #2563EB;">Space</span></span>
        <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; background: #EEF2FF; color: #4338CA; padding: 3px 10px; border-radius: 9999px; letter-spacing: 0.05em;">Security</span>
      </div>
      <h2 style="font-size: 20px; font-weight: 700; margin-bottom: 12px; color: #0F172A;">Two-Factor Authentication</h2>
      <p style="font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 20px;">
        Hello <strong>${safeName}</strong>,<br/>
        Use the single-use verification code below to complete your sign-in to LearnSpace:
      </p>
      <div style="background-color: #F8FAFC; border: 1.5px dashed #CBD5E1; border-radius: 10px; padding: 18px; text-align: center; margin-bottom: 24px;">
        <span style="font-family: 'Courier New', Courier, monospace; font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #1E293B; display: inline-block;">
          ${otp}
        </span>
      </div>
      <p style="font-size: 13px; line-height: 1.5; color: #64748B; margin-bottom: 24px;">
        This code is valid for <strong>10 minutes</strong> and can only be used once. Never share this code with anyone.
      </p>
      <div style="background-color: #FFFBEB; border-left: 4px solid #F59E0B; padding: 12px 14px; border-radius: 4px; margin-bottom: 24px;">
        <p style="font-size: 12px; color: #92400E; margin: 0; line-height: 1.5;">
          If you did not initiate this authentication request, someone may know your password. We recommend resetting your password immediately.
        </p>
      </div>
      <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 24px 0;" />
      <p style="font-size: 11px; color: #94A3B8;">LearnSpace LMS Platform • Account Security & Protection</p>
    </div>
  `;

  if (!mailTransporter) {
    logger.info(`[Email Service Simulation] MFA OTP [${otp}] dispatched to ${to}. Email credentials not configured or operating in test mode.`);
    return true; // Return true so flow succeeds in simulation / test environment
  }

  try {
    const fromAddress = process.env.EMAIL_FROM || `"LearnSpace Security" <${process.env.EMAIL_USER}>`;
    await mailTransporter.sendMail({
      from: fromAddress,
      to,
      subject,
      text,
      html,
    });
    logger.success(`MFA verification OTP email delivered to ${to}`);
    return true;
  } catch (error) {
    logger.warn(`Failed to dispatch MFA OTP email to ${to}: ${error.message}`);
    return false;
  }
};

/**
 * Send course payment receipt email to student upon successful payment verification
 * @param {Object} options
 * @param {string} options.to - Student's email
 * @param {string} [options.studentName] - Student's display name
 * @param {string} options.courseTitle - Title of the course
 * @param {string} [options.instructorName] - Instructor's name
 * @param {number} options.amount - Paid amount
 * @param {string} [options.currency='INR'] - Payment currency
 * @param {Date|string} [options.paymentDate] - Date of payment
 * @param {string} [options.razorpayPaymentId] - Razorpay payment ID
 * @param {string} [options.razorpayOrderId] - Razorpay order ID
 * @param {string} [options.receiptId] - Internal receipt reference identifier
 * @param {string} [options.courseUrl] - Link to course or student dashboard
 * @returns {Promise<boolean>}
 */
const sendPaymentReceiptEmail = async ({
  to,
  studentName,
  courseTitle,
  instructorName,
  amount,
  currency = 'INR',
  paymentDate,
  razorpayPaymentId,
  razorpayOrderId,
  receiptId,
  courseUrl,
}) => {
  const mailTransporter = getTransporter();

  const safeStudentName = escapeHtml(studentName || 'Learner');
  const safeCourseTitle = escapeHtml(courseTitle || 'Enrolled Course');
  const safeInstructorName = escapeHtml(instructorName || 'LearnSpace Educator');
  const safeReceiptId = escapeHtml(receiptId || 'N/A');
  const safePaymentId = escapeHtml(razorpayPaymentId || 'N/A');
  const safeOrderId = escapeHtml(razorpayOrderId || 'N/A');
  const curr = (currency || 'INR').toUpperCase();
  const formattedAmount = `${curr} ${Number(amount || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
  const formattedDate = paymentDate ? new Date(paymentDate).toUTCString() : new Date().toUTCString();
  const resolvedCourseUrl =
    courseUrl ||
    `${getClientBaseUrl()}/student/dashboard?tab=courses`;

  const subject = `LearnSpace — Payment Receipt: ${courseTitle || 'Course Enrollment'}`;

  const text = `Hello ${studentName || 'Learner'},\n\nThank you for your purchase on LearnSpace! Your payment has been successfully processed and your course enrollment is confirmed.\n\n--- Payment Receipt Summary ---\nCourse: ${courseTitle || 'Course'}\nInstructor: ${instructorName || 'LearnSpace Educator'}\nAmount Paid: ${formattedAmount}\nPayment Date: ${formattedDate}\nReceipt Reference: ${receiptId || 'N/A'}\nRazorpay Payment ID: ${razorpayPaymentId || 'N/A'}\nRazorpay Order ID: ${razorpayOrderId || 'N/A'}\n\nAccess your course here:\n${resolvedCourseUrl}\n\nKeep this email for your records. If you did not make this purchase, please contact platform security immediately.\n\n— The LearnSpace Team`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 28px; background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; color: #0F172A;">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; border-bottom: 1px solid #E2E8F0; padding-bottom: 16px;">
        <div style="font-size: 20px; font-weight: 800; color: #0F172A;">
          Learn<span style="color: #2563EB;">Space</span>
        </div>
        <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; background: #EEF2FF; color: #1D4ED8; padding: 4px 10px; border-radius: 9999px; letter-spacing: 0.05em;">
          Payment Receipt
        </span>
      </div>

      <h2 style="font-size: 20px; font-weight: 700; margin-bottom: 8px; color: #0F172A;">Payment Confirmed</h2>
      <p style="font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 20px;">
        Hello <strong>${safeStudentName}</strong>,<br/>
        Thank you for your enrollment. We have verified your payment for <strong>${safeCourseTitle}</strong>. Your course access is now fully active.
      </p>

      <div style="background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
        <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; color: #64748B; margin-bottom: 12px; letter-spacing: 0.05em;">Transaction Details</div>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <tr>
            <td style="padding: 6px 0; color: #64748B;">Course</td>
            <td style="padding: 6px 0; color: #0F172A; font-weight: 600; text-align: right;">${safeCourseTitle}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748B;">Instructor</td>
            <td style="padding: 6px 0; color: #0F172A; text-align: right;">${safeInstructorName}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748B;">Amount Paid</td>
            <td style="padding: 6px 0; color: #2563EB; font-weight: 700; font-size: 15px; text-align: right;">${formattedAmount}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748B;">Payment Date</td>
            <td style="padding: 6px 0; color: #0F172A; text-align: right;">${formattedDate}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748B;">Receipt Reference</td>
            <td style="padding: 6px 0; font-family: monospace; color: #0F172A; text-align: right;">${safeReceiptId}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748B;">Payment ID</td>
            <td style="padding: 6px 0; font-family: monospace; color: #0F172A; text-align: right;">${safePaymentId}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748B;">Order ID</td>
            <td style="padding: 6px 0; font-family: monospace; color: #0F172A; text-align: right;">${safeOrderId}</td>
          </tr>
        </table>
      </div>

      <div style="margin-bottom: 24px;">
        <a href="${resolvedCourseUrl}" style="display: inline-block; background-color: #2563EB; color: #FFFFFF; font-size: 14px; font-weight: 600; text-decoration: none; padding: 12px 24px; border-radius: 8px;">
          Access Your Course
        </a>
      </div>

      <p style="font-size: 12px; color: #94A3B8; line-height: 1.5; margin-bottom: 20px;">
        Keep this email for your records. If you did not make this transaction, please contact platform security immediately.
      </p>

      <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 20px 0;" />
      <p style="font-size: 11px; color: #94A3B8; margin: 0;">LearnSpace LMS Platform • Official Payment Confirmation</p>
    </div>
  `;

  if (!mailTransporter) {
    logger.info(`[Email Service Simulation] Payment receipt prepared for ${to}. Email credentials not configured or operating in local test mode.`);
    return false;
  }

  try {
    const fromAddress = process.env.EMAIL_FROM || `"LearnSpace Billing" <${process.env.EMAIL_USER}>`;
    await mailTransporter.sendMail({
      from: fromAddress,
      to,
      subject,
      text,
      html,
    });
    logger.success(`Payment receipt email delivered to ${to}`);
    return true;
  } catch (error) {
    logger.warn(`Failed to dispatch payment receipt email to ${to}: ${error.message}`);
    throw error;
  }
};

/**
 * Send student enrollment notification to course instructor (for free or paid enrollments)
 * @param {Object} options
 * @param {string} options.to - Instructor's email address
 * @param {string} [options.instructorName] - Instructor's name
 * @param {string} [options.studentName] - Student's name
 * @param {string} [options.studentEmail] - Student's email
 * @param {string} options.courseTitle - Title of the course
 * @param {Date|string} [options.enrollmentDate] - Date of enrollment
 * @param {'free'|'paid'} [options.enrollmentType='free'] - Type of enrollment
 * @param {number} [options.amount=0] - Amount paid (if paid enrollment)
 * @param {string} [options.currency='INR'] - Currency
 * @param {string} [options.dashboardUrl] - Link to instructor dashboard
 * @returns {Promise<boolean>}
 */
const sendInstructorEnrollmentNotificationEmail = async ({
  to,
  instructorName,
  studentName,
  studentEmail,
  courseTitle,
  enrollmentDate,
  enrollmentType = 'free',
  amount = 0,
  currency = 'INR',
  dashboardUrl,
}) => {
  const mailTransporter = getTransporter();

  const safeInstructorName = escapeHtml(instructorName || 'Educator');
  const safeStudentName = escapeHtml(studentName || 'Student');
  const safeStudentEmail = escapeHtml(studentEmail || 'N/A');
  const safeCourseTitle = escapeHtml(courseTitle || 'Course');
  const isPaid = enrollmentType === 'paid';
  const curr = (currency || 'INR').toUpperCase();
  const formattedAmount = isPaid
    ? `${curr} ${Number(amount || 0).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`
    : 'Free';
  const formattedDate = enrollmentDate
    ? new Date(enrollmentDate).toUTCString()
    : new Date().toUTCString();
  const resolvedDashboardUrl =
    dashboardUrl ||
    `${getClientBaseUrl()}/instructor/dashboard`;

  const subject = `LearnSpace — New Student Enrolled: ${courseTitle || 'Course'}`;

  const text = `Hello ${instructorName || 'Educator'},\n\nGreat news! A new student has enrolled in your course "${courseTitle || 'Course'}".\n\n--- Enrollment Details ---\nStudent: ${studentName || 'Student'} (${studentEmail || 'N/A'})\nCourse: ${courseTitle || 'Course'}\nEnrollment Type: ${isPaid ? 'Paid Enrollment' : 'Free Enrollment'}\n${isPaid ? `Amount Paid: ${formattedAmount}\n` : ''}Date: ${formattedDate}\n\nYou can manage your courses and review student progress in your Instructor Workspace:\n${resolvedDashboardUrl}\n\n— The LearnSpace Team`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 28px; background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; color: #0F172A;">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; border-bottom: 1px solid #E2E8F0; padding-bottom: 16px;">
        <div style="font-size: 20px; font-weight: 800; color: #0F172A;">
          Learn<span style="color: #2563EB;">Space</span>
        </div>
        <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; background: #E0F2FE; color: #0369A1; padding: 4px 10px; border-radius: 9999px; letter-spacing: 0.05em;">
          New Enrollment
        </span>
      </div>

      <h2 style="font-size: 20px; font-weight: 700; margin-bottom: 8px; color: #0F172A;">New Student Enrolled</h2>
      <p style="font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 20px;">
        Hello <strong>${safeInstructorName}</strong>,<br/>
        A new student has enrolled in your course <strong>${safeCourseTitle}</strong>.
      </p>

      <div style="background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
        <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; color: #64748B; margin-bottom: 12px; letter-spacing: 0.05em;">Enrollment Summary</div>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <tr>
            <td style="padding: 6px 0; color: #64748B;">Student Name</td>
            <td style="padding: 6px 0; color: #0F172A; font-weight: 600; text-align: right;">${safeStudentName}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748B;">Student Email</td>
            <td style="padding: 6px 0; color: #0F172A; text-align: right;">${safeStudentEmail}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748B;">Course</td>
            <td style="padding: 6px 0; color: #0F172A; font-weight: 600; text-align: right;">${safeCourseTitle}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748B;">Enrollment Type</td>
            <td style="padding: 6px 0; text-align: right;">
              <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; background-color: ${isPaid ? '#DCFCE7' : '#F1F5F9'}; color: ${isPaid ? '#15803D' : '#475569'};">
                ${isPaid ? 'PAID ENROLLMENT' : 'FREE ENROLLMENT'}
              </span>
            </td>
          </tr>
          ${isPaid ? `<tr>
            <td style="padding: 6px 0; color: #64748B;">Course Fee Paid</td>
            <td style="padding: 6px 0; color: #2563EB; font-weight: 700; font-size: 14px; text-align: right;">${formattedAmount}</td>
          </tr>` : ''}
          <tr>
            <td style="padding: 6px 0; color: #64748B;">Date</td>
            <td style="padding: 6px 0; color: #0F172A; text-align: right;">${formattedDate}</td>
          </tr>
        </table>
      </div>

      <div style="margin-bottom: 24px;">
        <a href="${resolvedDashboardUrl}" style="display: inline-block; background-color: #2563EB; color: #FFFFFF; font-size: 14px; font-weight: 600; text-decoration: none; padding: 12px 24px; border-radius: 8px;">
          View in Instructor Dashboard
        </a>
      </div>

      <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 20px 0;" />
      <p style="font-size: 11px; color: #94A3B8; margin: 0;">LearnSpace LMS Platform • Educator Notifications</p>
    </div>
  `;

  if (!mailTransporter) {
    logger.info(`[Email Service Simulation] Instructor enrollment notification prepared for ${to}. Email credentials not configured or operating in local test mode.`);
    return false;
  }

  try {
    const fromAddress = process.env.EMAIL_FROM || `"LearnSpace Notifications" <${process.env.EMAIL_USER}>`;
    await mailTransporter.sendMail({
      from: fromAddress,
      to,
      subject,
      text,
      html,
    });
    logger.success(`Instructor enrollment notification email delivered to ${to}`);
    return true;
  } catch (error) {
    logger.warn(`Failed to dispatch instructor enrollment notification email to ${to}: ${error.message}`);
    throw error;
  }
};

/**
 * Send official course completion certificate email with PDF attachment
 * @param {Object} options
 * @param {string} options.to - Student email address
 * @param {string} options.studentName - Student full name
 * @param {string} options.courseTitle - Course title
 * @param {string} options.certificateId - Certificate ID (e.g. LS-2026-XXXX-XXXX)
 * @param {string|Date} [options.completionDate] - Completion date
 * @param {Buffer} [options.pdfBuffer] - Generated PDF binary buffer
 * @param {string} [options.verifyUrl] - Public verification page URL
 * @param {string} [options.downloadUrl] - Direct PDF download API URL
 * @returns {Promise<boolean>}
 */
const sendCertificateEmail = async ({
  to,
  studentName,
  courseTitle,
  certificateId,
  completionDate = new Date(),
  pdfBuffer,
  verifyUrl,
  downloadUrl,
}) => {
  const mailTransporter = getTransporter();
  const safeName = studentName || 'Learner';
  const safeCourse = courseTitle || 'Course of Study';
  const safeId = certificateId || 'LS-CREDENTIAL';
  const clientBase = getClientBaseUrl();
  const directVerifyUrl = verifyUrl || `${clientBase}/verify/${safeId}`;
  const directDownloadUrl = downloadUrl || `${clientBase}/api/certificates/${safeId}/download`;

  const formattedDate = new Date(completionDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const subject = 'Congratulations! You have completed your LearnSpace course.';

  const text = `Hello ${safeName},

Congratulations on completing your course, "${safeCourse}"!

Your verified Certificate of Completion has been officially issued.

Credential Details:
- Course: ${safeCourse}
- Completion Date: ${formattedDate}
- Certificate ID: ${safeId}
- Public Verification Link: ${directVerifyUrl}
- Direct Download Link: ${directDownloadUrl}

Your official certificate PDF is attached to this email. You can also view and download it at any time from your LearnSpace Student Dashboard.

Best regards,
The LearnSpace Academic Team`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 16px; color: #0F172A;">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; border-bottom: 1px solid #F1F5F9; padding-bottom: 16px;">
        <span style="font-size: 20px; font-weight: 800; color: #1E3A8A; letter-spacing: -0.5px;">LearnSpace</span>
        <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; background: #EFF6FF; color: #1D4ED8; padding: 4px 10px; border-radius: 9999px; letter-spacing: 0.5px;">Official Credential</span>
      </div>

      <div style="text-align: center; margin: 20px 0 28px 0;">
        <div style="display: inline-block; background-color: #FEF3C7; color: #D97706; padding: 6px 16px; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px;">
          ★ Graduation Achievement
        </div>
        <h1 style="font-size: 22px; font-weight: 800; color: #0F172A; margin: 0 0 8px 0; line-height: 1.3;">
          Congratulations, ${safeName}!
        </h1>
        <p style="font-size: 14px; color: #475569; margin: 0; line-height: 1.5;">
          You have successfully completed <strong>${safeCourse}</strong>.
        </p>
      </div>

      <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
        <h3 style="font-size: 12px; font-weight: 700; text-transform: uppercase; color: #64748B; margin: 0 0 12px 0; letter-spacing: 0.5px;">
          Credential Summary
        </h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <tr>
            <td style="padding: 6px 0; color: #64748B;">Course</td>
            <td style="padding: 6px 0; font-weight: 600; color: #0F172A; text-align: right;">${safeCourse}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748B;">Issued To</td>
            <td style="padding: 6px 0; font-weight: 600; color: #0F172A; text-align: right;">${safeName}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748B;">Completion Date</td>
            <td style="padding: 6px 0; font-weight: 600; color: #0F172A; text-align: right;">${formattedDate}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748B;">Certificate ID</td>
            <td style="padding: 6px 0; font-family: monospace; font-weight: 700; color: #1D4ED8; text-align: right;">${safeId}</td>
          </tr>
        </table>
      </div>

      <p style="font-size: 13px; color: #475569; line-height: 1.6; margin-bottom: 24px;">
        Your verified PDF certificate is attached to this email. You can also share your public verification link with employers or download your official credential from your student dashboard at any time.
      </p>

      <div style="text-align: center; margin-bottom: 28px;">
        <a href="${directVerifyUrl}" style="display: inline-block; background-color: #1E3A8A; color: #FFFFFF; font-size: 14px; font-weight: 700; text-decoration: none; padding: 12px 28px; border-radius: 10px; margin: 0 6px 8px 6px;">
          View & Verify Credential
        </a>
      </div>

      <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 24px 0 16px 0;" />
      <p style="font-size: 11px; color: #94A3B8; text-align: center; margin: 0; line-height: 1.5;">
        LearnSpace LMS Platform • Academic Credential Registry<br/>
        Credential ID: ${safeId}
      </p>
    </div>
  `;

  const attachments = [];
  if (pdfBuffer && Buffer.isBuffer(pdfBuffer)) {
    attachments.push({
      filename: `LearnSpace-Certificate-${safeId}.pdf`,
      content: pdfBuffer,
      contentType: 'application/pdf',
    });
  }

  if (!mailTransporter) {
    logger.info(
      `[Email Service Simulation] Certificate email prepared for ${to} (Cert: ${safeId}, Attachments: ${attachments.length}). Operating in mock/test mode.`
    );
    return true;
  }

  try {
    const fromAddress = process.env.EMAIL_FROM || `"LearnSpace Academy" <${process.env.EMAIL_USER}>`;
    await mailTransporter.sendMail({
      from: fromAddress,
      to,
      subject,
      text,
      html,
      attachments,
    });
    logger.success(`Certificate email successfully delivered to ${to} for credential ${safeId}`);
    return true;
  } catch (error) {
    logger.warn(`Failed to dispatch certificate email to ${to}: ${error.message}`);
    throw error;
  }
};

module.exports = {
  sendPasswordResetEmail,
  sendVerificationEmail,
  sendInstructorApprovalEmail,
  sendAssignmentDeadlineReminderEmail,
  sendQuizDeadlineReminderEmail,
  sendMfaEmailOtp,
  sendPaymentReceiptEmail,
  sendInstructorEnrollmentNotificationEmail,
  sendCertificateEmail,
  setTransporter,
};
