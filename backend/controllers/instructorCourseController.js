const mongoose = require('mongoose');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const { logger } = require('../utils/logger');

/**
 * Helper to verify instructor ownership of a course
 */
const verifyCourseOwnership = async (courseId, userId, userRole) => {
  if (!mongoose.Types.ObjectId.isValid(courseId)) {
    return { error: 'Invalid course ID format.', status: 400 };
  }

  const course = await Course.findById(courseId);
  if (!course) {
    return { error: 'Course not found.', status: 404 };
  }

  if (course.instructor.toString() !== userId && userRole !== 'admin') {
    return { error: 'Forbidden: You do not have permission to manage this course.', status: 403 };
  }

  return { course };
};

/**
 * Create a new course in draft status
 * POST /api/instructor/courses
 */
const createCourse = async (req, res) => {
  try {
    const {
      title,
      summary,
      description,
      category,
      level,
      thumbnail,
      learningObjectives,
      prerequisites,
      intendedAudience,
      estimatedDuration,
      language,
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Course title is required.' });
    }
    if (!summary || !summary.trim()) {
      return res.status(400).json({ error: 'Course summary is required.' });
    }
    if (!description || !description.trim()) {
      return res.status(400).json({ error: 'Course full description is required.' });
    }

    const slug = await Course.generateSlug(title);

    const newCourse = await Course.create({
      title: title.trim(),
      slug,
      summary: summary.trim(),
      description: description.trim(),
      instructor: req.user.id,
      category: category || 'Development',
      level: level || 'Beginner',
      thumbnail: thumbnail || '',
      learningObjectives: Array.isArray(learningObjectives) ? learningObjectives : [],
      prerequisites: prerequisites || '',
      intendedAudience: intendedAudience || '',
      estimatedDuration: estimatedDuration || '4 weeks',
      language: language || 'English',
      status: 'draft',
      sections: [],
    });

    logger.success(`Course created by ${req.user.email}: ${newCourse.title} (${newCourse._id})`);

    return res.status(201).json({
      message: 'Course created successfully as draft.',
      course: newCourse,
    });
  } catch (error) {
    logger.error(`Create course error: ${error.message}`);
    return res.status(500).json({
      error: 'Failed to create course.',
    });
  }
};

/**
 * Get courses authored by the current instructor
 * GET /api/instructor/courses
 */
const getInstructorCourses = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, search } = req.query;

    const filter = { instructor: userId };

    if (status && status !== 'all') {
      filter.status = status;
    }

    if (search && typeof search === 'string') {
      const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (escaped) {
        filter.$or = [
          { title: { $regex: escaped, $options: 'i' } },
          { summary: { $regex: escaped, $options: 'i' } },
        ];
      }
    }

    const courses = await Course.find(filter).sort({ updatedAt: -1 }).lean();

    // Fetch active enrollments count for each course
    const courseIds = courses.map((c) => c._id);
    const enrollmentCounts = await Enrollment.aggregate([
      { $match: { course: { $in: courseIds }, status: 'active' } },
      { $group: { _id: '$course', totalEnrolled: { $sum: 1 } } },
    ]);

    const countMap = {};
    enrollmentCounts.forEach((item) => {
      countMap[item._id.toString()] = item.totalEnrolled;
    });

    const formatted = courses.map((c) => {
      const totalLessons = (c.sections || []).reduce(
        (sum, s) => sum + (s.lessons ? s.lessons.length : 0),
        0
      );

      return {
        _id: c._id.toString(),
        title: c.title,
        slug: c.slug,
        summary: c.summary,
        category: c.category,
        level: c.level,
        thumbnail: c.thumbnail,
        status: c.status,
        rejectionReason: c.rejectionReason || '',
        totalSections: (c.sections || []).length,
        totalLessons,
        enrolledCount: countMap[c._id.toString()] || 0,
        updatedAt: c.updatedAt,
        createdAt: c.createdAt,
      };
    });

    return res.status(200).json({
      courses: formatted,
      count: formatted.length,
    });
  } catch (error) {
    logger.error(`Get instructor courses error: ${error.message}`);
    return res.status(500).json({
      error: 'Failed to retrieve instructor courses.',
    });
  }
};

