const mongoose = require('mongoose');
const Quiz = require('../models/Quiz');
const QuizAttempt = require('../models/QuizAttempt');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const { logger } = require('../utils/logger');

/**
 * Helper to verify that instructor owns the course
 */
const verifyInstructorCourse = async (courseId, userId, userRole) => {
  if (!mongoose.Types.ObjectId.isValid(courseId)) {
    return { error: 'Invalid course ID format.', status: 400 };
  }

  const course = await Course.findById(courseId);
  if (!course) {
    return { error: 'Course not found.', status: 404 };
  }

  if (course.instructor.toString() !== userId && userRole !== 'admin') {
    return { error: 'Forbidden: You do not own this course.', status: 403 };
  }

  return { course };
};

/**
 * Helper to verify that instructor owns the quiz
 */
const verifyInstructorQuiz = async (quizId, userId, userRole) => {
  if (!mongoose.Types.ObjectId.isValid(quizId)) {
    return { error: 'Invalid quiz ID format.', status: 400 };
  }

  const quiz = await Quiz.findById(quizId);
  if (!quiz) {
    return { error: 'Quiz not found.', status: 404 };
  }

  if (quiz.instructor.toString() !== userId && userRole !== 'admin') {
    return { error: 'Forbidden: You do not have permission to manage this quiz.', status: 403 };
  }

  return { quiz };
};

// ==========================================
// INSTRUCTOR QUIZ CONTROLLER METHODS
// ==========================================

/**
 * Create a new quiz for a course
 * POST /api/instructor/courses/:courseId/quizzes
 */
const createQuiz = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { course, error, status } = await verifyInstructorCourse(
      courseId,
      req.user.id,
      req.user.role
    );
    if (error) return res.status(status).json({ error });

    const {
      title,
      description,
      instructions,
      durationMinutes,
      passingPercentage,
      maxAttempts,
      isRequiredForCompletion,
      sectionId,
      questions,
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Quiz title is required.' });
    }

    const newQuiz = await Quiz.create({
      course: course._id,
      instructor: req.user.id,
      sectionId: sectionId && mongoose.Types.ObjectId.isValid(sectionId) ? sectionId : null,
      title: title.trim(),
      description: description ? description.trim() : '',
      instructions: instructions ? instructions.trim() : 'Select the best answer for each question.',
      durationMinutes: typeof durationMinutes === 'number' ? Math.max(0, durationMinutes) : 0,
      passingPercentage: typeof passingPercentage === 'number' ? Math.min(100, Math.max(1, passingPercentage)) : 70,
      maxAttempts: typeof maxAttempts === 'number' ? Math.max(0, maxAttempts) : 3,
      isRequiredForCompletion: isRequiredForCompletion !== false,
      status: 'draft',
      questions: Array.isArray(questions) ? questions : [],
    });

    logger.success(`Quiz created: "${newQuiz.title}" for course "${course.title}" by ${req.user.email}`);

    return res.status(201).json({
      message: 'Quiz created successfully as draft.',
      quiz: newQuiz,
    });
  } catch (error) {
    logger.error(`Create quiz error: ${error.message}`);
    return res.status(500).json({ error: 'Failed to create quiz.' });
  }
};

/**
 * Get all quizzes for an instructor's course
 * GET /api/instructor/courses/:courseId/quizzes
 */
const getInstructorCourseQuizzes = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { course, error, status } = await verifyInstructorCourse(
      courseId,
      req.user.id,
      req.user.role
    );
    if (error) return res.status(status).json({ error });

    const quizzes = await Quiz.find({ course: course._id }).sort({ createdAt: -1 });

    // Aggregate attempts count for each quiz
    const quizStats = await Promise.all(
      quizzes.map(async (q) => {
        const totalAttempts = await QuizAttempt.countDocuments({ quiz: q._id });
        const passedAttempts = await QuizAttempt.countDocuments({ quiz: q._id, passed: true });
        return {
          ...q.toObject(),
          totalAttempts,
          passRate: totalAttempts > 0 ? Math.round((passedAttempts / totalAttempts) * 100) : 0,
        };
      })
    );

    return res.status(200).json({
      quizzes: quizStats,
      count: quizzes.length,
    });
  } catch (error) {
    logger.error(`Get instructor course quizzes error: ${error.message}`);
    return res.status(500).json({ error: 'Failed to retrieve course quizzes.' });
  }
};

