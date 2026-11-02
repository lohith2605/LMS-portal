const mongoose = require('mongoose');

const qualifyingActivitySchema = new mongoose.Schema(
  {
    activityType: {
      type: String,
      enum: ['lesson_completion', 'quiz_completion', 'assignment_submission', 'study_interval'],
      required: true,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
    },
    lessonId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    completedAt: {
      type: Date,
      default: Date.now,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({}),
    },
  },
  { _id: true }
);

const dailyStudySummarySchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student reference is required'],
      index: true,
    },
    dateKey: {
      type: String,
      required: [true, 'Date key (YYYY-MM-DD) is required'],
      match: [/^\d{4}-\d{2}-\d{2}$/, 'dateKey must be in YYYY-MM-DD format'],
      index: true,
    },
    timezone: {
      type: String,
      default: 'Asia/Kolkata',
      trim: true,
    },
    activeStudySeconds: {
      type: Number,
      default: 0,
      min: [0, 'Active study seconds cannot be negative'],
    },
    qualifyingActivitiesCount: {
      type: Number,
      default: 0,
      min: [0, 'Qualifying activities count cannot be negative'],
      index: true,
    },
    qualifyingActivities: [qualifyingActivitySchema],
    coursesStudied: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Unique compound index: One summary per student per local calendar day
dailyStudySummarySchema.index({ student: 1, dateKey: 1 }, { unique: true });

const DailyStudySummary = mongoose.model('DailyStudySummary', dailyStudySummarySchema);

module.exports = DailyStudySummary;

