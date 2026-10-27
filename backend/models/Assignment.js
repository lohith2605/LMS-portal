const mongoose = require('mongoose');

const assignmentAttachmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Attachment name is required'],
      trim: true,
      maxlength: [150, 'Attachment name cannot exceed 150 characters'],
    },
    url: {
      type: String,
      required: [true, 'Attachment URL is required'],
      trim: true,
    },
    fileType: {
      type: String,
      trim: true,
      default: 'document',
    },
    sizeBytes: {
      type: Number,
      default: 0,
    },
  },
  { _id: true }
);

const assignmentSchema = new mongoose.Schema(
  {
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Course reference is required'],
      index: true,
    },
    instructor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Instructor reference is required'],
      index: true,
    },
    sectionId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    lessonId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    title: {
      type: String,
      required: [true, 'Assignment title is required'],
      trim: true,
      maxlength: [200, 'Assignment title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      default: '',
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    instructions: {
      type: String,
      required: [true, 'Assignment instructions are required'],
      trim: true,
    },
    maxMarks: {
      type: Number,
      required: [true, 'Maximum marks are required'],
      min: [1, 'Maximum marks must be at least 1'],
      max: [1000, 'Maximum marks cannot exceed 1000'],
      default: 100,
    },
    dueDate: {
      type: Date,
      required: [true, 'Due date is required'],
      validate: {
        validator: function (value) {
          return !isNaN(new Date(value).getTime());
        },
        message: 'A valid due date is required',
      },
    },
    submissionTypes: {
      type: [String],
      enum: {
        values: ['text', 'file'],
        message: '{VALUE} is not a valid submission type',
      },
      default: ['text'],
      validate: {
        validator: function (types) {
          return Array.isArray(types) && types.length > 0;
        },
        message: 'At least one submission type (text or file) must be enabled',
      },
    },
    allowedFileTypes: {
      type: [String],
      default: ['pdf', 'zip', 'docx', 'png', 'jpg'],
    },
    maxFileSizeMB: {
      type: Number,
      min: [1, 'Max file size must be at least 1 MB'],
      max: [50, 'Max file size cannot exceed 50 MB'],
      default: 10,
    },
    allowLateSubmissions: {
      type: Boolean,
      default: true,
    },
    latePenaltyPercent: {
      type: Number,
      min: [0, 'Late penalty cannot be negative'],
      max: [100, 'Late penalty cannot exceed 100%'],
      default: 0,
    },
    attachments: {
      type: [assignmentAttachmentSchema],
      default: [],
    },
    status: {
      type: String,
      enum: {
        values: ['draft', 'published', 'archived'],
        message: '{VALUE} is not a valid assignment status',
      },
      default: 'draft',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for fast retrieval and course filtering
assignmentSchema.index({ course: 1, status: 1, dueDate: 1 });
assignmentSchema.index({ instructor: 1, status: 1 });

// Pre-save validation: Check that published assignments have required fields
assignmentSchema.pre('save', function (next) {
  if (this.status === 'published') {
    if (!this.title || !this.title.trim()) {
      return next(new Error('A published assignment must have a valid title.'));
    }
    if (!this.instructions || !this.instructions.trim()) {
      return next(new Error('A published assignment must have instructions.'));
    }
    if (!this.dueDate) {
      return next(new Error('A published assignment must have a valid due date.'));
    }
    if (!this.maxMarks || this.maxMarks <= 0) {
      return next(new Error('A published assignment must have maximum marks greater than zero.'));
    }
  }
  next();
});

const Assignment = mongoose.model('Assignment', assignmentSchema);

module.exports = Assignment;