/**
 * Get single quiz with full questions and answer keys for instructor
 * GET /api/instructor/quizzes/:quizId
 */
const getInstructorQuizById = async (req, res) => {
  try {
    const { quiz, error, status } = await verifyInstructorQuiz(
      req.params.quizId,
      req.user.id,
      req.user.role
    );
    if (error) return res.status(status).json({ error });

    return res.status(200).json({ quiz });
  } catch (error) {
    logger.error(`Get instructor quiz by id error: ${error.message}`);
    return res.status(500).json({ error: 'Failed to retrieve quiz.' });
  }
};

/**
 * Update quiz metadata, questions, and passing criteria
 * PATCH /api/instructor/quizzes/:quizId
 */
const updateQuiz = async (req, res) => {
  try {
    const { quiz, error, status } = await verifyInstructorQuiz(
      req.params.quizId,
      req.user.id,
      req.user.role
    );
    if (error) return res.status(status).json({ error });

    const {
      title,
      description,
      instructions,
      durationMinutes,
      passingPercentage,
      maxAttempts,
      isRequiredForCompletion,
      sectionId,
      questions,
    } = req.body;

    if (title !== undefined) quiz.title = title.trim();
    if (description !== undefined) quiz.description = description.trim();
    if (instructions !== undefined) quiz.instructions = instructions.trim();
    if (durationMinutes !== undefined) quiz.durationMinutes = Math.max(0, durationMinutes);
    if (passingPercentage !== undefined) quiz.passingPercentage = Math.min(100, Math.max(1, passingPercentage));
    if (maxAttempts !== undefined) quiz.maxAttempts = Math.max(0, maxAttempts);
    if (isRequiredForCompletion !== undefined) quiz.isRequiredForCompletion = Boolean(isRequiredForCompletion);
    if (sectionId !== undefined) {
      quiz.sectionId = sectionId && mongoose.Types.ObjectId.isValid(sectionId) ? sectionId : null;
    }
    if (questions !== undefined && Array.isArray(questions)) {
      quiz.questions = questions;
    }

    await quiz.save();

    logger.info(`Quiz updated: "${quiz.title}" (${quiz._id}) by ${req.user.email}`);

    return res.status(200).json({
      message: 'Quiz updated successfully.',
      quiz,
    });
  } catch (error) {
    logger.error(`Update quiz error: ${error.message}`);
    return res.status(400).json({ error: error.message || 'Failed to update quiz.' });
  }
};

/**
 * Publish quiz after validating all questions and answer keys
 * PATCH /api/instructor/quizzes/:quizId/publish
 */
const publishQuiz = async (req, res) => {
  try {
    const { quiz, error, status } = await verifyInstructorQuiz(
      req.params.quizId,
      req.user.id,
      req.user.role
    );
    if (error) return res.status(status).json({ error });

    if (!quiz.questions || quiz.questions.length === 0) {
      return res.status(400).json({
        error: 'Cannot publish quiz: At least one question is required.',
      });
    }

    // Validate every question
    for (const q of quiz.questions) {
      if (!q.options || q.options.length < 2) {
        return res.status(400).json({
          error: `Question "${q.questionText}" must contain at least 2 options.`,
        });
      }
      const validIds = q.options.map((o) => o.id);
      if (!validIds.includes(q.correctOptionId)) {
        return res.status(400).json({
          error: `Question "${q.questionText}" has an invalid correct option ID.`,
        });
      }
    }

    quiz.status = 'published';
    await quiz.save();

    logger.success(`Quiz published: "${quiz.title}" (${quiz._id})`);

    return res.status(200).json({
      message: 'Quiz published successfully. Students can now attempt this quiz.',
      quiz,
    });
  } catch (error) {
    logger.error(`Publish quiz error: ${error.message}`);
    return res.status(500).json({ error: 'Failed to publish quiz.' });
  }
};

/**
 * Revert quiz to draft
 * PATCH /api/instructor/quizzes/:quizId/unpublish
 */
