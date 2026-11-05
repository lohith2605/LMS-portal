const mongoose = require('mongoose');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const Quiz = require('../models/Quiz');
const QuizAttempt = require('../models/QuizAttempt');
const Certificate = require('../models/Certificate');
const User = require('../models/User');
const { logger } = require('../utils/logger');
const notificationService = require('../services/notificationService');
const emailService = require('../services/emailService');
const certificatePdfService = require('../services/certificatePdfService');

/**
 * Helper to resolve course and active enrollment for student
 */
const resolveStudentEnrollment = async (courseIdOrSlug, userId) => {
  if (!courseIdOrSlug) {
    return { error: 'Course identifier is required.', status: 400 };
  }

  let query;
  if (mongoose.Types.ObjectId.isValid(courseIdOrSlug)) {
    query = { _id: courseIdOrSlug };
  } else {
    query = { slug: courseIdOrSlug.toLowerCase() };
  }

  const course = await Course.findOne(query).populate('instructor', 'name');
  if (!course) {
    return { error: 'Course not found.', status: 404 };
  }

  const enrollment = await Enrollment.findOne({
    student: userId,
    course: course._id,
    status: { $in: ['active', 'completed'] },
  });

  if (!enrollment) {
    return {
      error: 'You must be actively enrolled in this course.',
      status: 403,
    };
  }

  return { course, enrollment };
};

/**
 * Asynchronously dispatch certificate email with attached PDF.
 * Ensures idempotency and updates delivery audit fields on the Certificate document.
 *
 * @param {Object} certificateDoc - Mongoose Certificate document or object
 * @param {Object} [courseDoc] - Optional Course document
 * @returns {Promise<boolean>}
 */
const dispatchCertificateEmailAsync = async (certificateDoc, courseDoc) => {
  if (!certificateDoc || certificateDoc.emailSent) {
    return true; // Idempotency protection: do not resend if already sent
  }

  const certificateId = certificateDoc.certificateId;
  const studentEmail = certificateDoc.studentSnapshot?.email;
  const studentName = certificateDoc.studentSnapshot?.name;
  const courseTitle = certificateDoc.courseSnapshot?.title || courseDoc?.title;

  if (!studentEmail) {
    logger.warn(`No student email found on certificate ${certificateId}. Skipping email delivery.`);
    return false;
  }

  // Generate in-memory PDF buffer
  let pdfBuffer = null;
  try {
    pdfBuffer = await certificatePdfService.generateCertificatePdf({
      certificateId,
      studentName,
      courseTitle,
      instructorName: certificateDoc.courseSnapshot?.instructorName,
      completionDate: certificateDoc.completedAt || certificateDoc.issuedAt,
      finalGrade: certificateDoc.finalGrade,
      category: certificateDoc.courseSnapshot?.category,
    });
  } catch (pdfErr) {
    logger.warn(`Failed to generate PDF for certificate ${certificateId}: ${pdfErr.message}`);
  }

  // Update delivery attempt audit tracking
  const currentAttempts = (certificateDoc.emailAttempts || 0) + 1;
  const attemptTimestamp = new Date();

  try {
    await emailService.sendCertificateEmail({
      to: studentEmail,
      studentName,
      courseTitle,
      certificateId,
      completionDate: certificateDoc.completedAt || certificateDoc.issuedAt,
      pdfBuffer,
    });

    // Update certificate document with delivery success
    if (typeof certificateDoc.save === 'function') {
      certificateDoc.emailSent = true;
      certificateDoc.emailStatus = 'sent';
      certificateDoc.emailSentAt = attemptTimestamp;
      certificateDoc.emailAttempts = currentAttempts;
      certificateDoc.lastEmailAttemptAt = attemptTimestamp;
      certificateDoc.emailError = null;
      await certificateDoc.save().catch(() => {});
    } else if (mongoose.connection?.readyState === 1) {
      await Certificate.updateOne(
        { certificateId },
        {
          $set: {
            emailSent: true,
            emailStatus: 'sent',
            emailSentAt: attemptTimestamp,
            emailAttempts: currentAttempts,
            lastEmailAttemptAt: attemptTimestamp,
            emailError: null,
          },
        }
      ).catch(() => {});
    }

    logger.success(`Certificate ${certificateId} email delivered to ${studentEmail}`);
    return true;
  } catch (sendErr) {
    const errorMsg = sendErr.message ? sendErr.message.slice(0, 300) : 'SMTP delivery failed';

    if (typeof certificateDoc.save === 'function') {
      certificateDoc.emailSent = false;
      certificateDoc.emailStatus = 'failed';
      certificateDoc.emailAttempts = currentAttempts;
      certificateDoc.lastEmailAttemptAt = attemptTimestamp;
      certificateDoc.emailError = errorMsg;
      await certificateDoc.save().catch(() => {});
    } else if (mongoose.connection?.readyState === 1) {
      await Certificate.updateOne(
        { certificateId },
        {
          $set: {
            emailSent: false,
            emailStatus: 'failed',
            emailAttempts: currentAttempts,
            lastEmailAttemptAt: attemptTimestamp,
            emailError: errorMsg,
          },
        }
      ).catch(() => {});
    }

    logger.warn(`Certificate ${certificateId} email delivery failed: ${sendErr.message}`);
    return false;
  }
};

