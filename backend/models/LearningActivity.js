const mongoose = require('mongoose');

const learningActivitySchema = new mongoose.Schema(
  {
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
    sectionId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    lessonId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      index: true,
    },
    activityType: {
      type: String,
      required: [true, 'Activity type is required'],
      enum: {
        values: [
          'lesson_completion',
          'study_interval',
          'quiz_completion',
          'assignment_submission',
        ],
        message: '{VALUE} is not a valid activity type',
      },
      index: true,
    },
    occurredAt: {
      type: Date,
      default: Date.now,
      required: true,
      index: true,
    },
    localDateKey: {
      type: String,
      required: true,
      match: [/^\d{4}-\d{2}-\d{2}$/, 'localDateKey must be in YYYY-MM-DD format'],
      index: true,
    },
    durationSeconds: {
      type: Number,
      default: 0,
      min: [0, 'Duration cannot be negative'],
    },
    idempotencyKey: {
      type: String,
      trim: true,
      index: true,
    },
    timezone: {
      type: String,
      default: 'Asia/Kolkata',
      trim: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({}),
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for user history queries by date
learningActivitySchema.index({ student: 1, localDateKey: 1, activityType: 1 });

// Compound index for verifying single completion per lesson
learningActivitySchema.index(
  { student: 1, course: 1, lessonId: 1, activityType: 1 },
  { sparse: true }
);

// Compound unique index for interval idempotency when key is present
learningActivitySchema.index(
  { student: 1, idempotencyKey: 1 },
  { unique: true, sparse: true }
);

const LearningActivity = mongoose.model('LearningActivity', learningActivitySchema);

module.exports = LearningActivity;