const unpublishQuiz = async (req, res) => {
  try {
    const { quiz, error, status } = await verifyInstructorQuiz(
      req.params.quizId,
      req.user.id,
      req.user.role
    );
    if (error) return res.status(status).json({ error });

    quiz.status = 'draft';
    await quiz.save();

    return res.status(200).json({
      message: 'Quiz reverted to draft.',
      quiz,
    });
  } catch (error) {
    logger.error(`Unpublish quiz error: ${error.message}`);
    return res.status(500).json({ error: 'Failed to unpublish quiz.' });
  }
};

/**
 * Delete or archive a quiz
 * DELETE /api/instructor/quizzes/:quizId
 */
const deleteQuiz = async (req, res) => {
  try {
    const { quiz, error, status } = await verifyInstructorQuiz(
      req.params.quizId,
      req.user.id,
      req.user.role
    );
    if (error) return res.status(status).json({ error });

    const attemptsCount = await QuizAttempt.countDocuments({ quiz: quiz._id });
    if (attemptsCount > 0) {
      quiz.status = 'archived';
      await quiz.save();
      return res.status(200).json({
        message: 'Quiz has existing student attempts and was archived instead of permanently deleted.',
        action: 'archived',
        quiz,
      });
    }

    await quiz.deleteOne();
    return res.status(200).json({
      message: 'Quiz permanently deleted.',
      action: 'deleted',
    });
  } catch (error) {
    logger.error(`Delete quiz error: ${error.message}`);
    return res.status(500).json({ error: 'Failed to delete quiz.' });
  }
};

/**
 * Get aggregate quiz performance analytics for instructor
 * GET /api/instructor/quizzes/:quizId/analytics
 */
const getQuizAnalytics = async (req, res) => {
  try {
    const { quiz, error, status } = await verifyInstructorQuiz(
      req.params.quizId,
      req.user.id,
      req.user.role
    );
    if (error) return res.status(status).json({ error });

    const attempts = await QuizAttempt.find({ quiz: quiz._id, status: 'completed' })
      .populate('student', 'name email avatar')
      .sort({ createdAt: -1 });

    const totalCompleted = attempts.length;
    const passedCount = attempts.filter((a) => a.passed).length;
    const avgScore =
      totalCompleted > 0
        ? Math.round(attempts.reduce((sum, a) => sum + (a.percentage || 0), 0) / totalCompleted)
        : 0;

    return res.status(200).json({
      quiz: {
        id: quiz._id,
        title: quiz.title,
        passingPercentage: quiz.passingPercentage,
        totalPoints: quiz.totalPoints,
        questionCount: quiz.questions.length,
      },
      stats: {
        totalCompleted,
        passedCount,
        passRate: totalCompleted > 0 ? Math.round((passedCount / totalCompleted) * 100) : 0,
        averagePercentage: avgScore,
      },
      recentAttempts: attempts.slice(0, 20).map((a) => ({
        id: a._id,
        studentName: a.student?.name || 'Student',
        studentEmail: a.student?.email || '',
        score: a.score,
        maxScore: a.maxScore,
        percentage: a.percentage,
        passed: a.passed,
        submittedAt: a.submittedAt,
        attemptNumber: a.attemptNumber,
      })),
    });
  } catch (error) {
    logger.error(`Get quiz analytics error: ${error.message}`);
    return res.status(500).json({ error: 'Failed to retrieve analytics.' });
  }
};

// ==========================================
// STUDENT QUIZ CONTROLLER METHODS
// ==========================================

/**
 * Helper to resolve course and check active student enrollment
 */
const resolveEnrolledCourse = async (courseIdOrSlug, userId, userRole) => {
  if (!courseIdOrSlug) {
    return { error: 'Course identifier is required.', status: 400 };
  }

  let query;
  if (mongoose.Types.ObjectId.isValid(courseIdOrSlug)) {
    query = { _id: courseIdOrSlug };
  } else {
    query = { slug: courseIdOrSlug.toLowerCase() };
  }

  const course = await Course.findOne(query);
  if (!course) {
    return { error: 'Course not found.', status: 404 };
  }

  const isOwner = course.instructor.toString() === userId;
  const isAdmin = userRole === 'admin';

  if (!isOwner && !isAdmin) {
    const enrollment = await Enrollment.findOne({
      student: userId,
      course: course._id,
      status: { $in: ['active', 'completed'] },
    });

    if (!enrollment) {
      return {
        error: 'Access denied: You must be actively enrolled in this course to access quizzes.',
        status: 403,
      };
    }

    return { course, enrollment };
  }

  return { course, hasAdminPrivilege: true };
};