/**
 * Get single course with full curriculum for editing
 * GET /api/instructor/courses/:courseId
 */
const getInstructorCourseById = async (req, res) => {
  try {
    const { course, error, status } = await verifyCourseOwnership(
      req.params.courseId,
      req.user.id,
      req.user.role
    );
    if (error) return res.status(status).json({ error });

    const enrolledCount = await Enrollment.countDocuments({
      course: course._id,
      status: 'active',
    });

    return res.status(200).json({
      course,
      enrolledCount,
    });
  } catch (error) {
    logger.error(`Get instructor course by id error: ${error.message}`);
    return res.status(500).json({
      error: 'Failed to retrieve course details.',
    });
  }
};

/**
 * Update course metadata
 * PATCH /api/instructor/courses/:courseId
 */
const updateCourse = async (req, res) => {
  try {
    const { course, error, status } = await verifyCourseOwnership(
      req.params.courseId,
      req.user.id,
      req.user.role
    );
    if (error) return res.status(status).json({ error });

    const {
      title,
      summary,
      description,
      category,
      level,
      thumbnail,
      learningObjectives,
      prerequisites,
      intendedAudience,
      estimatedDuration,
      language,
    } = req.body;

    if (title && title.trim() !== course.title) {
      course.title = title.trim();
      course.slug = await Course.generateSlug(course.title, course._id);
    }

    if (summary !== undefined) course.summary = summary.trim();
    if (description !== undefined) course.description = description.trim();
    if (category !== undefined) course.category = category;
    if (level !== undefined) course.level = level;
    if (thumbnail !== undefined) course.thumbnail = thumbnail.trim();
    if (learningObjectives !== undefined && Array.isArray(learningObjectives)) {
      course.learningObjectives = learningObjectives;
    }
    if (prerequisites !== undefined) course.prerequisites = prerequisites.trim();
    if (intendedAudience !== undefined) course.intendedAudience = intendedAudience.trim();
    if (estimatedDuration !== undefined) course.estimatedDuration = estimatedDuration.trim();
    if (language !== undefined) course.language = language.trim();

    // If course was rejected and is being updated, return it to draft
    if (course.status === 'rejected') {
      course.status = 'draft';
      course.rejectionReason = '';
    }

    await course.save();

    logger.info(`Course updated by ${req.user.email}: ${course.title} (${course._id})`);

    return res.status(200).json({
      message: 'Course updated successfully.',
      course,
    });
  } catch (error) {
    logger.error(`Update course error: ${error.message}`);
    return res.status(500).json({
      error: 'Failed to update course.',
    });
  }
};

/**
 * Delete or archive course
 * DELETE /api/instructor/courses/:courseId
 */
const deleteCourse = async (req, res) => {
  try {
    const { course, error, status } = await verifyCourseOwnership(
      req.params.courseId,
      req.user.id,
      req.user.role
    );
    if (error) return res.status(status).json({ error });

    // Check if any active or past enrollments exist
    const enrollmentsCount = await Enrollment.countDocuments({
      course: course._id,
    });

    if (enrollmentsCount > 0) {
      // Archive course to preserve student learning records
      course.status = 'archived';
      await course.save();

      logger.info(
        `Course archived due to existing enrollments: ${course.title} (${course._id}) by ${req.user.email}`
      );

      return res.status(200).json({
        message: 'Course has active enrollments and has been archived instead of permanently deleted to preserve student progress.',
        action: 'archived',
        course,
      });
    }

    // No enrollments exist; safe to permanently remove
    await course.deleteOne();

    logger.info(`Course permanently deleted: ${course.title} (${course._id}) by ${req.user.email}`);

    return res.status(200).json({
      message: 'Course deleted successfully.',
      action: 'deleted',
    });
  } catch (error) {
    logger.error(`Delete course error: ${error.message}`);
    return res.status(500).json({
      error: 'Failed to delete course.',
    });
  }
};

