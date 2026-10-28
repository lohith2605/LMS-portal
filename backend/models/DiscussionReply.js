const mongoose = require('mongoose');

const discussionReplySchema = new mongoose.Schema(
  {
    discussion: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Discussion',
      required: [true, 'Discussion reference is required'],
      index: true,
    },
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
    body: {
      type: String,
      required: [true, 'Reply content is required'],
      trim: true,
      minlength: [2, 'Reply must be at least 2 characters long'],
      maxlength: [5000, 'Reply cannot exceed 5000 characters'],
    },
    isAccepted: {
      type: Boolean,
      default: false,
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

// Compound indexes for chronological retrieval, accepted answer prioritization, and author filtering
discussionReplySchema.index({ discussion: 1, isDeleted: 1, isAccepted: -1, createdAt: 1 });
discussionReplySchema.index({ discussion: 1, isDeleted: 1, createdAt: 1 });
discussionReplySchema.index({ course: 1, author: 1 });

const DiscussionReply = mongoose.model('DiscussionReply', discussionReplySchema);

module.exports = DiscussionReply;