/**
 * Get all published quizzes for an enrolled course
 * GET /api/courses/:courseIdOrSlug/quizzes
 */
const getCourseQuizzes = async (req, res) => {
  try {
    const courseIdOrSlug = req.params.idOrSlug || req.params.courseIdOrSlug || req.params.courseId;
    const { course, error, status } = await resolveEnrolledCourse(
      courseIdOrSlug,
      req.user.id,
      req.user.role
    );
    if (error) return res.status(status).json({ error });

    const quizzes = await Quiz.find({
      course: course._id,
      status: 'published',
    }).sort({ createdAt: 1 });

    // Attach student attempt information
    const studentQuizzes = await Promise.all(
      quizzes.map(async (q) => {
        const attempts = await QuizAttempt.find({
          quiz: q._id,
          student: req.user.id,
        }).sort({ attemptNumber: -1 });

        const bestAttempt = attempts.reduce(
          (best, cur) => (cur.percentage > (best ? best.percentage : -1) ? cur : best),
          null
        );

        const hasPassed = attempts.some((a) => a.passed);
        const inProgress = attempts.find((a) => a.status === 'in_progress');

        return {
          _id: q._id.toString(),
          title: q.title,
          description: q.description,
          instructions: q.instructions,
          durationMinutes: q.durationMinutes,
          passingPercentage: q.passingPercentage,
          maxAttempts: q.maxAttempts,
          isRequiredForCompletion: q.isRequiredForCompletion,
          totalQuestions: (q.questions || []).length,
          totalPoints: q.totalPoints,
          attemptsCount: attempts.length,
          attemptsRemaining:
            q.maxAttempts > 0 ? Math.max(0, q.maxAttempts - attempts.length) : null,
          hasPassed,
          bestScore: bestAttempt ? bestAttempt.score : null,
          bestPercentage: bestAttempt ? bestAttempt.percentage : null,
          activeAttemptId: inProgress ? inProgress._id.toString() : null,
        };
      })
    );

    return res.status(200).json({
      quizzes: studentQuizzes,
      count: studentQuizzes.length,
    });
  } catch (error) {
    logger.error(`Get course quizzes error: ${error.message}`);
    return res.status(500).json({ error: 'Failed to retrieve course quizzes.' });
  }
};

/**
 * Retrieve quiz details for taking the test
 * CRITICAL SECURITY RULE: Statically strips correctOptionId and explanation!
 * GET /api/courses/:courseIdOrSlug/quizzes/:quizId
 */
const getQuizForAttempt = async (req, res) => {
  try {
    const courseIdOrSlug = req.params.idOrSlug || req.params.courseIdOrSlug || req.params.courseId;
    const { quizId } = req.params;
    const { course, error, status } = await resolveEnrolledCourse(
      courseIdOrSlug,
      req.user.id,
      req.user.role
    );
    if (error) return res.status(status).json({ error });

    if (!mongoose.Types.ObjectId.isValid(quizId)) {
      return res.status(400).json({ error: 'Invalid quiz ID format.' });
    }

    const quiz = await Quiz.findOne({
      _id: quizId,
      course: course._id,
      status: 'published',
    });

    if (!quiz) {
      return res.status(404).json({ error: 'Published quiz not found.' });
    }

    const previousAttempts = await QuizAttempt.find({
      quiz: quiz._id,
      student: req.user.id,
    }).sort({ attemptNumber: -1 });

    const attemptsCount = previousAttempts.length;
    const attemptsRemaining =
      quiz.maxAttempts > 0 ? Math.max(0, quiz.maxAttempts - attemptsCount) : null;
    const hasPassed = previousAttempts.some((a) => a.passed);

    // Sanitize questions: NEVER leak correctOptionId or explanation to students!
    const sanitizedQuestions = (quiz.questions || []).map((q) => ({
      _id: q._id.toString(),
      questionText: q.questionText,
      points: q.points,
      order: q.order,
      options: (q.options || []).map((opt) => ({
        id: opt.id,
        text: opt.text,
      })),
    }));

    return res.status(200).json({
      quiz: {
        _id: quiz._id.toString(),
        title: quiz.title,
        description: quiz.description,
        instructions: quiz.instructions,
        durationMinutes: quiz.durationMinutes,
        passingPercentage: quiz.passingPercentage,
        maxAttempts: quiz.maxAttempts,
        isRequiredForCompletion: quiz.isRequiredForCompletion,
        totalPoints: quiz.totalPoints,
        questions: sanitizedQuestions,
        attemptsCount,
        attemptsRemaining,
        hasPassed,
      },
    });
  } catch (error) {
    logger.error(`Get quiz for attempt error: ${error.message}`);
    return res.status(500).json({ error: 'Failed to retrieve quiz details.' });
  }
};