/**
 * Shared, idempotent course completion verification and certificate issuance service.
 * Used by:
 * 1. Manual claim API: POST /api/courses/:idOrSlug/claim-certificate
 * 2. Automatic trigger after lesson completion: toggleLessonComplete
 * 3. Automatic trigger after mandatory quiz pass: submitQuizAttempt
 *
 * @param {string} userId - Student ObjectId string
 * @param {string} courseIdOrSlug - Course ID or slug
 * @param {Object} [options]
 * @param {boolean} [options.skipEmail=false] - If true, skips email dispatch (e.g. testing)
 * @returns {Promise<Object>} { success, alreadyIssued, eligible, reason, status, certificate, enrollment, course }
 */
const issueCertificateForStudent = async (userId, courseIdOrSlug, options = {}) => {
  const { course, enrollment, error, status } = await resolveStudentEnrollment(
    courseIdOrSlug,
    userId
  );
  if (error) {
    return { success: false, eligible: false, status, reason: error };
  }

  // Idempotency check: see if certificate already exists
  let existingCertificate = await Certificate.findOne({
    student: userId,
    course: course._id,
  });
  if (!existingCertificate && enrollment.certificateId) {
    existingCertificate = await Certificate.findOne({
      certificateId: enrollment.certificateId,
    });
  }

  if (existingCertificate) {
    // If certificate exists but enrollment wasn't marked completed, ensure sync
    if (!enrollment.isCompleted || !enrollment.certificateIssued) {
      enrollment.isCompleted = true;
      enrollment.completedAt = enrollment.completedAt || existingCertificate.completedAt || new Date();
      enrollment.certificateIssued = true;
      enrollment.certificateId = existingCertificate.certificateId;
      enrollment.status = 'completed';
      await enrollment.save().catch(() => {});
    }

    return {
      success: true,
      alreadyIssued: true,
      eligible: true,
      certificate: existingCertificate,
      course,
      enrollment,
    };
  }

  // 1. Verify all published lessons are completed
  const validLessonIds = new Set(
    (course.sections || []).flatMap((s) =>
      (s.lessons || [])
        .filter((l) => l.isPublished !== false)
        .map((l) => l._id.toString())
    )
  );
  const totalLessons = validLessonIds.size;
  const completedLessonIds = (enrollment.completedLessons || []).filter((id) =>
    validLessonIds.has(id.toString())
  );

  if (totalLessons === 0 || completedLessonIds.length < totalLessons) {
    const reasonMsg = `Incomplete curriculum: You have completed ${completedLessonIds.length}/${totalLessons} lessons. All lessons must be marked complete before claiming a certificate.`;
    return {
      success: false,
      eligible: false,
      status: 400,
      error: reasonMsg,
      reason: reasonMsg,
    };
  }

  // 2. Verify all mandatory published quizzes are passed
  const mandatoryQuizzes = await Quiz.find({
    course: course._id,
    status: 'published',
    isRequiredForCompletion: true,
  });

  for (const quiz of mandatoryQuizzes) {
    const hasPassed = await QuizAttempt.exists({
      quiz: quiz._id,
      student: userId,
      passed: true,
    });

    if (!hasPassed) {
      const reasonMsg = `Assessment required: You must pass "${quiz.title}" with at least ${quiz.passingPercentage}% to earn your certificate.`;
      return {
        success: false,
        eligible: false,
        status: 400,
        error: reasonMsg,
        reason: reasonMsg,
      };
    }
  }

  // 3. Compute final average score across required quizzes
  let finalGrade = 100;
  if (mandatoryQuizzes.length > 0) {
    let totalScoreSum = 0;
    for (const quiz of mandatoryQuizzes) {
      const bestAttempt = await QuizAttempt.findOne({
        quiz: quiz._id,
        student: userId,
        passed: true,
      }).sort({ percentage: -1 });

      totalScoreSum += bestAttempt ? bestAttempt.percentage : 100;
    }
    finalGrade = Math.round(totalScoreSum / mandatoryQuizzes.length);
  }

  // 4. Fetch student info for historical snapshot
  const studentUser = await User.findById(userId);
  const completionTimestamp = new Date();
  const certificateId = Certificate.generateCertificateId();

  let newCertificate;
  try {
    newCertificate = await Certificate.create({
      certificateId,
      student: userId,
      course: course._id,
      enrollment: enrollment._id,
      issuedAt: completionTimestamp,
      completedAt: completionTimestamp,
      studentSnapshot: {
        name: studentUser ? studentUser.name : 'Verified Learner',
        email: studentUser ? studentUser.email : '',
      },
      courseSnapshot: {
        title: course.title,
        slug: course.slug,
        category: course.category || 'General',
        level: course.level || 'All Levels',
        estimatedDuration: course.estimatedDuration || 'Self-paced',
        instructorName: course.instructor?.name || 'LearnSpace Educator',
      },
      finalGrade,
      status: 'valid',
      emailSent: false,
      emailStatus: 'pending',
      emailAttempts: 0,
    });
  } catch (createErr) {
    // Handle race condition: code 11000 duplicate key
    if (createErr.code === 11000) {
      const existing = await Certificate.findOne({ student: userId, course: course._id });
      if (existing) {
        return {
          success: true,
          alreadyIssued: true,
          eligible: true,
          certificate: existing,
          course,
          enrollment,
        };
      }
    }
    throw createErr;
  }

  // 5. Update enrollment state
  enrollment.isCompleted = true;
  enrollment.completedAt = completionTimestamp;
  enrollment.certificateIssued = true;
  enrollment.certificateId = certificateId;
  enrollment.status = 'completed';
  await enrollment.save();

  // 6. In-App Notification (non-blocking)
  try {
    await notificationService.createNotification({
      recipient: userId,
      type: 'certificate_issued',
      title: 'Certificate of Completion Issued!',
      message: `Congratulations! Your certificate for "${course.title}" is ready to view and download.`,
      link: `/verify/${certificateId}`,
      metadata: { certificateId, courseId: course._id },
    });
  } catch (notifErr) {
    logger.warn(`Failed to dispatch certificate notification: ${notifErr.message}`);
  }

  logger.success(
    `Certificate ${certificateId} issued to ${studentUser?.email || userId} for course "${course.title}"`
  );

  // 7. Dispatch Email with PDF Attachment asynchronously (non-blocking)
  if (!options.skipEmail && studentUser?.email) {
    dispatchCertificateEmailAsync(newCertificate, course).catch((emailErr) => {
      logger.warn(`Background certificate email dispatch error: ${emailErr.message}`);
    });
  }

  return {
    success: true,
    alreadyIssued: false,
    eligible: true,
    certificate: newCertificate,
    course,
    enrollment,
  };
};

