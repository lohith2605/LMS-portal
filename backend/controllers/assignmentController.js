const mongoose = require('mongoose');
const path = require('path');
const crypto = require('crypto');
const Assignment = require('../models/Assignment');
const AssignmentSubmission = require('../models/AssignmentSubmission');
const PendingUpload = require('../models/PendingUpload');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const cloudinaryStorageService = require('../services/cloudinaryStorageService');
const { logger } = require('../utils/logger');

/**
 * Helper: Verify instructor ownership of course
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
    return { error: 'Forbidden: You do not have permission to manage assignments for this course.', status: 403 };
  }

  return { course };
};

/**
 * Helper: Verify instructor ownership of assignment
 */
const verifyInstructorAssignment = async (assignmentId, userId, userRole) => {
  if (!mongoose.Types.ObjectId.isValid(assignmentId)) {
    return { error: 'Invalid assignment ID format.', status: 400 };
  }

  const assignment = await Assignment.findById(assignmentId).populate('course', 'title status instructor');
  if (!assignment) {
    return { error: 'Assignment not found.', status: 404 };
  }

  if (assignment.instructor.toString() !== userId && userRole !== 'admin') {
    return { error: 'Forbidden: You do not have permission to manage this assignment.', status: 403 };
  }

  return { assignment };
};

/**
 * Helper: Verify student active enrollment in a course
 */
const verifyStudentEnrollment = async (courseOrId, studentId) => {
  const targetCourseId =
    courseOrId && typeof courseOrId === 'object' && courseOrId._id
      ? courseOrId._id
      : courseOrId;

  const enrollment = await Enrollment.findOne({
    course: targetCourseId,
    student: studentId,
    status: { $in: ['active', 'completed'] },
  });

  return Boolean(enrollment);
};

/**
 * Helper: Enrich submission files with secure authorized download URLs
 */
const enrichSubmissionFiles = (submissionObj, role = 'student') => {
  if (!submissionObj) return submissionObj;
  const sub = submissionObj.toObject ? submissionObj.toObject() : { ...submissionObj };
  const basePath = role === 'instructor' ? '/api/instructor/submissions' : '/api/student/submissions';

  if (Array.isArray(sub.submittedFiles)) {
    sub.submittedFiles = sub.submittedFiles.map((file) => {
      const f = file.toObject ? file.toObject() : { ...file };
      if (f._id && (f.cloudinaryPublicId || f.storageProvider === 'cloudinary')) {
        f.fileUrl = `${basePath}/${sub._id}/files/${f._id}/download?redirect=true`;
        f.downloadUrl = f.fileUrl;
      }
      return f;
    });
  }

  if (Array.isArray(sub.history)) {
    sub.history = sub.history.map((h) => {
      const hist = h.toObject ? h.toObject() : { ...h };
      if (Array.isArray(hist.submittedFiles)) {
        hist.submittedFiles = hist.submittedFiles.map((file) => {
          const f = file.toObject ? file.toObject() : { ...file };
          if (f._id && (f.cloudinaryPublicId || f.storageProvider === 'cloudinary')) {
            f.fileUrl = `${basePath}/${sub._id}/files/${f._id}/download?redirect=true`;
            f.downloadUrl = f.fileUrl;
          }
          return f;
        });
      }
      return hist;
    });
  }

  return sub;
};

// ==========================================
// INSTRUCTOR ASSIGNMENT CONTROLLER METHODS
// ==========================================

/**
 * Create a new assignment for a course
 * POST /api/instructor/courses/:courseId/assignments
 */
const createAssignment = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { course, error, status } = await verifyInstructorCourse(courseId, req.user.id, req.user.role);
    if (error) return res.status(status).json({ error });

    const {
      title,
      description,
      instructions,
      maxMarks,
      dueDate,
      submissionTypes,
      allowedFileTypes,
      maxFileSizeMB,
      allowLateSubmissions,
      latePenaltyPercent,
      attachments,
      sectionId,
      lessonId,
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Assignment title is required.' });
    }

    if (!instructions || !instructions.trim()) {
      return res.status(400).json({ error: 'Assignment instructions are required.' });
    }

    if (!dueDate || isNaN(new Date(dueDate).getTime())) {
      return res.status(400).json({ error: 'A valid due date is required.' });
    }

    const marksNum = Number(maxMarks);
    if (isNaN(marksNum) || marksNum <= 0 || marksNum > 1000) {
      return res.status(400).json({ error: 'Maximum marks must be a positive number between 1 and 1000.' });
    }

    // Validate sectionId / lessonId belong to course if provided
    if (sectionId && mongoose.Types.ObjectId.isValid(sectionId)) {
      const sectionExists = course.sections?.some((s) => s._id.toString() === sectionId.toString());
      if (!sectionExists) {
        return res.status(400).json({ error: 'Specified section does not belong to this course.' });
      }
    }

    const assignment = await Assignment.create({
      course: course._id,
      instructor: req.user.id,
      sectionId: sectionId && mongoose.Types.ObjectId.isValid(sectionId) ? sectionId : null,
      lessonId: lessonId && mongoose.Types.ObjectId.isValid(lessonId) ? lessonId : null,
      title: title.trim(),
      description: description ? description.trim() : '',
      instructions: instructions.trim(),
      maxMarks: marksNum,
      dueDate: new Date(dueDate),
      submissionTypes: Array.isArray(submissionTypes) && submissionTypes.length > 0 ? submissionTypes : ['text'],
      allowedFileTypes: Array.isArray(allowedFileTypes) ? allowedFileTypes : ['pdf', 'zip', 'docx'],
      maxFileSizeMB: typeof maxFileSizeMB === 'number' ? Math.min(50, Math.max(1, maxFileSizeMB)) : 10,
      allowLateSubmissions: allowLateSubmissions !== false,
      latePenaltyPercent: typeof latePenaltyPercent === 'number' ? Math.min(100, Math.max(0, latePenaltyPercent)) : 0,
      attachments: Array.isArray(attachments) ? attachments : [],
      status: 'draft',
    });

    logger.success(`Assignment created: "${assignment.title}" for course "${course.title}" by ${req.user.email}`);

    return res.status(201).json({
      message: 'Assignment created successfully as draft.',
      assignment,
    });
  } catch (err) {
    logger.error(`createAssignment error: ${err.message}`);
    return res.status(500).json({ error: 'Internal server error while creating assignment.' });
  }
};