/**
 * Start a new quiz attempt
 * POST /api/courses/:courseIdOrSlug/quizzes/:quizId/start
 */
const startQuizAttempt = async (req, res) => {
  try {
    const courseIdOrSlug = req.params.idOrSlug || req.params.courseIdOrSlug || req.params.courseId;
    const { quizId } = req.params;
    const { course, error, status } = await resolveEnrolledCourse(
      courseIdOrSlug,
      req.user.id,
      req.user.role
    );
    if (error) return res.status(status).json({ error });

    if (!mongoose.Types.ObjectId.isValid(quizId)) {
      return res.status(400).json({ error: 'Invalid quiz ID format.' });
    }

    const quiz = await Quiz.findOne({
      _id: quizId,
      course: course._id,
      status: 'published',
    });

    if (!quiz) {
      return res.status(404).json({ error: 'Published quiz not found.' });
    }

    // Check for existing in-progress attempt
    const activeAttempt = await QuizAttempt.findOne({
      quiz: quiz._id,
      student: req.user.id,
      status: 'in_progress',
    });

    if (activeAttempt) {
      // Check if deadline passed
      if (activeAttempt.deadline && new Date() > activeAttempt.deadline) {
        activeAttempt.status = 'timed_out';
        await activeAttempt.save();
      } else {
        // Return existing active attempt
        return res.status(200).json({
          message: 'Resuming your active quiz attempt.',
          attempt: {
            id: activeAttempt._id.toString(),
            attemptNumber: activeAttempt.attemptNumber,
            startedAt: activeAttempt.startedAt,
            deadline: activeAttempt.deadline,
            durationMinutes: quiz.durationMinutes,
          },
        });
      }
    }

    // Verify attempt limit
    const totalAttempts = await QuizAttempt.countDocuments({
      quiz: quiz._id,
      student: req.user.id,
    });

    if (quiz.maxAttempts > 0 && totalAttempts >= quiz.maxAttempts) {
      return res.status(400).json({
        error: `Maximum attempts reached (${quiz.maxAttempts}). You cannot retake this quiz.`,
      });
    }

    const attemptNumber = totalAttempts + 1;
    const startedAt = new Date();
    const deadline =
      quiz.durationMinutes > 0
        ? new Date(startedAt.getTime() + quiz.durationMinutes * 60 * 1000)
        : null;

    // Snapshot questions and answer keys at start of attempt
    const quizSnapshot = {
      title: quiz.title,
      passingPercentage: quiz.passingPercentage,
      questions: quiz.questions.map((q) => ({
        questionId: q._id.toString(),
        questionText: q.questionText,
        options: q.options.map((opt) => ({ id: opt.id, text: opt.text })),
        correctOptionId: q.correctOptionId,
        points: q.points || 1,
        explanation: q.explanation || '',
      })),
    };

    const newAttempt = await QuizAttempt.create({
      quiz: quiz._id,
      student: req.user.id,
      course: course._id,
      attemptNumber,
      startedAt,
      deadline,
      status: 'in_progress',
      answers: [],
      score: 0,
      maxScore: quiz.totalPoints,
      percentage: 0,
      passed: false,
      quizSnapshot,
    });

    logger.info(
      `Quiz attempt #${attemptNumber} started by ${req.user.email} for quiz: "${quiz.title}"`
    );

    return res.status(201).json({
      message: 'Quiz attempt started successfully.',
      attempt: {
        id: newAttempt._id.toString(),
        attemptNumber,
        startedAt,
        deadline,
        durationMinutes: quiz.durationMinutes,
      },
    });
  } catch (error) {
    logger.error(`Start quiz attempt error: ${error.message}`);
    return res.status(500).json({ error: 'Failed to start quiz attempt.' });
  }
};

