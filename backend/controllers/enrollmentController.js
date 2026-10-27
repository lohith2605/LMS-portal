const mongoose = require('mongoose');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const { logger } = require('../utils/logger');

/**
 * Enroll student in a published course
 * POST /api/courses/:courseId/enroll
 */
const enrollInCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const studentId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({ error: 'Invalid course ID format.' });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ error: 'Course not found.' });
    }

    if (course.status !== 'published') {
      return res.status(400).json({
        error: 'Enrollment is only permitted for published courses.',
      });
    }

    // Check if user is the instructor of this course
    if (course.instructor.toString() === studentId) {
      return res.status(400).json({
        error: 'Instructors cannot enroll in their own courses.',
      });
    }

    // Check for existing enrollment (safe idempotent handling)
    let enrollment = await Enrollment.findOne({
      student: studentId,
      course: course._id,
    });

    if (enrollment) {
      if (enrollment.status === 'active') {
        return res.status(200).json({
          message: 'You are already enrolled in this course.',
          enrollment: {
            id: enrollment._id.toString(),
            courseId: course._id.toString(),
            enrolledAt: enrollment.enrolledAt,
            status: enrollment.status,
            completedLessons: enrollment.completedLessons.map((id) => id.toString()),
          },
        });
      } else {
        // Re-activate if dropped
        enrollment.status = 'active';
        enrollment.enrolledAt = new Date();
        await enrollment.save();

        return res.status(200).json({
          message: 'Your enrollment has been reactivated.',
          enrollment: {
            id: enrollment._id.toString(),
            courseId: course._id.toString(),
            enrolledAt: enrollment.enrolledAt,
            status: enrollment.status,
            completedLessons: enrollment.completedLessons.map((id) => id.toString()),
          },
        });
      }
    }

    // Create new enrollment
    enrollment = await Enrollment.create({
      student: studentId,
      course: course._id,
      enrolledAt: new Date(),
      status: 'active',
      completedLessons: [],
      lastAccessedAt: new Date(),
    });

    logger.success(`Student ${req.user.email} enrolled in course: ${course.title} (${course._id})`);

    return res.status(201).json({
      message: 'Enrollment successful! Welcome to the course.',
      enrollment: {
        id: enrollment._id.toString(),
        courseId: course._id.toString(),
        enrolledAt: enrollment.enrolledAt,
        status: enrollment.status,
        completedLessons: [],
      },
    });
  } catch (error) {
    // Handle unique constraint conflict gracefully
    if (error.code === 11000) {
      const existing = await Enrollment.findOne({
        student: req.user.id,
        course: req.params.courseId,
      });
      return res.status(200).json({
        message: 'You are already enrolled in this course.',
        enrollment: existing,
      });
    }

    logger.error(`Enroll in course error: ${error.message}`);
    return res.status(500).json({
      error: 'Failed to process course enrollment.',
    });
  }
};

/**
 * Get active student enrollments for dashboard and learning workspace
 * GET /api/student/enrollments
 */
const getStudentEnrollments = async (req, res) => {
  try {
    const studentId = req.user.id;

    const rawEnrollments = await Enrollment.find({
      student: studentId,
      status: 'active',
    })
      .populate({
        path: 'course',
        select:
          'title slug summary thumbnail category level estimatedDuration instructor sections status',
        populate: {
          path: 'instructor',
          select: 'name email avatar',
        },
      })
      .sort({ lastAccessedAt: -1, enrolledAt: -1 })
      .lean();

    // Filter out deleted/orphaned courses and calculate progress
    const enrollments = rawEnrollments
      .filter((e) => e.course && e.course.status !== 'archived')
      .map((e) => {
        const c = e.course;
        const validLessonIds = new Set(
          (c.sections || []).flatMap((s) => (s.lessons || []).map((l) => l._id.toString()))
        );
        const totalLessons = validLessonIds.size;
        const validCompletedLessons = (e.completedLessons || []).filter((id) =>
          validLessonIds.has(id.toString())
        );
        const completedCount = validCompletedLessons.length;
        const progressPercentage =
          totalLessons > 0 ? Math.min(100, Math.round((completedCount / totalLessons) * 100)) : 0;

        return {
          id: e._id.toString(),
          enrolledAt: e.enrolledAt,
          status: e.status,
          completedLessons: (e.completedLessons || []).map((id) => id.toString()),
          lastAccessedLesson: e.lastAccessedLesson ? e.lastAccessedLesson.toString() : null,
          lastAccessedAt: e.lastAccessedAt,
          progressPercentage,
          totalLessons,
          completedCount,
          course: {
            _id: c._id.toString(),
            title: c.title,
            slug: c.slug,
            summary: c.summary,
            thumbnail: c.thumbnail,
            category: c.category,
            level: c.level,
            estimatedDuration: c.estimatedDuration,
            instructor: c.instructor
              ? {
                  id: c.instructor._id.toString(),
                  name: c.instructor.name,
                  avatar: c.instructor.avatar || '',
                }
              : { id: '', name: 'Instructor' },
          },
        };
      });

    return res.status(200).json({
      enrollments,
      count: enrollments.length,
    });
  } catch (error) {
    logger.error(`Get student enrollments error: ${error.message}`);
    return res.status(500).json({
      error: 'Failed to retrieve enrollments.',
    });
  }
};

/**
 * Get specific course enrollment details for student
 * GET /api/student/courses/:courseId
 */
const getStudentCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const studentId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({ error: 'Invalid course ID format.' });
    }

    const enrollment = await Enrollment.findOne({
      student: studentId,
      course: courseId,
      status: 'active',
    })
      .populate({
        path: 'course',
        populate: {
          path: 'instructor',
          select: 'name email avatar bio',
        },
      })
      .lean();

    if (!enrollment || !enrollment.course) {
      return res.status(404).json({
        error: 'You are not enrolled in this course.',
      });
    }

    const c = enrollment.course;
    const validLessonIds = new Set(
      (c.sections || []).flatMap((s) => (s.lessons || []).map((l) => l._id.toString()))
    );
    const totalLessons = validLessonIds.size;
    const validCompletedLessons = (enrollment.completedLessons || []).filter((id) =>
      validLessonIds.has(id.toString())
    );
    const completedCount = validCompletedLessons.length;
    const progressPercentage =
      totalLessons > 0 ? Math.min(100, Math.round((completedCount / totalLessons) * 100)) : 0;

    return res.status(200).json({
      enrollment: {
        id: enrollment._id.toString(),
        enrolledAt: enrollment.enrolledAt,
        status: enrollment.status,
        completedLessons: (enrollment.completedLessons || []).map((id) => id.toString()),
        lastAccessedLesson: enrollment.lastAccessedLesson
          ? enrollment.lastAccessedLesson.toString()
          : null,
        progressPercentage,
        completedCount,
        totalLessons,
      },
      course: c,
    });
  } catch (error) {
    logger.error(`Get student course error: ${error.message}`);
    return res.status(500).json({
      error: 'Failed to retrieve course learning progress.',
    });
  }
};

module.exports = {
  enrollInCourse,
  getStudentEnrollments,
  getStudentCourse,
};