/**
 * Get assignments for an instructor course with submission statistics
 * GET /api/instructor/courses/:courseId/assignments
 */
const getInstructorCourseAssignments = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { course, error, status } = await verifyInstructorCourse(courseId, req.user.id, req.user.role);
    if (error) return res.status(status).json({ error });

    const assignments = await Assignment.find({ course: course._id })
      .sort({ createdAt: -1 })
      .lean();

    const assignmentIds = assignments.map((a) => a._id);

    // Aggregate submission metrics per assignment
    const submissionStats = await AssignmentSubmission.aggregate([
      { $match: { assignment: { $in: assignmentIds } } },
      {
        $group: {
          _id: '$assignment',
          totalSubmissions: { $sum: 1 },
          gradedCount: {
            $sum: { $cond: [{ $eq: ['$status', 'graded'] }, 1, 0] },
          },
          pendingCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $in: ['$status', ['submitted', 'late']] },
                    { $eq: ['$isGradePublished', false] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ]);

    const statsMap = {};
    submissionStats.forEach((s) => {
      statsMap[s._id.toString()] = {
        totalSubmissions: s.totalSubmissions,
        gradedCount: s.gradedCount,
        pendingCount: s.pendingCount,
      };
    });

    const enrichedAssignments = assignments.map((a) => ({
      ...a,
      stats: statsMap[a._id.toString()] || {
        totalSubmissions: 0,
        gradedCount: 0,
        pendingCount: 0,
      },
    }));

    return res.status(200).json({
      assignments: enrichedAssignments,
    });
  } catch (err) {
    logger.error(`getInstructorCourseAssignments error: ${err.message}`);
    return res.status(500).json({ error: 'Failed to retrieve course assignments.' });
  }
};

/**
 * Get single assignment by ID for instructor
 * GET /api/instructor/assignments/:assignmentId
 */
const getInstructorAssignmentById = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const { assignment, error, status } = await verifyInstructorAssignment(assignmentId, req.user.id, req.user.role);
    if (error) return res.status(status).json({ error });

    return res.status(200).json({ assignment });
  } catch (err) {
    logger.error(`getInstructorAssignmentById error: ${err.message}`);
    return res.status(500).json({ error: 'Failed to retrieve assignment.' });
  }
};

/**
 * Update assignment details
 * PATCH /api/instructor/assignments/:assignmentId
 */
const updateAssignment = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const { assignment, error, status } = await verifyInstructorAssignment(assignmentId, req.user.id, req.user.role);
    if (error) return res.status(status).json({ error });

    const allowedUpdates = [
      'title',
      'description',
      'instructions',
      'maxMarks',
      'dueDate',
      'submissionTypes',
      'allowedFileTypes',
      'maxFileSizeMB',
      'allowLateSubmissions',
      'latePenaltyPercent',
      'attachments',
      'sectionId',
      'lessonId',
    ];

    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) {
        if (field === 'title' && req.body[field].trim()) assignment.title = req.body[field].trim();
        else if (field === 'instructions' && req.body[field].trim()) assignment.instructions = req.body[field].trim();
        else if (field === 'description') assignment.description = req.body[field].trim();
        else if (field === 'maxMarks') {
          const marksNum = Number(req.body[field]);
          if (!isNaN(marksNum) && marksNum > 0 && marksNum <= 1000) assignment.maxMarks = marksNum;
        } else if (field === 'dueDate' && !isNaN(new Date(req.body[field]).getTime())) {
          assignment.dueDate = new Date(req.body[field]);
        } else if (field === 'submissionTypes' && Array.isArray(req.body[field]) && req.body[field].length > 0) {
          assignment.submissionTypes = req.body[field];
        } else if (field === 'allowedFileTypes' && Array.isArray(req.body[field])) {
          assignment.allowedFileTypes = req.body[field];
        } else if (field === 'maxFileSizeMB' && typeof req.body[field] === 'number') {
          assignment.maxFileSizeMB = Math.min(50, Math.max(1, req.body[field]));
        } else if (field === 'allowLateSubmissions') {
          assignment.allowLateSubmissions = Boolean(req.body[field]);
        } else if (field === 'latePenaltyPercent' && typeof req.body[field] === 'number') {
          assignment.latePenaltyPercent = Math.min(100, Math.max(0, req.body[field]));
        } else if (field === 'attachments' && Array.isArray(req.body[field])) {
          assignment.attachments = req.body[field];
        } else if (field === 'sectionId') {
          assignment.sectionId = req.body[field] && mongoose.Types.ObjectId.isValid(req.body[field]) ? req.body[field] : null;
        } else if (field === 'lessonId') {
          assignment.lessonId = req.body[field] && mongoose.Types.ObjectId.isValid(req.body[field]) ? req.body[field] : null;
        }
      }
    });

    await assignment.save();
    return res.status(200).json({ message: 'Assignment updated successfully.', assignment });
  } catch (err) {
    logger.error(`updateAssignment error: ${err.message}`);
    return res.status(500).json({ error: 'Failed to update assignment.' });
  }
};

/**
 * Publish an assignment
 * POST /api/instructor/assignments/:assignmentId/publish
 * PATCH /api/instructor/assignments/:assignmentId/publish
 */