/**
 * Submit quiz answers and grade server-side
 * POST /api/courses/:courseIdOrSlug/quizzes/:quizId/attempts/:attemptId/submit
 */
const submitQuizAttempt = async (req, res) => {
  try {
    const { courseIdOrSlug, quizId, attemptId } = req.params;
    const { answers } = req.body; // Array of { questionId, selectedOptionId }

    if (!mongoose.Types.ObjectId.isValid(attemptId)) {
      return res.status(400).json({ error: 'Invalid attempt ID format.' });
    }

    const attempt = await QuizAttempt.findOne({
      _id: attemptId,
      quiz: quizId,
      student: req.user.id,
    });

    if (!attempt) {
      return res.status(404).json({ error: 'Quiz attempt not found.' });
    }

    if (attempt.status === 'completed') {
      return res.status(400).json({
        error: 'This attempt has already been submitted and graded.',
      });
    }

    const now = new Date();

    // Check if timed out
    if (attempt.deadline && now > new Date(attempt.deadline.getTime() + 15000)) {
      // 15s grace period for network latency
      attempt.status = 'timed_out';
      attempt.submittedAt = now;
      await attempt.save();
      return res.status(400).json({
        error: 'Attempt expired: The time limit for this quiz has elapsed.',
      });
    }

    const questionsSnapshot = attempt.quizSnapshot?.questions || [];
    if (questionsSnapshot.length === 0) {
      return res.status(400).json({ error: 'Malformed quiz attempt snapshot.' });
    }

    // Build lookup map for user submitted answers
    const submittedMap = new Map();
    if (Array.isArray(answers)) {
      answers.forEach((ans) => {
        if (ans && ans.questionId) {
          submittedMap.set(ans.questionId.toString(), ans.selectedOptionId || '');
        }
      });
    }

    let earnedScore = 0;
    let maxScore = 0;
    const gradedAnswers = [];

    for (const q of questionsSnapshot) {
      const qId = q.questionId.toString();
      const points = q.points || 1;
      maxScore += points;

      const selectedOptionId = submittedMap.get(qId) || '';
      const isCorrect = selectedOptionId === q.correctOptionId;
      const pointsEarned = isCorrect ? points : 0;
      earnedScore += pointsEarned;

      gradedAnswers.push({
        questionId: qId,
        selectedOptionId,
        isCorrect,
        pointsEarned,
      });
    }

    const percentage = maxScore > 0 ? Math.round((earnedScore / maxScore) * 100) : 0;
    const passingPercentage = attempt.quizSnapshot?.passingPercentage || 70;
    const passed = percentage >= passingPercentage;

    attempt.answers = gradedAnswers;
    attempt.score = earnedScore;
    attempt.maxScore = maxScore;
    attempt.percentage = percentage;
    attempt.passed = passed;
    attempt.status = 'completed';
    attempt.submittedAt = now;

    await attempt.save();

    logger.success(
      `Quiz attempt #${attempt.attemptNumber} graded for ${req.user.email}: ${earnedScore}/${maxScore} (${percentage}%) - ${passed ? 'PASSED' : 'FAILED'}`
    );

    // Return detailed result with answers and explanations
    const detailedReview = questionsSnapshot.map((q) => {
      const studentAns = gradedAnswers.find((a) => a.questionId === q.questionId.toString());
      return {
        questionId: q.questionId,
        questionText: q.questionText,
        options: q.options,
        selectedOptionId: studentAns ? studentAns.selectedOptionId : '',
        correctOptionId: q.correctOptionId,
        isCorrect: studentAns ? studentAns.isCorrect : false,
        pointsEarned: studentAns ? studentAns.pointsEarned : 0,
        pointsPossible: q.points,
        explanation: q.explanation || '',
      };
    });

    return res.status(200).json({
      message: passed
        ? 'Congratulations! You passed the quiz.'
        : 'Quiz submitted. You did not reach the passing score this time.',
      result: {
        id: attempt._id.toString(),
        attemptNumber: attempt.attemptNumber,
        score: earnedScore,
        maxScore,
        percentage,
        passingPercentage,
        passed,
        submittedAt: now,
        review: detailedReview,
      },
    });
  } catch (error) {
    logger.error(`Submit quiz attempt error: ${error.message}`);
    return res.status(500).json({ error: 'Failed to submit quiz attempt.' });
  }
};