/**
 * Check course completion criteria for authenticated student
 * GET /api/courses/:courseIdOrSlug/completion-status
 */
const getCourseCompletionStatus = async (req, res) => {
  try {
    const courseIdOrSlug = req.params.idOrSlug || req.params.courseIdOrSlug || req.params.courseId;
    const userId = req.user.id || req.user._id;
    const { course, enrollment, error, status } = await resolveStudentEnrollment(
      courseIdOrSlug,
      userId
    );
    if (error) return res.status(status).json({ error });

    // 1. Audit published lessons
    const validLessonIds = new Set(
      (course.sections || []).flatMap((s) =>
        (s.lessons || [])
          .filter((l) => l.isPublished !== false)
          .map((l) => l._id.toString())
      )
    );
    const totalLessons = validLessonIds.size;
    const completedLessonIds = (enrollment.completedLessons || []).filter((id) =>
      validLessonIds.has(id.toString())
    );
    const lessonsCompleted = completedLessonIds.length;
    const allLessonsCompleted = totalLessons > 0 && lessonsCompleted >= totalLessons;

    // 2. Audit mandatory quizzes
    const mandatoryQuizzes = await Quiz.find({
      course: course._id,
      status: 'published',
      isRequiredForCompletion: true,
    });

    const totalMandatoryQuizzes = mandatoryQuizzes.length;
    let mandatoryQuizzesPassed = 0;
    const quizStatusList = [];

    for (const quiz of mandatoryQuizzes) {
      const passedAttempt = await QuizAttempt.findOne({
        quiz: quiz._id,
        student: userId,
        passed: true,
      }).sort({ percentage: -1 });

      const hasPassed = Boolean(passedAttempt);
      if (hasPassed) mandatoryQuizzesPassed += 1;

      quizStatusList.push({
        quizId: quiz._id.toString(),
        title: quiz.title,
        passingPercentage: quiz.passingPercentage,
        hasPassed,
        bestPercentage: passedAttempt ? passedAttempt.percentage : null,
      });
    }

    const allQuizzesPassed =
      totalMandatoryQuizzes === 0 || mandatoryQuizzesPassed >= totalMandatoryQuizzes;

    const isEligibleForCompletion = allLessonsCompleted && allQuizzesPassed;

    // Check if certificate was already claimed
    let existingCertificate = await Certificate.findOne({
      student: userId,
      course: course._id,
    });
    if (!existingCertificate && enrollment.certificateId) {
      existingCertificate = await Certificate.findOne({
        certificateId: enrollment.certificateId,
      });
    }

    const isCompleted = Boolean(enrollment.isCompleted || existingCertificate);
    const certificateIssued = Boolean(existingCertificate || enrollment.certificateIssued);
    const certificateId = existingCertificate
      ? existingCertificate.certificateId
      : enrollment.certificateId || null;

    return res.status(200).json({
      courseId: course._id.toString(),
      courseTitle: course.title,
      isEligibleForCompletion,
      isEligible: isEligibleForCompletion,
      isCompleted,
      completedAt:
        enrollment.completedAt ||
        (existingCertificate ? existingCertificate.completedAt : null),
      certificateIssued,
      certificateId,
      certificate: existingCertificate || null,
      criteria: {
        allLessonsCompleted,
        lessonsCompleted,
        totalLessons,
        lessonProgressPercentage:
          totalLessons > 0 ? Math.min(100, Math.round((lessonsCompleted / totalLessons) * 100)) : 0,
        allQuizzesPassed,
        mandatoryQuizzesPassed,
        totalMandatoryQuizzes,
        quizzes: quizStatusList,
      },
    });
  } catch (error) {
    logger.error(`Get completion status error: ${error.message}`);
    return res.status(500).json({ error: 'Failed to verify course completion status.' });
  }
};