const publishAssignment = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const { assignment, error, status } = await verifyInstructorAssignment(assignmentId, req.user.id, req.user.role);
    if (error) return res.status(status).json({ error });

    if (!assignment.title || !assignment.title.trim()) {
      return res.status(400).json({ error: 'Assignment must have a title before publishing.' });
    }

    if (!assignment.instructions || !assignment.instructions.trim()) {
      return res.status(400).json({ error: 'Assignment must have instructions before publishing.' });
    }

    if (!assignment.dueDate) {
      return res.status(400).json({ error: 'Assignment must have a valid deadline before publishing.' });
    }

    if (!assignment.maxMarks || assignment.maxMarks <= 0) {
      return res.status(400).json({ error: 'Assignment must have maximum marks greater than zero before publishing.' });
    }

    assignment.status = 'published';
    await assignment.save();

    logger.success(`Assignment published: "${assignment.title}" by ${req.user.email}`);

    return res.status(200).json({
      message: 'Assignment published successfully and is now active for learners.',
      assignment,
    });
  } catch (err) {
    logger.error(`publishAssignment error: ${err.message}`);
    return res.status(500).json({ error: 'Failed to publish assignment.' });
  }
};

/**
 * Archive an assignment
 * PATCH /api/instructor/assignments/:assignmentId/archive
 */
const archiveAssignment = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const { assignment, error, status } = await verifyInstructorAssignment(assignmentId, req.user.id, req.user.role);
    if (error) return res.status(status).json({ error });

    assignment.status = 'archived';
    await assignment.save();

    return res.status(200).json({
      message: 'Assignment archived successfully.',
      assignment,
    });
  } catch (err) {
    logger.error(`archiveAssignment error: ${err.message}`);
    return res.status(500).json({ error: 'Failed to archive assignment.' });
  }
};

/**
 * Delete an assignment
 * DELETE /api/instructor/assignments/:assignmentId
 */
const deleteAssignment = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const { assignment, error, status } = await verifyInstructorAssignment(assignmentId, req.user.id, req.user.role);
    if (error) return res.status(status).json({ error });

    // Block deletion if student submissions exist to protect historical records
    const submissionCount = await AssignmentSubmission.countDocuments({ assignment: assignment._id });
    if (submissionCount > 0) {
      return res.status(400).json({
        error: `Cannot delete assignment because ${submissionCount} student submission(s) exist. Please archive the assignment instead.`,
      });
    }

    await Assignment.findByIdAndDelete(assignment._id);

    return res.status(200).json({
      message: 'Assignment deleted successfully.',
    });
  } catch (err) {
    logger.error(`deleteAssignment error: ${err.message}`);
    return res.status(500).json({ error: 'Failed to delete assignment.' });
  }
};

/**
 * List submissions for an assignment
 * GET /api/instructor/assignments/:assignmentId/submissions
 */
const getAssignmentSubmissions = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const { assignment, error, status } = await verifyInstructorAssignment(assignmentId, req.user.id, req.user.role);
    if (error) return res.status(status).json({ error });

    const { filterStatus } = req.query;
    const query = { assignment: assignment._id };

    if (filterStatus && filterStatus !== 'all') {
      if (filterStatus === 'pending') {
        query.status = { $in: ['submitted', 'late'] };
        query.isGradePublished = false;
      } else {
        query.status = filterStatus;
      }
    }

    const submissions = await AssignmentSubmission.find(query)
      .populate('student', 'name email avatar')
      .populate('gradedBy', 'name email')
      .sort({ submittedAt: -1 })
      .lean();

    const enrichedSubmissions = submissions.map((s) => enrichSubmissionFiles(s, 'instructor'));

    return res.status(200).json({
      assignment: {
        _id: assignment._id,
        title: assignment.title,
        maxMarks: assignment.maxMarks,
        dueDate: assignment.dueDate,
        courseTitle: assignment.course?.title,
      },
      submissions: enrichedSubmissions,
    });
  } catch (err) {
    logger.error(`getAssignmentSubmissions error: ${err.message}`);
    return res.status(500).json({ error: 'Failed to retrieve assignment submissions.' });
  }
};

/**
 * Get single submission by ID for grading
 * GET /api/instructor/submissions/:submissionId
 */
const getSubmissionById = async (req, res) => {
  try {
    const { submissionId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(submissionId)) {
      return res.status(400).json({ error: 'Invalid submission ID format.' });
    }

    const submission = await AssignmentSubmission.findById(submissionId)
      .populate('student', 'name email avatar')
      .populate('assignment')
      .populate('course', 'title instructor')
      .populate('gradedBy', 'name email');

    if (!submission) {
      return res.status(404).json({ error: 'Submission not found.' });
    }

    // Verify instructor ownership of the course
    if (submission.course.instructor.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: You do not have permission to evaluate this submission.' });
    }

    const enrichedSubmission = enrichSubmissionFiles(submission, 'instructor');
    return res.status(200).json({ submission: enrichedSubmission });
  } catch (err) {
    logger.error(`getSubmissionById error: ${err.message}`);
    return res.status(500).json({ error: 'Failed to retrieve submission.' });
  }
};

/**
 * Grade and provide feedback for a student submission
 * PATCH /api/instructor/submissions/:submissionId/grade
 */
const gradeSubmission = async (req, res) => {
  try {
    const { submissionId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(submissionId)) {
      return res.status(400).json({ error: 'Invalid submission ID format.' });
    }

    const submission = await AssignmentSubmission.findById(submissionId)
      .populate('assignment')
      .populate('course', 'instructor');

    if (!submission) {
      return res.status(404).json({ error: 'Submission not found.' });
    }

    // Verify instructor ownership
    if (submission.course.instructor.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: You do not own this course.' });
    }

    const { grade, feedback, isGradePublished } = req.body;
    const gradeNum = Number(grade);

    if (isNaN(gradeNum) || gradeNum < 0) {
      return res.status(400).json({ error: 'Awarded grade must be a non-negative number.' });
    }

    const maxMarks = submission.assignment?.maxMarks || 100;
    if (gradeNum > maxMarks) {
      return res.status(400).json({
        error: `Awarded grade (${gradeNum}) cannot exceed assignment maximum marks (${maxMarks}).`,
      });
    }

    // Calculate server-side late penalty if submission is late and penalty enabled
    let finalGrade = gradeNum;
    let appliedLatePenalty = 0;

    if (submission.isLate && submission.assignment?.latePenaltyPercent > 0) {
      appliedLatePenalty = submission.assignment.latePenaltyPercent;
      const deduction = (finalGrade * appliedLatePenalty) / 100;
      finalGrade = Math.max(0, Math.round((finalGrade - deduction) * 10) / 10);
    }

    submission.grade = finalGrade;
    submission.appliedLatePenalty = appliedLatePenalty;
    submission.feedback = feedback ? String(feedback).trim() : '';
    submission.gradedBy = req.user.id;
    submission.gradedAt = new Date();
    submission.isGradePublished = isGradePublished !== false;
    submission.status = 'graded';

    await submission.save();

    logger.success(
      `Submission graded: ID ${submission._id} by instructor ${req.user.email} -> ${finalGrade}/${maxMarks}`
    );

    return res.status(200).json({
      message: 'Submission graded successfully.',
      submission,
    });
  } catch (err) {
    logger.error(`gradeSubmission error: ${err.message}`);
    return res.status(500).json({ error: 'Failed to grade submission.' });
  }
};