/**
 * Get student's previous attempts for a specific quiz
 * GET /api/courses/:courseIdOrSlug/quizzes/:quizId/attempts
 */
const getStudentQuizAttempts = async (req, res) => {
  try {
    const { quizId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(quizId)) {
      return res.status(400).json({ error: 'Invalid quiz ID format.' });
    }

    const attempts = await QuizAttempt.find({
      quiz: quizId,
      student: req.user.id,
      status: 'completed',
    }).sort({ attemptNumber: -1 });

    return res.status(200).json({
      attempts: attempts.map((a) => ({
        id: a._id.toString(),
        attemptNumber: a.attemptNumber,
        score: a.score,
        maxScore: a.maxScore,
        percentage: a.percentage,
        passed: a.passed,
        submittedAt: a.submittedAt,
        startedAt: a.startedAt,
      })),
    });
  } catch (error) {
    logger.error(`Get student quiz attempts error: ${error.message}`);
    return res.status(500).json({ error: 'Failed to retrieve attempt history.' });
  }
};

/**
 * Retrieve specific completed attempt result review
 * GET /api/student/quiz-attempts/:attemptId
 */
const getQuizAttemptResult = async (req, res) => {
  try {
    const { attemptId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(attemptId)) {
      return res.status(400).json({ error: 'Invalid attempt ID format.' });
    }

    const attempt = await QuizAttempt.findOne({
      _id: attemptId,
      student: req.user.id,
      status: 'completed',
    }).populate('quiz', 'title description passingPercentage');

    if (!attempt) {
      return res.status(404).json({ error: 'Completed quiz attempt not found.' });
    }

    const questionsSnapshot = attempt.quizSnapshot?.questions || [];
    const detailedReview = questionsSnapshot.map((q) => {
      const studentAns = (attempt.answers || []).find(
        (a) => a.questionId === q.questionId.toString()
      );
      return {
        questionId: q.questionId,
        questionText: q.questionText,
        options: q.options,
        selectedOptionId: studentAns ? studentAns.selectedOptionId : '',
        correctOptionId: q.correctOptionId,
        isCorrect: studentAns ? studentAns.isCorrect : false,
        pointsEarned: studentAns ? studentAns.pointsEarned : 0,
        pointsPossible: q.points,
        explanation: q.explanation || '',
      };
    });

    return res.status(200).json({
      attempt: {
        id: attempt._id.toString(),
        quizTitle: attempt.quizSnapshot?.title || attempt.quiz?.title || 'Quiz',
        attemptNumber: attempt.attemptNumber,
        score: attempt.score,
        maxScore: attempt.maxScore,
        percentage: attempt.percentage,
        passingPercentage: attempt.quizSnapshot?.passingPercentage || 70,
        passed: attempt.passed,
        startedAt: attempt.startedAt,
        submittedAt: attempt.submittedAt,
        review: detailedReview,
      },
    });
  } catch (error) {
    logger.error(`Get quiz attempt result error: ${error.message}`);
    return res.status(500).json({ error: 'Failed to retrieve attempt review.' });
  }
};

module.exports = {
  createQuiz,
  getInstructorCourseQuizzes,
  getInstructorQuizById,
  updateQuiz,
  publishQuiz,
  unpublishQuiz,
  deleteQuiz,
  getQuizAnalytics,
  getCourseQuizzes,
  getQuizForAttempt,
  startQuizAttempt,
  submitQuizAttempt,
  getStudentQuizAttempts,
  getQuizAttemptResult,
};
