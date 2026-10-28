const mongoose = require('mongoose');

const submittedFileSchema = new mongoose.Schema(
  {
    originalName: {
      type: String,
      required: [true, 'File name is required'],
      trim: true,
      maxlength: [255, 'File name cannot exceed 255 characters'],
    },
    cloudinaryPublicId: {
      type: String,
      trim: true,
      default: null,
    },
    resourceType: {
      type: String,
      enum: ['raw', 'image', 'auto', 'video'],
      default: 'raw',
    },
    deliveryType: {
      type: String,
      default: 'authenticated',
    },
    format: {
      type: String,
      trim: true,
      default: '',
    },
    storageProvider: {
      type: String,
      enum: ['cloudinary', 'base64', 'external'],
      default: 'cloudinary',
    },
    fileUrl: {
      type: String,
      trim: true,
      default: '',
    },
    fileSize: {
      type: Number,
      required: [true, 'File size in bytes is required'],
      min: [1, 'File size must be greater than zero'],
    },
    mimeType: {
      type: String,
      trim: true,
      default: 'application/octet-stream',
    },
    checksum: {
      type: String,
      trim: true,
      default: '',
    },
    migratedAt: {
      type: Date,
      default: null,
    },
    migratedFrom: {
      type: String,
      enum: ['base64', 'external', null],
      default: null,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const submissionVersionHistorySchema = new mongoose.Schema(
  {
    version: {
      type: Number,
      required: true,
    },
    submissionText: {
      type: String,
      default: '',
    },
    submittedFiles: {
      type: [submittedFileSchema],
      default: [],
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
    isLate: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

const assignmentSubmissionSchema = new mongoose.Schema(
  {
    assignment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Assignment',
      required: [true, 'Assignment reference is required'],
      index: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student reference is required'],
      index: true,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Course reference is required'],
      index: true,
    },
    submissionText: {
      type: String,
      trim: true,
      default: '',
      maxlength: [10000, 'Submission text cannot exceed 10000 characters'],
    },
    submittedFiles: {
      type: [submittedFileSchema],
      default: [],
    },
    status: {
      type: String,
      enum: {
        values: ['submitted', 'late', 'graded', 'returned_for_revision'],
        message: '{VALUE} is not a valid submission status',
      },
      default: 'submitted',
      index: true,
    },
    isLate: {
      type: Boolean,
      default: false,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
    version: {
      type: Number,
      default: 1,
      min: [1, 'Version must be at least 1'],
    },
    history: {
      type: [submissionVersionHistorySchema],
      default: [],
    },
    grade: {
      type: Number,
      min: [0, 'Awarded grade cannot be negative'],
      default: null,
    },
    appliedLatePenalty: {
      type: Number,
      default: 0,
      min: [0, 'Late penalty cannot be negative'],
    },
    feedback: {
      type: String,
      trim: true,
      default: '',
      maxlength: [3000, 'Feedback cannot exceed 3000 characters'],
    },
    gradedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    gradedAt: {
      type: Date,
      default: null,
    },
    isGradePublished: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Enforce unique compound index so a student has a single active submission record per assignment
assignmentSubmissionSchema.index({ student: 1, assignment: 1 }, { unique: true });
assignmentSubmissionSchema.index({ assignment: 1, status: 1 });
assignmentSubmissionSchema.index({ course: 1, student: 1 });

const AssignmentSubmission = mongoose.model('AssignmentSubmission', assignmentSubmissionSchema);

module.exports = AssignmentSubmission;