/**
 * Return submission to student for revision
 * POST /api/instructor/submissions/:submissionId/return-for-revision
 */
const returnSubmissionForRevision = async (req, res) => {
  try {
    const { submissionId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(submissionId)) {
      return res.status(400).json({ error: 'Invalid submission ID format.' });
    }

    const submission = await AssignmentSubmission.findById(submissionId).populate('course', 'instructor');
    if (!submission) {
      return res.status(404).json({ error: 'Submission not found.' });
    }

    if (submission.course.instructor.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: You do not own this course.' });
    }

    const { feedback } = req.body;
    submission.status = 'returned_for_revision';
    submission.feedback = feedback ? String(feedback).trim() : 'Please revise your submission and resubmit.';
    submission.gradedBy = req.user.id;
    submission.gradedAt = new Date();
    submission.isGradePublished = true;

    await submission.save();

    return res.status(200).json({
      message: 'Submission returned for revision.',
      submission,
    });
  } catch (err) {
    logger.error(`returnSubmissionForRevision error: ${err.message}`);
    return res.status(500).json({ error: 'Failed to return submission for revision.' });
  }
};

/**
 * Download an attached submission file (instructor access)
 * GET /api/instructor/submissions/:submissionId/files/:fileId/download
 */
const downloadInstructorSubmissionFile = async (req, res) => {
  try {
    const { submissionId, fileId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(submissionId) || !mongoose.Types.ObjectId.isValid(fileId)) {
      return res.status(400).json({ error: 'Invalid ID format.' });
    }

    const submission = await AssignmentSubmission.findById(submissionId).populate('course', 'instructor');
    if (!submission) {
      return res.status(404).json({ error: 'Submission not found.' });
    }

    // Verify instructor ownership of the course
    if (submission.course.instructor.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: You do not have permission to access files for this submission.' });
    }

    // Find file in active submittedFiles or history
    let targetFile = (submission.submittedFiles || []).find((f) => f._id.toString() === fileId);
    if (!targetFile && Array.isArray(submission.history)) {
      for (const h of submission.history) {
        targetFile = (h.submittedFiles || []).find((f) => f._id.toString() === fileId);
        if (targetFile) break;
      }
    }

    if (!targetFile) {
      return res.status(404).json({ error: 'Attached file not found in submission records.' });
    }

    // If Cloudinary stored file
    if (targetFile.cloudinaryPublicId) {
      try {
        const signedUrl = cloudinaryStorageService.generateAuthorizedDownloadUrl({
          cloudinaryPublicId: targetFile.cloudinaryPublicId,
          format: targetFile.format,
          resourceType: targetFile.resourceType || 'raw',
          deliveryType: targetFile.deliveryType || 'authenticated',
          originalName: targetFile.originalName,
        });

        if (req.query.redirect === 'false') {
          return res.status(200).json({ downloadUrl: signedUrl, fileName: targetFile.originalName });
        }
        return res.redirect(signedUrl);
      } catch (err) {
        logger.error(`Error generating download URL: ${err.message}`);
        return res.status(500).json({ error: 'Failed to generate secure download link.' });
      }
    }

    // Legacy Base64 or external file
    if (targetFile.fileUrl) {
      if (targetFile.fileUrl.startsWith('data:')) {
        const matches = targetFile.fileUrl.match(/^data:([^;]+);base64,(.+)$/);
        if (matches) {
          const contentType = matches[1];
          const buffer = Buffer.from(matches[2], 'base64');
          res.setHeader('Content-Type', contentType);
          res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(targetFile.originalName || 'submission_file')}"`);
          return res.send(buffer);
        }
      }
      return res.redirect(targetFile.fileUrl);
    }

    return res.status(404).json({ error: 'File content reference is unavailable.' });
  } catch (err) {
    logger.error(`downloadInstructorSubmissionFile error: ${err.message}`);
    return res.status(500).json({ error: 'Internal server error while retrieving file.' });
  }
};

// ==========================================
// STUDENT ASSIGNMENT CONTROLLER METHODS
// ==========================================

/**
 * Get all published assignments across enrolled courses
 * GET /api/student/assignments
 */