/**
 * Submit course for administrative review
 * POST /api/instructor/courses/:courseId/submit-for-review
 */
const submitForReview = async (req, res) => {
  try {
    const { course, error, status } = await verifyCourseOwnership(
      req.params.courseId,
      req.user.id,
      req.user.role
    );
    if (error) return res.status(status).json({ error });

    // Validation checks for submission
    if (!course.title || !course.summary || !course.description) {
      return res.status(400).json({
        error: 'Course must have a title, summary, and description before submission.',
      });
    }

    if (!course.sections || course.sections.length === 0) {
      return res.status(400).json({
        error: 'Course must contain at least one section before submission.',
      });
    }

    const totalLessons = course.sections.reduce(
      (acc, s) => acc + (s.lessons ? s.lessons.length : 0),
      0
    );

    if (totalLessons === 0) {
      return res.status(400).json({
        error: 'Course must contain at least one lesson before submission.',
      });
    }

    course.status = 'pending_review';
    course.rejectionReason = '';
    await course.save();

    logger.success(`Course submitted for review: ${course.title} (${course._id}) by ${req.user.email}`);

    return res.status(200).json({
      message: 'Course submitted for review successfully! An administrator will evaluate your curriculum.',
      course,
    });
  } catch (error) {
    logger.error(`Submit course for review error: ${error.message}`);
    return res.status(500).json({
      error: 'Failed to submit course for review.',
    });
  }
};

/**
 * Add section to course
 * POST /api/instructor/courses/:courseId/sections
 */
const addSection = async (req, res) => {
  try {
    const { course, error, status } = await verifyCourseOwnership(
      req.params.courseId,
      req.user.id,
      req.user.role
    );
    if (error) return res.status(status).json({ error });

    const { title, description } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Section title is required.' });
    }

    const sortOrder = course.sections.length;
    const newSectionId = new mongoose.Types.ObjectId();
    course.sections.push({
      _id: newSectionId,
      title: title.trim(),
      description: (description || '').trim(),
      sortOrder,
      lessons: [],
    });

    await course.save();
    const createdSection = course.sections[course.sections.length - 1];

    return res.status(201).json({
      message: 'Section added successfully.',
      section: createdSection,
      sections: course.sections,
    });
  } catch (error) {
    logger.error(`Add section error: ${error.message}`);
    return res.status(500).json({
      error: 'Failed to add section.',
    });
  }
};

/**
 * Update section
 * PATCH /api/instructor/courses/:courseId/sections/:sectionId
 */
const updateSection = async (req, res) => {
  try {
    const { course, error, status } = await verifyCourseOwnership(
      req.params.courseId,
      req.user.id,
      req.user.role
    );
    if (error) return res.status(status).json({ error });

    const { sectionId } = req.params;
    const section = course.sections.id(sectionId);
    if (!section) {
      return res.status(404).json({ error: 'Section not found.' });
    }

    const { title, description } = req.body;
    if (title !== undefined) {
      if (!title.trim()) {
        return res.status(400).json({ error: 'Section title cannot be empty.' });
      }
      section.title = title.trim();
    }
    if (description !== undefined) {
      section.description = description.trim();
    }

    await course.save();

    return res.status(200).json({
      message: 'Section updated successfully.',
      section,
      sections: course.sections,
    });
  } catch (error) {
    logger.error(`Update section error: ${error.message}`);
    return res.status(500).json({
      error: 'Failed to update section.',
    });
  }
};

/**
 * Delete section
 * DELETE /api/instructor/courses/:courseId/sections/:sectionId
 */
const deleteSection = async (req, res) => {
  try {
    const { course, error, status } = await verifyCourseOwnership(
      req.params.courseId,
      req.user.id,
      req.user.role
    );
    if (error) return res.status(status).json({ error });

    const { sectionId } = req.params;
    const section = course.sections.id(sectionId);
    if (!section) {
      return res.status(404).json({ error: 'Section not found.' });
    }

    course.sections.pull({ _id: sectionId });

    // Re-index sortOrders
    course.sections.forEach((sec, idx) => {
      sec.sortOrder = idx;
    });

    await course.save();

    return res.status(200).json({
      message: 'Section deleted successfully.',
      sections: course.sections,
    });
  } catch (error) {
    logger.error(`Delete section error: ${error.message}`);
    return res.status(500).json({
      error: 'Failed to delete section.',
    });
  }
};

