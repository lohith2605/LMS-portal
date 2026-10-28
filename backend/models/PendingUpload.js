const mongoose = require('mongoose');

const pendingUploadSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student reference is required'],
      index: true,
    },
    assignment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Assignment',
      required: [true, 'Assignment reference is required'],
      index: true,
    },
    cloudinaryPublicId: {
      type: String,
      required: [true, 'Cloudinary public ID is required'],
      unique: true,
      trim: true,
      index: true,
    },
    originalName: {
      type: String,
      required: [true, 'Original file name is required'],
      trim: true,
      maxlength: [255, 'File name cannot exceed 255 characters'],
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
    status: {
      type: String,
      enum: ['pending', 'consumed', 'expired'],
      default: 'pending',
      index: true,
    },
    submission: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AssignmentSubmission',
      default: null,
      index: true,
    },
    consumedAt: {
      type: Date,
      default: null,
    },
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // 24-hour expiration window
    },
  },
  {
    timestamps: true,
  }
);

// TTL index to automatically purge expired pending upload documents from MongoDB after 24h
pendingUploadSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Compound index for fast lookup of a student's pending uploads on a specific assignment
pendingUploadSchema.index({ student: 1, assignment: 1, status: 1 });

const PendingUpload = mongoose.model('PendingUpload', pendingUploadSchema);

module.exports = PendingUpload;

