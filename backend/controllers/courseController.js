const mongoose = require('mongoose');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const { logger } = require('../utils/logger');

/**
 * Sanitize curriculum for public/unenrolled viewers:
 * Keep section titles, lesson titles, durations, and content types,
 * but strip private video URLs, text contents, and download attachments.
 */
const sanitizeCurriculum = (sections = []) => {
  return sections.map((sec) => ({
    _id: sec._id,
    title: sec.title,
    description: sec.description,
    sortOrder: sec.sortOrder,
    lessons: (sec.lessons || []).map((les) => ({
      _id: les._id,
      title: les.title,
      description: les.description,
      contentType: les.contentType,
      duration: les.duration,
      sortOrder: les.sortOrder,
      isPublished: les.isPublished,
      // Note: videoUrl, textContent, attachmentUrl omitted for public preview
    })),
  }));
};

/**
 * Public & authenticated course discovery
 * GET /api/courses
 */
const getCourses = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 12));
    const skip = (page - 1) * limit;

    const filter = { status: 'published' };

    // Search query on title, summary, or description
    if (req.query.search && typeof req.query.search === 'string') {
      const escaped = req.query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (escaped) {
        filter.$or = [
          { title: { $regex: escaped, $options: 'i' } },
          { summary: { $regex: escaped, $options: 'i' } },
          { description: { $regex: escaped, $options: 'i' } },
        ];
      }
    }

    // Category filter
    if (req.query.category && req.query.category !== 'All') {
      filter.category = req.query.category;
    }

    // Difficulty / Level filter
    if (req.query.level && req.query.level !== 'All') {
      filter.level = req.query.level;
    }

    // Sorting
    let sort = { publishedAt: -1, createdAt: -1 };
    if (req.query.sort === 'title') {
      sort = { title: 1 };
    } else if (req.query.sort === 'newest') {
      sort = { createdAt: -1 };
    }

    const [total, rawCourses] = await Promise.all([
      Course.countDocuments(filter),
      Course.find(filter)
        .populate('instructor', 'name email avatar role')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    // Format and sanitize courses for catalog view
    const courses = rawCourses.map((c) => {
      const totalLessons = (c.sections || []).reduce(
        (sum, s) => sum + (s.lessons ? s.lessons.length : 0),
        0
      );

      return {
        _id: c._id.toString(),
        title: c.title,
        slug: c.slug,
        summary: c.summary,
        description: c.description,
        category: c.category,
        level: c.level,
        thumbnail: c.thumbnail,
        estimatedDuration: c.estimatedDuration,
        language: c.language,
        instructor: c.instructor
          ? {
              id: c.instructor._id.toString(),
              name: c.instructor.name,
              email: c.instructor.email,
              avatar: c.instructor.avatar || '',
            }
          : { id: '', name: 'Instructor' },
        totalLessons,
        learningObjectives: c.learningObjectives || [],
        prerequisites: c.prerequisites || '',
        publishedAt: c.publishedAt,
        createdAt: c.createdAt,
      };
    });

    return res.status(200).json({
      courses,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    logger.error(`Get courses error: ${error.message}`);
    return res.status(500).json({
      error: 'Failed to retrieve course catalog.',
    });
  }
};

/**
 * Course details with preview or full curriculum based on enrollment/role
 * GET /api/courses/:idOrSlug
 */
const getCourseByIdOrSlug = async (req, res) => {
  try {
    const { idOrSlug } = req.params;

    let query;
    if (mongoose.Types.ObjectId.isValid(idOrSlug)) {
      query = { _id: idOrSlug };
    } else {
      query = { slug: idOrSlug.toLowerCase() };
    }

    const course = await Course.findOne(query).populate(
      'instructor',
      'name email avatar role bio'
    );

    if (!course) {
      return res.status(404).json({
        error: 'Course not found.',
      });
    }

    const userId = req.user ? req.user.id : null;
    const userRole = req.user ? req.user.role : null;
    const isOwner = userId && course.instructor && course.instructor._id.toString() === userId;
    const isAdmin = userRole === 'admin';

    // Non-published courses can only be viewed by the instructor owner or an admin
    if (course.status !== 'published' && !isOwner && !isAdmin) {
      return res.status(404).json({
        error: 'Course is not currently available.',
      });
    }

    // Check enrollment status if user is authenticated
    let enrollment = null;
    let isEnrolled = false;

    if (userId) {
      enrollment = await Enrollment.findOne({
        student: userId,
        course: course._id,
        status: 'active',
      }).lean();
      isEnrolled = Boolean(enrollment);
    }

    // Full access granted if student is enrolled, instructor owner, or admin
    const hasFullAccess = isEnrolled || isOwner || isAdmin;

    const sections = hasFullAccess ? course.sections : sanitizeCurriculum(course.sections);

    const totalLessons = (course.sections || []).reduce(
      (acc, s) => acc + (s.lessons ? s.lessons.length : 0),
      0
    );

    const courseData = {
      _id: course._id.toString(),
      title: course.title,
      slug: course.slug,
      summary: course.summary,
      description: course.description,
      category: course.category,
      level: course.level,
      thumbnail: course.thumbnail,
      learningObjectives: course.learningObjectives,
      prerequisites: course.prerequisites,
      intendedAudience: course.intendedAudience,
      estimatedDuration: course.estimatedDuration,
      language: course.language,
      status: course.status,
      instructor: course.instructor
        ? {
            id: course.instructor._id.toString(),
            name: course.instructor.name,
            email: course.instructor.email,
            avatar: course.instructor.avatar || '',
            bio: course.instructor.bio || '',
          }
        : null,
      totalLessons,
      sections,
      publishedAt: course.publishedAt,
      createdAt: course.createdAt,
    };

    return res.status(200).json({
      course: courseData,
      isEnrolled,
      hasFullAccess,
      enrollment: enrollment
        ? {
            id: enrollment._id.toString(),
            enrolledAt: enrollment.enrolledAt,
            completedLessons: (enrollment.completedLessons || []).map((id) => id.toString()),
            lastAccessedLesson: enrollment.lastAccessedLesson
              ? enrollment.lastAccessedLesson.toString()
              : null,
          }
        : null,
    });
  } catch (error) {
    logger.error(`Get course details error: ${error.message}`);
    return res.status(500).json({
      error: 'Failed to retrieve course details.',
    });
  }
};

/**
 * Access protected lesson content
 * GET /api/courses/:idOrSlug/lessons/:lessonId
 */
const getLessonContent = async (req, res) => {
  try {
    const { idOrSlug, lessonId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    let query;
    if (mongoose.Types.ObjectId.isValid(idOrSlug)) {
      query = { _id: idOrSlug };
    } else {
      query = { slug: idOrSlug.toLowerCase() };
    }

    const course = await Course.findOne(query);
    if (!course) {
      return res.status(404).json({ error: 'Course not found.' });
    }

    const isOwner = course.instructor.toString() === userId;
    const isAdmin = userRole === 'admin';

    let enrollment = null;
    if (!isOwner && !isAdmin) {
      enrollment = await Enrollment.findOne({
        student: userId,
        course: course._id,
        status: 'active',
      });

      if (!enrollment) {
        return res.status(403).json({
          error: 'Access denied: You must be enrolled in this course to view lesson content.',
        });
      }
    }

    // Locate the section and lesson
    let targetSection = null;
    let targetLesson = null;

    for (const section of course.sections) {
      const foundLesson = section.lessons.find((l) => l._id.toString() === lessonId);
      if (foundLesson) {
        targetSection = section;
        targetLesson = foundLesson;
        break;
      }
    }

    if (!targetLesson) {
      return res.status(404).json({ error: 'Lesson not found in this course.' });
    }

    // If student, update last accessed lesson
    if (enrollment) {
      enrollment.lastAccessedLesson = targetLesson._id;
      enrollment.lastAccessedAt = new Date();
      await enrollment.save();
    }

    const isCompleted = enrollment
      ? enrollment.completedLessons.some((id) => id.toString() === targetLesson._id.toString())
      : false;

    return res.status(200).json({
      course: {
        _id: course._id.toString(),
        title: course.title,
        slug: course.slug,
      },
      section: {
        _id: targetSection._id.toString(),
        title: targetSection.title,
      },
      lesson: {
        _id: targetLesson._id.toString(),
        title: targetLesson.title,
        description: targetLesson.description,
        contentType: targetLesson.contentType,
        videoUrl: targetLesson.videoUrl,
        textContent: targetLesson.textContent,
        attachmentUrl: targetLesson.attachmentUrl,
        duration: targetLesson.duration,
        sortOrder: targetLesson.sortOrder,
        isPublished: targetLesson.isPublished,
      },
      isCompleted,
    });
  } catch (error) {
    logger.error(`Get lesson content error: ${error.message}`);
    return res.status(500).json({
      error: 'Failed to retrieve lesson content.',
    });
  }
};

/**
 * Toggle lesson completion for enrolled student
 * POST /api/courses/:courseId/lessons/:lessonId/complete
 */
const toggleLessonComplete = async (req, res) => {
  try {
    const { courseId, lessonId } = req.params;
    const userId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(courseId) || !mongoose.Types.ObjectId.isValid(lessonId)) {
      return res.status(400).json({ error: 'Invalid ID format.' });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ error: 'Course not found.' });
    }

    // Validate that the lesson actually belongs to this course's curriculum
    const lessonExists = (course.sections || []).some((s) =>
      (s.lessons || []).some((l) => l._id.toString() === lessonId)
    );
    if (!lessonExists) {
      return res.status(404).json({ error: 'Lesson not found in this course.' });
    }

    const enrollment = await Enrollment.findOne({
      student: userId,
      course: courseId,
      status: 'active',
    });

    if (!enrollment) {
      return res.status(403).json({
        error: 'You must be enrolled in this course to mark lessons complete.',
      });
    }

    const index = enrollment.completedLessons.findIndex(
      (id) => id.toString() === lessonId
    );

    let completed = false;
    if (index > -1) {
      enrollment.completedLessons.splice(index, 1);
      completed = false;
    } else {
      enrollment.completedLessons.push(lessonId);
      completed = true;
    }

    await enrollment.save();

    return res.status(200).json({
      message: completed ? 'Lesson marked as completed' : 'Lesson marked as incomplete',
      isCompleted: completed,
      completedLessons: enrollment.completedLessons.map((id) => id.toString()),
    });
  } catch (error) {
    logger.error(`Toggle lesson complete error: ${error.message}`);
    return res.status(500).json({
      error: 'Failed to update lesson completion status.',
    });
  }
};

module.exports = {
  getCourses,
  getCourseByIdOrSlug,
  getLessonContent,
  toggleLessonComplete,
};