const getStudentAssignments = async (req, res) => {
  try {
    const studentId = req.user.id;

    // 1. Find all active/completed enrollments for the student
    const enrollments = await Enrollment.find({
      student: studentId,
      status: { $in: ['active', 'completed'] },
    }).select('course');

    const courseIds = enrollments.map((e) => e.course);
    if (courseIds.length === 0) {
      return res.status(200).json({ assignments: [] });
    }

    // 2. Find published assignments for these courses
    const assignments = await Assignment.find({
      course: { $in: courseIds },
      status: 'published',
    })
      .populate('course', 'title slug thumbnail category')
      .sort({ dueDate: 1 })
      .lean();

    const assignmentIds = assignments.map((a) => a._id);

    // 3. Find existing submissions by this student
    const studentSubmissions = await AssignmentSubmission.find({
      assignment: { $in: assignmentIds },
      student: studentId,
    }).lean();

    const submissionMap = {};
    studentSubmissions.forEach((sub) => {
      submissionMap[sub.assignment.toString()] = sub;
    });

    const now = new Date();

    // 4. Construct learner assignment cards with real state
    const result = assignments.map((a) => {
      const sub = submissionMap[a._id.toString()];
      const isPastDue = now > new Date(a.dueDate);

      let studentStatus = 'not_submitted';
      if (sub) {
        studentStatus = sub.status;
      } else if (isPastDue) {
        studentStatus = 'overdue';
      }

      return {
        _id: a._id,
        title: a.title,
        description: a.description,
        instructions: a.instructions,
        maxMarks: a.maxMarks,
        dueDate: a.dueDate,
        submissionTypes: a.submissionTypes,
        allowedFileTypes: a.allowedFileTypes,
        maxFileSizeMB: a.maxFileSizeMB,
        allowLateSubmissions: a.allowLateSubmissions,
        attachments: a.attachments,
        course: a.course,
        studentStatus,
        isOverdue: isPastDue && !sub,
        hasSubmitted: Boolean(sub),
        submission: sub
          ? {
              _id: sub._id,
              status: sub.status,
              isLate: sub.isLate,
              submittedAt: sub.submittedAt,
              version: sub.version,
              grade: sub.isGradePublished ? sub.grade : null,
              feedback: sub.isGradePublished ? sub.feedback : null,
              isGradePublished: sub.isGradePublished,
            }
          : null,
      };
    });

    return res.status(200).json({ assignments: result });
  } catch (err) {
    logger.error(`getStudentAssignments error: ${err.message}`);
    return res.status(500).json({ error: 'Failed to retrieve assignments.' });
  }
};

/**
 * Get assignments for a specific course (student view)
 * GET /api/courses/:idOrSlug/assignments
 */
const getCourseAssignments = async (req, res) => {
  try {
    const { idOrSlug } = req.params;
    let course;
    if (mongoose.Types.ObjectId.isValid(idOrSlug)) {
      course = await Course.findById(idOrSlug);
    } else {
      course = await Course.findOne({ slug: idOrSlug.toLowerCase() });
    }

    if (!course) {
      return res.status(404).json({ error: 'Course not found.' });
    }

    // Verify enrollment
    const isEnrolled = await verifyStudentEnrollment(course._id, req.user.id);
    if (!isEnrolled && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: You must be enrolled in this course to view its assignments.' });
    }

    const assignments = await Assignment.find({
      course: course._id,
      status: 'published',
    })
      .sort({ dueDate: 1 })
      .lean();

    const assignmentIds = assignments.map((a) => a._id);
    const submissions = await AssignmentSubmission.find({
      assignment: { $in: assignmentIds },
      student: req.user.id,
    }).lean();

    const submissionMap = {};
    submissions.forEach((s) => {
      submissionMap[s.assignment.toString()] = s;
    });

    const now = new Date();
    const enriched = assignments.map((a) => {
      const sub = submissionMap[a._id.toString()];
      const isPastDue = now > new Date(a.dueDate);

      return {
        ...a,
        studentStatus: sub ? sub.status : isPastDue ? 'overdue' : 'not_submitted',
        hasSubmitted: Boolean(sub),
        submission: sub
          ? {
              _id: sub._id,
              status: sub.status,
              isLate: sub.isLate,
              submittedAt: sub.submittedAt,
              version: sub.version,
              grade: sub.isGradePublished ? sub.grade : null,
              feedback: sub.isGradePublished ? sub.feedback : null,
              isGradePublished: sub.isGradePublished,
            }
          : null,
      };
    });

    return res.status(200).json({ assignments: enriched });
  } catch (err) {
    logger.error(`getCourseAssignments error: ${err.message}`);
    return res.status(500).json({ error: 'Failed to retrieve course assignments.' });
  }
};

/**
 * Upload an assignment submission file to Cloudinary
 * POST /api/student/assignments/:assignmentId/upload
 */
const uploadSubmissionFile = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(assignmentId)) {
      return res.status(400).json({ error: 'Invalid assignment ID format.' });
    }

    const assignment = await Assignment.findById(assignmentId);
    if (!assignment || assignment.status !== 'published') {
      return res.status(404).json({ error: 'Published assignment not found.' });
    }

    // Verify enrollment
    const isEnrolled = await verifyStudentEnrollment(assignment.course, req.user.id);
    if (!isEnrolled && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: You are not actively enrolled in this course.' });
    }

    // Deadline check
    const now = new Date();
    const isLate = now > new Date(assignment.dueDate);
    if (isLate && !assignment.allowLateSubmissions) {
      return res.status(400).json({
        error: 'Deadline has passed. This assignment does not accept late submissions.',
      });
    }

    if (!assignment.submissionTypes.includes('file')) {
      return res.status(400).json({ error: 'File submissions are not enabled for this assignment.' });
    }

    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ error: 'No file provided for upload.' });
    }

    const { originalname, size, mimetype, buffer } = req.file;

    // Validate file size against assignment policy
    const maxBytes = (assignment.maxFileSizeMB || 10) * 1024 * 1024;
    if (size > maxBytes) {
      return res.status(400).json({
        error: `File size (${(size / (1024 * 1024)).toFixed(2)} MB) exceeds the maximum permitted limit of ${assignment.maxFileSizeMB} MB.`,
      });
    }

    // Validate file extension against assignment allowedFileTypes
    const ext = path.extname(originalname).toLowerCase().replace('.', '');
    const allowedExts = (assignment.allowedFileTypes || []).map((e) => e.toLowerCase().replace('.', ''));
    if (allowedExts.length > 0 && !allowedExts.includes(ext)) {
      return res.status(400).json({
        error: `File type ".${ext}" is not permitted. Allowed types: ${allowedExts.join(', ')}.`,
      });
    }

    // Validate magic bytes file signature to detect tampering/mismatches
    const sigCheck = cloudinaryStorageService.validateFileSignature(buffer, ext);
    if (!sigCheck.valid) {
      return res.status(400).json({ error: sigCheck.error });
    }

        // Upload to Cloudinary using private authenticated delivery
    const uploadResult = await cloudinaryStorageService.uploadAssignmentFile(buffer, {
      originalName: originalname,
      mimeType: mimetype,
      assignmentId: assignment._id.toString(),
      studentId: req.user.id.toString(),
    });

    // Record verified pending upload in database bound to student and assignment
    try {
      await PendingUpload.create({
        student: req.user.id,
        assignment: assignment._id,
        cloudinaryPublicId: uploadResult.cloudinaryPublicId,
        originalName: uploadResult.originalName,
        resourceType: uploadResult.resourceType,
        deliveryType: uploadResult.deliveryType,
        format: uploadResult.format,
        fileSize: uploadResult.fileSize,
        mimeType: uploadResult.mimeType,
        checksum: uploadResult.checksum,
        status: 'pending',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });
    } catch (dbErr) {
      logger.error(`Failed to register pending upload in database: ${dbErr.message}. Cleaning up uploaded asset.`);
      try {
        await cloudinaryStorageService.deleteAsset(uploadResult.cloudinaryPublicId, {
          resourceType: uploadResult.resourceType,
          deliveryType: uploadResult.deliveryType,
        });
      } catch (delErr) {
        logger.error(`Failed to cleanup orphaned asset: ${delErr.message}`);
      }
      return res.status(500).json({ error: 'Failed to record upload in database. Please try again.' });
    }

    return res.status(200).json({
      message: 'File uploaded successfully to storage.',
      file: {
        originalName: uploadResult.originalName,
        cloudinaryPublicId: uploadResult.cloudinaryPublicId,
        resourceType: uploadResult.resourceType,
        deliveryType: uploadResult.deliveryType,
        format: uploadResult.format,
        fileSize: uploadResult.fileSize,
        mimeType: uploadResult.mimeType,
        checksum: uploadResult.checksum,
        storageProvider: 'cloudinary',
      },
    });
  } catch (err) {
    logger.error(`uploadSubmissionFile error: ${err.message}`);
    return res.status(500).json({ error: err.message || 'Failed to upload assignment file.' });
  }
};