/**
 * Reorder sections
 * PUT /api/instructor/courses/:courseId/sections/reorder
 */
const reorderSections = async (req, res) => {
  try {
    const { course, error, status } = await verifyCourseOwnership(
      req.params.courseId,
      req.user.id,
      req.user.role
    );
    if (error) return res.status(status).json({ error });

    const { sectionIds } = req.body;
    if (!Array.isArray(sectionIds)) {
      return res.status(400).json({ error: 'sectionIds array is required.' });
    }

    // Map existing sections by ID
    const sectionMap = {};
    course.sections.forEach((s) => {
      sectionMap[s._id.toString()] = s;
    });

    const reordered = [];
    sectionIds.forEach((id, index) => {
      if (sectionMap[id]) {
        sectionMap[id].sortOrder = index;
        reordered.push(sectionMap[id]);
      }
    });

    // Append any omitted sections
    course.sections.forEach((s) => {
      if (!sectionIds.includes(s._id.toString())) {
        s.sortOrder = reordered.length;
        reordered.push(s);
      }
    });

    course.sections = reordered;
    await course.save();

    return res.status(200).json({
      message: 'Sections reordered successfully.',
      sections: course.sections,
    });
  } catch (error) {
    logger.error(`Reorder sections error: ${error.message}`);
    return res.status(500).json({
      error: 'Failed to reorder sections.',
    });
  }
};

/**
 * Add lesson to section
 * POST /api/instructor/courses/:courseId/sections/:sectionId/lessons
 */
const addLesson = async (req, res) => {
  try {
    const { course, error, status } = await verifyCourseOwnership(
      req.params.courseId,
      req.user.id,
      req.user.role
    );
    if (error) return res.status(status).json({ error });

    const { sectionId } = req.params;
    const section = course.sections.id(sectionId);
    if (!section) {
      return res.status(404).json({ error: 'Section not found.' });
    }

    const {
      title,
      description,
      contentType,
      videoUrl,
      textContent,
      attachmentUrl,
      duration,
      isPublished,
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Lesson title is required.' });
    }

    const sortOrder = section.lessons.length;
    const newLessonId = new mongoose.Types.ObjectId();
    section.lessons.push({
      _id: newLessonId,
      title: title.trim(),
      description: (description || '').trim(),
      contentType: contentType || 'video',
      videoUrl: (videoUrl || '').trim(),
      textContent: (textContent || '').trim(),
      attachmentUrl: (attachmentUrl || '').trim(),
      duration: duration || '10 mins',
      sortOrder,
      isPublished: isPublished !== undefined ? Boolean(isPublished) : true,
    });

    await course.save();
    const createdLesson = section.lessons[section.lessons.length - 1];

    return res.status(201).json({
      message: 'Lesson added successfully.',
      lesson: createdLesson,
      section,
    });
  } catch (error) {
    logger.error(`Add lesson error: ${error.message}`);
    return res.status(500).json({
      error: 'Failed to add lesson.',
    });
  }
};

/**
 * Update lesson
 * PATCH /api/instructor/courses/:courseId/sections/:sectionId/lessons/:lessonId
 */