/**
 * Claim and issue certificate after backend verification
 * POST /api/courses/:courseIdOrSlug/claim-certificate
 */
const claimCertificate = async (req, res) => {
  try {
    const courseIdOrSlug = req.params.idOrSlug || req.params.courseIdOrSlug || req.params.courseId;
    const userId = req.user.id || req.user._id;

    const result = await issueCertificateForStudent(userId, courseIdOrSlug);

    if (!result.success) {
      return res.status(result.status || 400).json({
        error: result.reason || 'You are not eligible for certificate issuance at this time.',
      });
    }

    if (result.alreadyIssued) {
      return res.status(200).json({
        message: 'Your certificate has already been issued.',
        certificate: result.certificate,
      });
    }

    return res.status(201).json({
      message: 'Congratulations! Your certificate of completion has been officially issued.',
      certificate: result.certificate,
    });
  } catch (error) {
    logger.error(`Claim certificate error: ${error.message}`);
    return res.status(500).json({ error: 'Failed to issue completion certificate.' });
  }
};

/**
 * Download official certificate as a PDF document.
 * GET /api/certificates/:certificateId/download
 * Requires authentication (JWT). Only certificate owner or admin can download.
 */
const downloadCertificatePdf = async (req, res) => {
  try {
    const { certificateId } = req.params;
    const userId = req.user?.id || req.user?._id;

    if (!req.user || !userId) {
      return res.status(401).json({ error: 'Authentication required to download certificate.' });
    }

    if (!certificateId || typeof certificateId !== 'string') {
      return res.status(400).json({ error: 'Certificate ID is required.' });
    }

    const certificate = await Certificate.findOne({
      certificateId: certificateId.trim().toUpperCase(),
    });

    if (!certificate || certificate.status !== 'valid') {
      return res.status(404).json({ error: 'Certificate not found or has been revoked.' });
    }

    // Security check: Must be the student who earned the certificate or an admin
    const isOwner = certificate.student?.toString() === userId?.toString();
    const isAdmin = req.user?.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        error: 'Access denied: You are not authorized to download this certificate.',
      });
    }

    // Generate in-memory PDF buffer
    const pdfBuffer = await certificatePdfService.generateCertificatePdf({
      certificateId: certificate.certificateId,
      studentName: certificate.studentSnapshot?.name,
      courseTitle: certificate.courseSnapshot?.title,
      instructorName: certificate.courseSnapshot?.instructorName,
      completionDate: certificate.completedAt || certificate.issuedAt,
      finalGrade: certificate.finalGrade,
      category: certificate.courseSnapshot?.category,
    });

    const filename = `LearnSpace-Certificate-${certificate.certificateId}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.setHeader('Cache-Control', 'private, max-age=3600');

    return res.status(200).send(pdfBuffer);
  } catch (error) {
    logger.error(`Download certificate error: ${error.message}`);
    return res.status(500).json({ error: 'Failed to generate certificate PDF for download.' });
  }
};

/**
 * Retry email delivery for a failed or pending certificate
 * POST /api/certificates/:certificateId/retry-email
 * Requires authentication (owner or admin)
 */
const retryCertificateEmail = async (req, res) => {
  try {
    const { certificateId } = req.params;
    const userId = req.user?.id || req.user?._id;

    if (!req.user || !userId) {
      return res.status(401).json({ error: 'Authentication required to retry certificate email.' });
    }

    const certificate = await Certificate.findOne({
      certificateId: certificateId.trim().toUpperCase(),
    });

    if (!certificate || certificate.status !== 'valid') {
      return res.status(404).json({ error: 'Certificate not found or has been revoked.' });
    }

    const isOwner = certificate.student?.toString() === userId?.toString();
    const isAdmin = req.user?.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    if (certificate.emailSent) {
      return res.status(200).json({
        message: 'Certificate email has already been successfully delivered.',
        emailStatus: 'sent',
        certificate,
      });
    }

    await dispatchCertificateEmailAsync(certificate);

    const updated = await Certificate.findOne({ certificateId: certificate.certificateId });

    return res.status(200).json({
      message: updated.emailSent
        ? 'Certificate email sent successfully.'
        : 'Email delivery attempt failed. Please check mail server configuration.',
      emailStatus: updated.emailStatus,
      certificate: updated,
    });
  } catch (error) {
    logger.error(`Retry certificate email error: ${error.message}`);
    return res.status(500).json({ error: 'Failed to retry certificate email.' });
  }
};

/**
 * List all certificates earned by the authenticated student
 * GET /api/student/certificates
 */
const getStudentCertificates = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const certificates = await Certificate.find({
      student: userId,
      status: 'valid',
    }).sort({ issuedAt: -1 });

    return res.status(200).json({
      certificates,
      count: certificates.length,
    });
  } catch (error) {
    logger.error(`Get student certificates error: ${error.message}`);
    return res.status(500).json({ error: 'Failed to retrieve certificates.' });
  }
};

/**
 * Public certificate verification
 * PUBLIC - GET /api/certificates/:certificateId
 * Never exposes private student email, passwords, internal mongo IDs, or assessment responses!
 */
const verifyCertificate = async (req, res) => {
  try {
    const { certificateId } = req.params;

    if (!certificateId || typeof certificateId !== 'string') {
      return res.status(400).json({ error: 'Certificate ID is required.' });
    }

    const certificate = await Certificate.findOne({
      certificateId: certificateId.trim().toUpperCase(),
    });

    if (!certificate || certificate.status !== 'valid') {
      return res.status(404).json({
        valid: false,
        error: 'Certificate not found or has been revoked.',
      });
    }

    return res.status(200).json({
      valid: true,
      certificate: {
        certificateId: certificate.certificateId,
        studentName: certificate.studentSnapshot?.name || 'Verified Learner',
        courseTitle: certificate.courseSnapshot?.title || 'Course of Study',
        category: certificate.courseSnapshot?.category || 'Specialization',
        level: certificate.courseSnapshot?.level || 'All Levels',
        estimatedDuration: certificate.courseSnapshot?.estimatedDuration || 'Self-paced',
        instructorName: certificate.courseSnapshot?.instructorName || 'LearnSpace Educator',
        finalGrade: certificate.finalGrade,
        issuedAt: certificate.issuedAt,
        completedAt: certificate.completedAt,
      },
    });
  } catch (error) {
    logger.error(`Verify certificate error: ${error.message}`);
    return res.status(500).json({ error: 'Failed to verify certificate.' });
  }
};

/**
 * Lightweight background recovery worker for pending or failed certificate emails.
 * Runs on server initialization to recover from temporary SMTP downtime.
 */
let isRecoveringEmails = false;
const recoverPendingCertificateEmails = async () => {
  if (isRecoveringEmails) return;
  isRecoveringEmails = true;

  try {
    const pendingCertificates = await Certificate.find({
      status: 'valid',
      emailSent: false,
      emailAttempts: { $lt: 3 },
    })
      .limit(20)
      .populate('course', 'title');

    for (const cert of pendingCertificates) {
      await dispatchCertificateEmailAsync(cert, cert.course);
    }
  } catch (err) {
    logger.warn(`Recover pending certificate emails error: ${err.message}`);
  } finally {
    isRecoveringEmails = false;
  }
};

module.exports = {
  getCourseCompletionStatus,
  claimCertificate,
  getStudentCertificates,
  verifyCertificate,
  downloadCertificatePdf,
  retryCertificateEmail,
  issueCertificateForStudent,
  dispatchCertificateEmailAsync,
  recoverPendingCertificateEmails,
};
