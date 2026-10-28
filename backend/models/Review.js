const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Course reference is required'],
      index: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student reference is required'],
      index: true,
    },
    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: [1, 'Rating must be at least 1 star'],
      max: [5, 'Rating cannot exceed 5 stars'],
      validate: {
        validator: Number.isInteger,
        message: 'Rating must be an integer between 1 and 5',
      },
    },
    reviewText: {
      type: String,
      trim: true,
      default: '',
      maxlength: [1000, 'Review text cannot exceed 1000 characters'],
    },
    moderationStatus: {
      type: String,
      enum: {
        values: ['approved', 'hidden', 'flagged'],
        message: '{VALUE} is not a valid moderation status',
      },
      default: 'approved',
      index: true,
    },
    moderatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    moderatedAt: {
      type: Date,
      default: null,
    },
    moderationReason: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// One review per student per course enforced at database level
reviewSchema.index({ course: 1, student: 1 }, { unique: true });

// Compound indexes for high-performance public sorting and pagination
reviewSchema.index({ course: 1, moderationStatus: 1, createdAt: -1 });
reviewSchema.index({ course: 1, moderationStatus: 1, rating: -1, createdAt: -1 });
reviewSchema.index({ course: 1, moderationStatus: 1, rating: 1, createdAt: -1 });

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;