const updateLesson = async (req, res) => {
  try {
    const { course, error, status } = await verifyCourseOwnership(
      req.params.courseId,
      req.user.id,
      req.user.role
    );
    if (error) return res.status(status).json({ error });

    const { sectionId, lessonId } = req.params;
    const section = course.sections.id(sectionId);
    if (!section) {
      return res.status(404).json({ error: 'Section not found.' });
    }

    const lesson = section.lessons.id(lessonId);
    if (!lesson) {
      return res.status(404).json({ error: 'Lesson not found.' });
    }

    const {
      title,
      description,
      contentType,
      videoUrl,
      textContent,
      attachmentUrl,
      duration,
      isPublished,
    } = req.body;

    if (title !== undefined) {
      if (!title.trim()) {
        return res.status(400).json({ error: 'Lesson title cannot be empty.' });
      }
      lesson.title = title.trim();
    }
    if (description !== undefined) lesson.description = description.trim();
    if (contentType !== undefined) lesson.contentType = contentType;
    if (videoUrl !== undefined) lesson.videoUrl = videoUrl.trim();
    if (textContent !== undefined) lesson.textContent = textContent;
    if (attachmentUrl !== undefined) lesson.attachmentUrl = attachmentUrl.trim();
    if (duration !== undefined) lesson.duration = duration.trim();
    if (isPublished !== undefined) lesson.isPublished = Boolean(isPublished);

    await course.save();

    return res.status(200).json({
      message: 'Lesson updated successfully.',
      lesson,
      section,
    });
  } catch (error) {
    logger.error(`Update lesson error: ${error.message}`);
    return res.status(500).json({
      error: 'Failed to update lesson.',
    });
  }
};

/**
 * Delete lesson
 * DELETE /api/instructor/courses/:courseId/sections/:sectionId/lessons/:lessonId
 */
const deleteLesson = async (req, res) => {
  try {
    const { course, error, status } = await verifyCourseOwnership(
      req.params.courseId,
      req.user.id,
      req.user.role
    );
    if (error) return res.status(status).json({ error });

    const { sectionId, lessonId } = req.params;
    const section = course.sections.id(sectionId);
    if (!section) {
      return res.status(404).json({ error: 'Section not found.' });
    }

    const lesson = section.lessons.id(lessonId);
    if (!lesson) {
      return res.status(404).json({ error: 'Lesson not found.' });
    }

    section.lessons.pull({ _id: lessonId });

    // Re-index sortOrders
    section.lessons.forEach((les, idx) => {
      les.sortOrder = idx;
    });

    await course.save();

    return res.status(200).json({
      message: 'Lesson deleted successfully.',
      section,
    });
  } catch (error) {
    logger.error(`Delete lesson error: ${error.message}`);
    return res.status(500).json({
      error: 'Failed to delete lesson.',
    });
  }
};

/**
 * Reorder lessons in section
 * PUT /api/instructor/courses/:courseId/sections/:sectionId/lessons/reorder
 */
const reorderLessons = async (req, res) => {
  try {
    const { course, error, status } = await verifyCourseOwnership(
      req.params.courseId,
      req.user.id,
      req.user.role
    );
    if (error) return res.status(status).json({ error });

    const { sectionId } = req.params;
    const section = course.sections.id(sectionId);
    if (!section) {
      return res.status(404).json({ error: 'Section not found.' });
    }

    const { lessonIds } = req.body;
    if (!Array.isArray(lessonIds)) {
      return res.status(400).json({ error: 'lessonIds array is required.' });
    }

    const lessonMap = {};
    section.lessons.forEach((l) => {
      lessonMap[l._id.toString()] = l;
    });

    const reordered = [];
    lessonIds.forEach((id, index) => {
      if (lessonMap[id]) {
        lessonMap[id].sortOrder = index;
        reordered.push(lessonMap[id]);
      }
    });

    section.lessons.forEach((l) => {
      if (!lessonIds.includes(l._id.toString())) {
        l.sortOrder = reordered.length;
        reordered.push(l);
      }
    });

    section.lessons = reordered;
    await course.save();

    return res.status(200).json({
      message: 'Lessons reordered successfully.',
      section,
    });
  } catch (error) {
    logger.error(`Reorder lessons error: ${error.message}`);
    return res.status(500).json({
      error: 'Failed to reorder lessons.',
    });
  }
};

module.exports = {
  createCourse,
  getInstructorCourses,
  getInstructorCourseById,
  updateCourse,
  deleteCourse,
  submitForReview,
  addSection,
  updateSection,
  deleteSection,
  reorderSections,
  addLesson,
  updateLesson,
  deleteLesson,
  reorderLessons,
};
