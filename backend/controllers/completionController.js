const mongoose = require('mongoose');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const Quiz = require('../models/Quiz');
const QuizAttempt = require('../models/QuizAttempt');
const Certificate = require('../models/Certificate');
const User = require('../models/User');
const { logger } = require('../utils/logger');
const notificationService = require('../services/notificationService');

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
 * Check course completion criteria for authenticated student
 * GET /api/courses/:courseIdOrSlug/completion-status
 */
const getCourseCompletionStatus = async (req, res) => {
  try {
    const courseIdOrSlug = req.params.idOrSlug || req.params.courseIdOrSlug || req.params.courseId;
    const { course, enrollment, error, status } = await resolveStudentEnrollment(
      courseIdOrSlug,
      req.user.id
    );
    if (error) return res.status(status).json({ error });

    // 1. Audit published lessons
    const validLessonIds = new Set(
      (course.sections || []).flatMap((s) => (s.lessons || []).map((l) => l._id.toString()))
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
        student: req.user.id,
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
    const existingCertificate = await Certificate.findOne({
      student: req.user.id,
      course: course._id,
    });

    return res.status(200).json({
      courseId: course._id.toString(),
      courseTitle: course.title,
      isEligibleForCompletion,
      isCompleted: Boolean(enrollment.isCompleted || existingCertificate),
      completedAt: enrollment.completedAt || (existingCertificate ? existingCertificate.completedAt : null),
      certificateIssued: Boolean(existingCertificate),
      certificateId: existingCertificate ? existingCertificate.certificateId : null,
      criteria: {
        allLessonsCompleted,
        lessonsCompleted,
        totalLessons,
        lessonProgressPercentage:
          totalLessons > 0 ? Math.round((lessonsCompleted / totalLessons) * 100) : 0,
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
    const { course, enrollment, error, status } = await resolveStudentEnrollment(
      courseIdOrSlug,
      req.user.id
    );
    if (error) return res.status(status).json({ error });

    // Check if certificate already exists (Idempotent response)
    const existingCertificate = await Certificate.findOne({
      student: req.user.id,
      course: course._id,
    });

    if (existingCertificate) {
      return res.status(200).json({
        message: 'Your certificate has already been issued.',
        certificate: existingCertificate,
      });
    }

    // 1. Verify all lessons are completed
    const validLessonIds = new Set(
      (course.sections || []).flatMap((s) => (s.lessons || []).map((l) => l._id.toString()))
    );
    const totalLessons = validLessonIds.size;
    const completedLessonIds = (enrollment.completedLessons || []).filter((id) =>
      validLessonIds.has(id.toString())
    );

    if (totalLessons === 0 || completedLessonIds.length < totalLessons) {
      return res.status(400).json({
        error: `Incomplete curriculum: You have completed ${completedLessonIds.length}/${totalLessons} lessons. All lessons must be marked complete before claiming a certificate.`,
      });
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
        student: req.user.id,
        passed: true,
      });

      if (!hasPassed) {
        return res.status(400).json({
          error: `Assessment required: You must pass "${quiz.title}" with at least ${quiz.passingPercentage}% to earn your certificate.`,
        });
      }
    }

    // 3. Compute final average score across required quizzes
    let finalGrade = 100;
    if (mandatoryQuizzes.length > 0) {
      let totalScoreSum = 0;
      for (const quiz of mandatoryQuizzes) {
        const bestAttempt = await QuizAttempt.findOne({
          quiz: quiz._id,
          student: req.user.id,
          passed: true,
        }).sort({ percentage: -1 });

        totalScoreSum += bestAttempt ? bestAttempt.percentage : 100;
      }
      finalGrade = Math.round(totalScoreSum / mandatoryQuizzes.length);
    }

    // 4. Fetch student info for historical snapshot
    const studentUser = await User.findById(req.user.id);
    const completionTimestamp = new Date();

    const certificateId = Certificate.generateCertificateId();

    const newCertificate = await Certificate.create({
      certificateId,
      student: req.user.id,
      course: course._id,
      enrollment: enrollment._id,
      issuedAt: completionTimestamp,
      completedAt: completionTimestamp,
      studentSnapshot: {
        name: studentUser ? studentUser.name : req.user.name,
        email: studentUser ? studentUser.email : req.user.email,
      },
      courseSnapshot: {
        title: course.title,
        slug: course.slug,
        category: course.category,
        level: course.level,
        estimatedDuration: course.estimatedDuration,
        instructorName: course.instructor?.name || 'LearnSpace Educator',
      },
      finalGrade,
      status: 'valid',
    });

    // 5. Update enrollment state
    enrollment.isCompleted = true;
    enrollment.completedAt = completionTimestamp;
    enrollment.certificateIssued = true;
    enrollment.certificateId = certificateId;
    enrollment.status = 'completed';
    await enrollment.save();

    // Dispatch in-app notification for earned certificate
    try {
      await notificationService.createNotification({
        recipient: req.user.id,
        type: 'certificate_issued',
        title: 'Certificate of Completion Issued!',
        message: `Congratulations! Your certificate for "${course.title}" is ready to view.`,
        link: `/verify-certificate/${certificateId}`,
        metadata: { certificateId, courseId: course._id },
      });
    } catch (notifErr) {
      logger.warn(`Failed to dispatch certificate notification: ${notifErr.message}`);
    }

    logger.success(
      `Certificate ${certificateId} issued to ${req.user.email} for course "${course.title}"`
    );

    return res.status(201).json({
      message: 'Congratulations! Your certificate of completion has been officially issued.',
      certificate: newCertificate,
    });
  } catch (error) {
    if (error.code === 11000) {
      const existing = await Certificate.findOne({
        student: req.user.id,
        course: req.params.courseIdOrSlug,
      });
      return res.status(200).json({
        message: 'Certificate already issued.',
        certificate: existing,
      });
    }

    logger.error(`Claim certificate error: ${error.message}`);
    return res.status(500).json({ error: 'Failed to issue completion certificate.' });
  }
};

/**
 * List all certificates earned by the authenticated student
 * GET /api/student/certificates
 */
const getStudentCertificates = async (req, res) => {
  try {
    const certificates = await Certificate.find({
      student: req.user.id,
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

module.exports = {
  getCourseCompletionStatus,
  claimCertificate,
  getStudentCertificates,
  verifyCertificate,
};
