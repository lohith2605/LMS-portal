const mongoose = require('mongoose');
const crypto = require('crypto');

const certificateSchema = new mongoose.Schema(
  {
    certificateId: {
      type: String,
      required: [true, 'Certificate ID is required'],
      unique: true,
      uppercase: true,
      trim: true,
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
    enrollment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Enrollment',
      required: [true, 'Enrollment reference is required'],
    },
    issuedAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: {
      type: Date,
      default: Date.now,
    },
    studentSnapshot: {
      name: {
        type: String,
        required: true,
      },
      email: {
        type: String,
        required: true,
      },
    },
    courseSnapshot: {
      title: {
        type: String,
        required: true,
      },
      slug: {
        type: String,
        required: true,
      },
      category: {
        type: String,
        default: 'General',
      },
      level: {
        type: String,
        default: 'All Levels',
      },
      estimatedDuration: {
        type: String,
        default: 'Self-paced',
      },
      instructorName: {
        type: String,
        default: 'LearnSpace Educator',
      },
    },
    finalGrade: {
      type: Number,
      default: 100,
      min: 0,
      max: 100,
    },
    status: {
      type: String,
      enum: ['valid', 'revoked'],
      default: 'valid',
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound index to guarantee only one certificate per student per course
certificateSchema.index({ student: 1, course: 1 }, { unique: true });

// Static helper to generate unique certificate identifier
certificateSchema.statics.generateCertificateId = function () {
  const year = new Date().getFullYear();
  const token = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `LS-${year}-${token.slice(0, 4)}-${token.slice(4, 8)}`;
};

const Certificate = mongoose.model('Certificate', certificateSchema);

module.exports = Certificate;
