const nodemailer = require('nodemailer');
const { logger } = require('../utils/logger');

let transporter = null;

/**
 * Get or initialize nodemailer transporter
 */
const getTransporter = () => {
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

  const resolvedLoginUrl = loginUrl || `${process.env.CLIENT_URL || 'http://localhost:5173'}/login`;
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

module.exports = {
  sendPasswordResetEmail,
  sendVerificationEmail,
  sendInstructorApprovalEmail,
};