/**
 * Download an attached submission file (student access)
 * GET /api/student/submissions/:submissionId/files/:fileId/download
 */
const downloadStudentSubmissionFile = async (req, res) => {
  try {
    const { submissionId, fileId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(submissionId) || !mongoose.Types.ObjectId.isValid(fileId)) {
      return res.status(400).json({ error: 'Invalid ID format.' });
    }

    const submission = await AssignmentSubmission.findById(submissionId);
    if (!submission) {
      return res.status(404).json({ error: 'Submission not found.' });
    }

    // Verify student ownership
    if (submission.student.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: You do not have permission to access files for this submission.' });
    }

    // Find file in active submittedFiles or history
    let targetFile = (submission.submittedFiles || []).find((f) => f._id.toString() === fileId);
    if (!targetFile && Array.isArray(submission.history)) {
      for (const h of submission.history) {
        targetFile = (h.submittedFiles || []).find((f) => f._id.toString() === fileId);
        if (targetFile) break;
      }
    }

    if (!targetFile) {
      return res.status(404).json({ error: 'Attached file not found in submission records.' });
    }

    // If Cloudinary stored file
    if (targetFile.cloudinaryPublicId) {
      try {
        const signedUrl = cloudinaryStorageService.generateAuthorizedDownloadUrl({
          cloudinaryPublicId: targetFile.cloudinaryPublicId,
          format: targetFile.format,
          resourceType: targetFile.resourceType || 'raw',
          deliveryType: targetFile.deliveryType || 'authenticated',
          originalName: targetFile.originalName,
        });

        if (req.query.redirect === 'false') {
          return res.status(200).json({ downloadUrl: signedUrl, fileName: targetFile.originalName });
        }
        return res.redirect(signedUrl);
      } catch (err) {
        logger.error(`Error generating download URL: ${err.message}`);
        return res.status(500).json({ error: 'Failed to generate secure download link.' });
      }
    }

    // Legacy Base64 or external file
    if (targetFile.fileUrl) {
      if (targetFile.fileUrl.startsWith('data:')) {
        const matches = targetFile.fileUrl.match(/^data:([^;]+);base64,(.+)$/);
        if (matches) {
          const contentType = matches[1];
          const fileBuffer = Buffer.from(matches[2], 'base64');
          res.setHeader('Content-Type', contentType);
          res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(targetFile.originalName || 'submission_file')}"`);
          return res.send(fileBuffer);
        }
      }
      return res.redirect(targetFile.fileUrl);
    }

    return res.status(404).json({ error: 'File content reference is unavailable.' });
  } catch (err) {
    logger.error(`downloadStudentSubmissionFile error: ${err.message}`);
    return res.status(500).json({ error: 'Internal server error while retrieving file.' });
  }
};

/**
 * Get assignment details by ID for student
 * GET /api/student/assignments/:assignmentId
 */
const getStudentAssignmentDetails = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(assignmentId)) {
      return res.status(400).json({ error: 'Invalid assignment ID format.' });
    }

    const assignment = await Assignment.findOne({
      _id: assignmentId,
      status: 'published',
    }).populate('course', 'title slug instructor sections');

    if (!assignment) {
      return res.status(404).json({ error: 'Published assignment not found.' });
    }

    // Verify enrollment
    const isEnrolled = await verifyStudentEnrollment(assignment.course._id, req.user.id);
    if (!isEnrolled && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: You are not enrolled in the course for this assignment.' });
    }

    const submission = await AssignmentSubmission.findOne({
      assignment: assignment._id,
      student: req.user.id,
    });

    let sanitizedSubmission = null;
    if (submission) {
      const enriched = enrichSubmissionFiles(submission, 'student');
      sanitizedSubmission = {
        ...enriched,
        grade: enriched.isGradePublished ? enriched.grade : null,
        feedback: enriched.isGradePublished ? enriched.feedback : null,
      };
    }

    return res.status(200).json({
      assignment,
      submission: sanitizedSubmission,
    });
  } catch (err) {
    logger.error(`getStudentAssignmentDetails error: ${err.message}`);
    return res.status(500).json({ error: 'Failed to retrieve assignment details.' });
  }
};

