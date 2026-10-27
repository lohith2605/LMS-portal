const mongoose = require('mongoose');

const questionOptionSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: [true, 'Option ID is required'],
      trim: true,
    },
    text: {
      type: String,
      required: [true, 'Option text is required'],
      trim: true,
      maxlength: [300, 'Option text cannot exceed 300 characters'],
    },
  },
  { _id: false }
);

const quizQuestionSchema = new mongoose.Schema(
  {
    _id: {
      type: mongoose.Schema.Types.ObjectId,
      default: () => new mongoose.Types.ObjectId(),
    },
    questionText: {
      type: String,
      required: [true, 'Question text is required'],
      trim: true,
      maxlength: [600, 'Question text cannot exceed 600 characters'],
    },
    options: {
      type: [questionOptionSchema],
      validate: {
        validator: function (opts) {
          if (!Array.isArray(opts) || opts.length < 2) return false;
          const ids = opts.map((o) => o.id);
          return new Set(ids).size === ids.length; // Distinct option IDs
        },
        message: 'A question must have at least 2 options with distinct IDs',
      },
    },
    correctOptionId: {
      type: String,
      required: [true, 'Correct option identifier is required'],
      trim: true,
    },
    points: {
      type: Number,
      required: [true, 'Points are required'],
      min: [1, 'Points must be at least 1'],
      default: 1,
    },
    explanation: {
      type: String,
      trim: true,
      default: '',
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  { _id: true, timestamps: true }
);

const quizSchema = new mongoose.Schema(
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
    title: {
      type: String,
      required: [true, 'Quiz title is required'],
      trim: true,
      maxlength: [150, 'Quiz title cannot exceed 150 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
      default: '',
    },
    instructions: {
      type: String,
      trim: true,
      default: 'Select the best answer for each question. You may review your answers before submitting.',
    },
    durationMinutes: {
      type: Number,
      min: [0, 'Duration cannot be negative'],
      default: 0, // 0 = untimed
    },
    passingPercentage: {
      type: Number,
      min: [1, 'Passing score must be at least 1%'],
      max: [100, 'Passing score cannot exceed 100%'],
      default: 70,
    },
    maxAttempts: {
      type: Number,
      min: [0, 'Maximum attempts cannot be negative'],
      default: 3, // 0 = unlimited
    },
    isRequiredForCompletion: {
      type: Boolean,
      default: true,
    },
    status: {
      type: String,
      enum: {
        values: ['draft', 'published', 'archived'],
        message: '{VALUE} is not a valid quiz status',
      },
      default: 'draft',
      index: true,
    },
    questions: [quizQuestionSchema],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for total maximum points
quizSchema.virtual('totalPoints').get(function () {
  if (!this.questions) return 0;
  return this.questions.reduce((sum, q) => sum + (q.points || 1), 0);
});

// Pre-save validation: Ensure published quiz is fully valid
quizSchema.pre('save', function () {
  if (this.status === 'published') {
    if (!this.questions || this.questions.length === 0) {
      throw new Error('A published quiz must contain at least one question.');
    }
    for (const q of this.questions) {
      const validOptionIds = (q.options || []).map((o) => o.id);
      if (!validOptionIds.includes(q.correctOptionId)) {
        throw new Error(
          `Question "${q.questionText}" has an invalid correct option ID "${q.correctOptionId}". Must match one of the options.`
        );
      }
    }
  }
});

// Compound indexes
quizSchema.index({ course: 1, status: 1 });

const Quiz = mongoose.model('Quiz', quizSchema);

module.exports = Quiz;
