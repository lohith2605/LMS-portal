const mongoose = require('mongoose');
const crypto = require('crypto');

const sessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.Mixed,
      ref: 'User',
      required: [true, 'Session must belong to a user'],
      index: true,
    },
    role: {
      type: String,
      enum: ['student', 'instructor', 'admin'],
      required: [true, 'Session role is required'],
    },
    sessionTokenId: {
      type: String,
      required: [true, 'Session token ID is required'],
      unique: true,
      index: true,
    },
    device: {
      browser: {
        type: String,
        default: 'Unknown Browser',
      },
      os: {
        type: String,
        default: 'Unknown OS',
      },
      type: {
        type: String,
        enum: ['desktop', 'mobile', 'tablet', 'unknown'],
        default: 'desktop',
      },
    },
    userAgent: {
      type: String,
      maxlength: [500, 'User agent metadata cannot exceed 500 characters'],
      default: 'Unknown User-Agent',
    },
    ipAddress: {
      type: String,
      default: 'Unknown IP',
    },
    lastActiveAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    idleExpiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    absoluteExpiresAt: {
      type: Date,
      required: true,
    },
    revokedAt: {
      type: Date,
      default: null,
      index: true,
    },
    revokeReason: {
      type: String,
      enum: [
        'logout',
        'user_revoked',
        'revoked_others',
        'password_changed',
        'account_suspended',
        'idle_timeout',
        'inactivity_timeout',
        'absolute_timeout',
        'admin_action',
        null,
      ],
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        ret.id = ret._id.toString();
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Compound index for high-performance active session lookups per user
sessionSchema.index({ userId: 1, revokedAt: 1, idleExpiresAt: 1, absoluteExpiresAt: 1 });

// TTL index for safe archival cleanup: purges historical session records 30 days after absolute expiry
sessionSchema.index({ absoluteExpiresAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

/**
 * Check if the session is currently valid and active
 * @returns {boolean}
 */
sessionSchema.methods.isActive = function () {
  if (this.revokedAt) return false;
  const now = new Date();
  if (now > this.idleExpiresAt) return false;
  if (now > this.absoluteExpiresAt) return false;
  return true;
};

/**
 * Revoke the session with a specific reason
 * @param {string} reason
 * @returns {Promise<Session>}
 */
sessionSchema.methods.revoke = async function (reason = 'user_revoked') {
  this.revokedAt = new Date();
  this.revokeReason = reason;
  return this.save();
};

/**
 * Helper to generate a cryptographically secure random session token ID
 * @returns {string} 64-character hex string
 */
sessionSchema.statics.generateSessionTokenId = function () {
  return crypto.randomBytes(32).toString('hex');
};

const Session = mongoose.model('Session', sessionSchema);

module.exports = Session;