/**
 * Submit an assignment response (text and/or file)
 * POST /api/student/assignments/:assignmentId/submissions
 */
const submitAssignment = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(assignmentId)) {
      return res.status(400).json({ error: 'Invalid assignment ID format.' });
    }

    const assignment = await Assignment.findById(assignmentId);
    if (!assignment || assignment.status !== 'published') {
      return res.status(404).json({ error: 'Published assignment not found.' });
    }

    // Verify student enrollment
    const isEnrolled = await verifyStudentEnrollment(assignment.course, req.user.id);
    if (!isEnrolled && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: You are not actively enrolled in this course.' });
    }

    // Server-side Deadline Enforcement
    const now = new Date();
    const isLate = now > new Date(assignment.dueDate);

    if (isLate && !assignment.allowLateSubmissions) {
      return res.status(400).json({
        error: 'Deadline has passed. This assignment does not accept late submissions.',
      });
    }

    const { submissionText, submittedFiles } = req.body;

    const hasText = Boolean(submissionText && submissionText.trim());
    const hasFiles = Array.isArray(submittedFiles) && submittedFiles.length > 0;

    if (!hasText && !hasFiles) {
      return res.status(400).json({
        error: 'Submission cannot be empty. Please provide a written response or an attached file.',
      });
    }

        // Validate text length if provided
    if (hasText && submissionText.length > 10000) {
      return res.status(400).json({ error: 'Submission text cannot exceed 10,000 characters.' });
    }

    // Check for existing active submission before processing files
    let submission = await AssignmentSubmission.findOne({
      assignment: assignment._id,
      student: req.user.id,
    });

    if (submission && submission.status === 'graded') {
      return res.status(400).json({
        error: 'This assignment has already been evaluated and graded. Resubmission is not permitted.',
      });
    }

    // Validate files with strict ownership and provenance verification
    const validatedFiles = [];
    const pendingUploadsToConsume = [];

    if (hasFiles) {
      if (!assignment.submissionTypes.includes('file')) {
        return res.status(400).json({ error: 'File submissions are not enabled for this assignment.' });
      }

      const maxBytes = assignment.maxFileSizeMB * 1024 * 1024;
      const allowedExts = (assignment.allowedFileTypes || []).map((e) => e.toLowerCase().replace('.', ''));

      for (const file of submittedFiles) {
        if (!file.originalName || (!file.fileUrl && !file.cloudinaryPublicId) || !file.fileSize) {
          return res.status(400).json({ error: 'Invalid file payload metadata.' });
        }

        if (file.fileSize > maxBytes) {
          return res.status(400).json({
            error: `File "${file.originalName}" exceeds the maximum permitted size of ${assignment.maxFileSizeMB} MB.`,
          });
        }

        const ext = file.originalName.split('.').pop().toLowerCase();
        if (allowedExts.length > 0 && !allowedExts.includes(ext)) {
          return res.status(400).json({
            error: `File type ".${ext}" is not permitted. Allowed types: ${allowedExts.join(', ')}.`,
          });
        }

        if (file.cloudinaryPublicId) {
          const publicId = file.cloudinaryPublicId.trim();

          // 1. Verify file ownership against pending uploads for this student and assignment
          const pendingRecord = await PendingUpload.findOne({
            cloudinaryPublicId: publicId,
            student: req.user.id,
            assignment: assignment._id,
          });

          // 2. Check if file was already part of an existing submission version for this student and assignment
          const isAlreadySubmittedFile = submission && (
            (submission.submittedFiles || []).some((f) => f.cloudinaryPublicId === publicId) ||
            (submission.history || []).some((h) => (h.submittedFiles || []).some((f) => f.cloudinaryPublicId === publicId))
          );

          if (!pendingRecord && !isAlreadySubmittedFile) {
            return res.status(400).json({
              error: `Invalid or unverified file reference: "${file.originalName || publicId}". Please upload files through the authorized upload channel.`,
            });
          }

          if (pendingRecord) {
            const isExpired = pendingRecord.status === 'expired' || (pendingRecord.expiresAt && new Date() > new Date(pendingRecord.expiresAt));
            if (isExpired) {
              return res.status(400).json({
                error: `Upload session for file "${pendingRecord.originalName}" has expired. Please re-upload your file.`,
              });
            }

            // Check if already consumed by a DIFFERENT submission
            if (
              pendingRecord.status === 'consumed' &&
              pendingRecord.submission &&
              (!submission || pendingRecord.submission.toString() !== submission._id.toString())
            ) {
              return res.status(400).json({
                error: `File "${pendingRecord.originalName}" has already been consumed in another submission.`,
              });
            }
          }

          // Use verified metadata from server-persisted record rather than trusting client body
          const verified = pendingRecord || (
            (submission?.submittedFiles || []).find((f) => f.cloudinaryPublicId === publicId) ||
            (submission?.history || []).flatMap((h) => h.submittedFiles || []).find((f) => f.cloudinaryPublicId === publicId)
          );

          validatedFiles.push({
            originalName: verified.originalName || file.originalName.trim(),
            cloudinaryPublicId: verified.cloudinaryPublicId || publicId,
            resourceType: verified.resourceType || 'raw',
            deliveryType: verified.deliveryType || 'authenticated',
            format: verified.format || ext,
            fileSize: Number(verified.fileSize || file.fileSize),
            mimeType: verified.mimeType || 'application/octet-stream',
            checksum: verified.checksum || '',
            storageProvider: 'cloudinary',
            fileUrl: '', // Explicitly empty to prevent Base64 persistence in MongoDB
            uploadedAt: verified.uploadedAt ? new Date(verified.uploadedAt) : new Date(),
          });

          if (pendingRecord && pendingRecord.status === 'pending') {
            pendingUploadsToConsume.push(pendingRecord._id);
          }
        } else {
          // Reject direct Cloudinary URLs supplied in fileUrl
          if (file.fileUrl && (file.fileUrl.includes('cloudinary.com') || file.fileUrl.includes('res.cloudinary'))) {
            return res.status(400).json({
              error: 'Direct Cloudinary URLs are not permitted. Please upload files through the submission portal.',
            });
          }

          // Backward compatibility: Legacy Base64 or external file
          const isBase64 = file.fileUrl && file.fileUrl.startsWith('data:');
          validatedFiles.push({
            originalName: file.originalName.trim(),
            fileUrl: file.fileUrl.trim(),
            fileSize: Number(file.fileSize),
            mimeType: file.mimeType ? file.mimeType.trim() : 'application/octet-stream',
            storageProvider: isBase64 ? 'base64' : 'external',
            uploadedAt: new Date(),
          });
        }
      }
    }

    const statusValue = isLate ? 'late' : 'submitted';

    if (submission) {
      // Archive previous version into history
      submission.history.push({
        version: submission.version,
        submissionText: submission.submissionText,
        submittedFiles: submission.submittedFiles,
        submittedAt: submission.submittedAt,
        isLate: submission.isLate,
      });

      submission.version += 1;
      submission.submissionText = hasText ? submissionText.trim() : '';
      submission.submittedFiles = validatedFiles;
      submission.submittedAt = now;
      submission.isLate = isLate;
      submission.status = statusValue;
      submission.isGradePublished = false;

      try {
        await submission.save();
      } catch (saveErr) {
        logger.error(`Database save failed on resubmission: ${saveErr.message}`);
        throw saveErr;
      }

      // Mark pending uploads as consumed only AFTER successful persistence
      if (pendingUploadsToConsume.length > 0) {
        await PendingUpload.updateMany(
          { _id: { $in: pendingUploadsToConsume } },
          { $set: { status: 'consumed', submission: submission._id, consumedAt: new Date() } }
        );
      }

      logger.success(`Assignment resubmitted (v${submission.version}) by ${req.user.email} for "${assignment.title}"`);

      return res.status(200).json({
        message: 'Assignment resubmitted successfully.',
        submission: enrichSubmissionFiles(submission, 'student'),
      });
    }

    // First-time submission
    submission = await AssignmentSubmission.create({
      assignment: assignment._id,
      student: req.user.id,
      course: assignment.course,
      submissionText: hasText ? submissionText.trim() : '',
      submittedFiles: validatedFiles,
      submittedAt: now,
      isLate,
      status: statusValue,
      version: 1,
    });

    // Mark pending uploads as consumed only AFTER successful persistence
    if (pendingUploadsToConsume.length > 0) {
      await PendingUpload.updateMany(
        { _id: { $in: pendingUploadsToConsume } },
        { $set: { status: 'consumed', submission: submission._id, consumedAt: new Date() } }
      );
    }

    logger.success(`Assignment submitted (v1) by ${req.user.email} for "${assignment.title}"`);

    return res.status(201).json({
      message: 'Assignment submitted successfully.',
      submission: enrichSubmissionFiles(submission, 'student'),
    });
  } catch (err) {
    logger.error(`submitAssignment error: ${err.message}`);
    return res.status(500).json({ error: 'Failed to submit assignment.' });
  }
};

