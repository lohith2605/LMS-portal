const mongoose = require('mongoose');

const quizAttemptAnswerSchema = new mongoose.Schema(
  {
    questionId: {
      type: String,
      required: true,
    },
    selectedOptionId: {
      type: String,
      default: '',
    },
    isCorrect: {
      type: Boolean,
      default: false,
    },
    pointsEarned: {
      type: Number,
      default: 0,
    },
  },
  { _id: false }
);

const quizAttemptSchema = new mongoose.Schema(
  {
    quiz: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Quiz',
      required: [true, 'Quiz reference is required'],
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
    attemptNumber: {
      type: Number,
      required: [true, 'Attempt number is required'],
      min: 1,
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    submittedAt: {
      type: Date,
    },
    deadline: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: {
        values: ['in_progress', 'completed', 'timed_out', 'abandoned'],
        message: '{VALUE} is not a valid attempt status',
      },
      default: 'in_progress',
      index: true,
    },
    answers: [quizAttemptAnswerSchema],
    score: {
      type: Number,
      default: 0,
      min: 0,
    },
    maxScore: {
      type: Number,
      default: 0,
      min: 0,
    },
    percentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    passed: {
      type: Boolean,
      default: false,
      index: true,
    },
    quizSnapshot: {
      title: { type: String, default: '' },
      passingPercentage: { type: Number, default: 70 },
      questions: [
        {
          questionId: String,
          questionText: String,
          options: [
            {
              id: String,
              text: String,
            },
          ],
          correctOptionId: String,
          points: Number,
          explanation: String,
        },
      ],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound index
quizAttemptSchema.index({ student: 1, quiz: 1, attemptNumber: 1 }, { unique: true });
quizAttemptSchema.index({ student: 1, course: 1, passed: 1 });

const QuizAttempt = mongoose.model('QuizAttempt', quizAttemptSchema);

module.exports = QuizAttempt;
