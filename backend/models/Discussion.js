const mongoose = require('mongoose');

const discussionSchema = new mongoose.Schema(
  {
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Course reference is required'],
      index: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Author reference is required'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Discussion title is required'],
      trim: true,
      minlength: [5, 'Title must be at least 5 characters long'],
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    body: {
      type: String,
      required: [true, 'Discussion content is required'],
      trim: true,
      minlength: [10, 'Content must be at least 10 characters long'],
      maxlength: [10000, 'Content cannot exceed 10000 characters'],
    },
    type: {
      type: String,
      enum: {
        values: ['question', 'discussion'],
        message: '{VALUE} is not a valid discussion type',
      },
      default: 'question',
      index: true,
    },
    isPinned: {
      type: Boolean,
      default: false,
      index: true,
    },
    pinnedAt: {
      type: Date,
      default: null,
    },
    pinnedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    isLocked: {
      type: Boolean,
      default: false,
      index: true,
    },
    lockedAt: {
      type: Date,
      default: null,
    },
    lockedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    isAnswered: {
      type: Boolean,
      default: false,
      index: true,
    },
    acceptedAnswer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DiscussionReply',
      default: null,
    },
    acceptedAt: {
      type: Date,
      default: null,
    },
    acceptedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    replyCount: {
      type: Number,
      default: 0,
      min: [0, 'Reply count cannot be negative'],
    },
    lastActivityAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound indexes for performant listing, filtering, and sorting
discussionSchema.index({ course: 1, isDeleted: 1, isPinned: -1, lastActivityAt: -1 });
discussionSchema.index({ course: 1, isDeleted: 1, isPinned: -1, createdAt: -1 });
discussionSchema.index({ course: 1, isDeleted: 1, type: 1, isAnswered: 1 });
discussionSchema.index({ course: 1, author: 1 });

const Discussion = mongoose.model('Discussion', discussionSchema);

module.exports = Discussion;