/**
 * Get student's own submission for an assignment
 * GET /api/student/assignments/:assignmentId/my-submission
 */
const getStudentSubmission = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(assignmentId)) {
      return res.status(400).json({ error: 'Invalid assignment ID format.' });
    }

    const submission = await AssignmentSubmission.findOne({
      assignment: assignmentId,
      student: req.user.id,
    }).populate('assignment', 'title maxMarks dueDate');

    if (!submission) {
      return res.status(200).json({ submission: null });
    }

    const enriched = enrichSubmissionFiles(submission, 'student');

    // Hide draft feedback if grade not published
    const sanitized = {
      ...enriched,
      grade: enriched.isGradePublished ? enriched.grade : null,
      feedback: enriched.isGradePublished ? enriched.feedback : null,
    };

    return res.status(200).json({ submission: sanitized });
  } catch (err) {
    logger.error(`getStudentSubmission error: ${err.message}`);
    return res.status(500).json({ error: 'Failed to retrieve submission.' });
  }
};

/**
 * Get all published grades for a student
 * GET /api/student/grades
 */
const getStudentGrades = async (req, res) => {
  try {
    const studentId = req.user.id;

    const gradedSubmissions = await AssignmentSubmission.find({
      student: studentId,
      status: 'graded',
      isGradePublished: true,
    })
      .populate('assignment', 'title maxMarks dueDate course')
      .populate('course', 'title slug')
      .sort({ gradedAt: -1 })
      .lean();

    const formatted = gradedSubmissions.map((s) => ({
      submissionId: s._id,
      assignmentId: s.assignment?._id,
      assignmentTitle: s.assignment?.title || 'Course Assignment',
      courseTitle: s.course?.title || 'Enrolled Course',
      maxMarks: s.assignment?.maxMarks || 100,
      gradeAwarded: s.grade,
      percentage: s.assignment?.maxMarks ? Math.round((s.grade / s.assignment.maxMarks) * 100) : 0,
      feedback: s.feedback,
      isLate: s.isLate,
      gradedAt: s.gradedAt,
    }));

    return res.status(200).json({ grades: formatted });
  } catch (err) {
    logger.error(`getStudentGrades error: ${err.message}`);
    return res.status(500).json({ error: 'Failed to retrieve student grades.' });
  }
};

module.exports = {
  createAssignment,
  getInstructorCourseAssignments,
  getInstructorAssignmentById,
  updateAssignment,
  publishAssignment,
  archiveAssignment,
  deleteAssignment,
  getAssignmentSubmissions,
  getSubmissionById,
  gradeSubmission,
  returnSubmissionForRevision,
  downloadInstructorSubmissionFile,
  getStudentAssignments,
  getCourseAssignments,
  getStudentAssignmentDetails,
  uploadSubmissionFile,
  downloadStudentSubmissionFile,
  submitAssignment,
  getStudentSubmission,
  getStudentGrades,
};
