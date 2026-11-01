const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide your full name'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Please provide your email address'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        'Please provide a valid email address',
      ],
      index: true,
    },
    password: {
      type: String,
      required: [
        function () {
          return !this.firebaseUid;
        },
        'Please provide a password',
      ],
      minlength: [8, 'Password must be at least 8 characters long'],
      maxlength: [128, 'Password cannot exceed 128 characters'],
      select: false, // Never return password hash in queries by default
    },
    firebaseUid: {
      type: String,
      sparse: true,
      unique: true,
      index: true,
    },
    role: {
      type: String,
      enum: {
        values: ['student', 'instructor', 'admin'],
        message: '{VALUE} is not a valid user role',
      },
      default: 'student',
    },
    accountStatus: {
      type: String,
      enum: {
        values: ['active', 'pending', 'suspended'],
        message: '{VALUE} is not a valid account status',
      },
      default: 'active',
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationTokenHash: {
      type: String,
      select: false,
    },
    emailVerificationExpiresAt: {
      type: Date,
      select: false,
    },
    passwordChangedAt: {
      type: Date,
      select: false,
    },
    passwordResetTokenHash: {
      type: String,
      select: false,
    },
    passwordResetExpiresAt: {
      type: Date,
      select: false,
    },
    lastLoginAt: {
      type: Date,
    },
    avatar: {
      url: {
        type: String,
        default: null,
      },
      publicId: {
        type: String,
        default: null,
      },
    },
    mfa: {
      enabled: {
        type: Boolean,
        default: false,
      },
      enforced: {
        type: Boolean,
        default: false,
      },
      preferredMethod: {
        type: String,
        enum: ['totp', 'email_otp'],
        default: 'totp',
      },
      totp: {
        secret: {
          type: String,
          select: false, // Encrypted base32 secret
        },
        pendingSecret: {
          type: String,
          select: false, // Temporary encrypted secret during setup
        },
        verified: {
          type: Boolean,
          default: false,
        },
        verifiedAt: {
          type: Date,
        },
        lastUsedTimeStep: {
          type: Number,
          select: false,
        },
      },
      emailOtp: {
        codeHash: {
          type: String,
          select: false,
        },
        expiresAt: {
          type: Date,
          select: false,
        },
        lastSentAt: {
          type: Date,
        },
        verified: {
          type: Boolean,
          default: false,
        },
      },
      recoveryCodes: [
        {
          codeHash: {
            type: String,
            select: false,
          },
          used: {
            type: Boolean,
            default: false,
          },
          usedAt: {
            type: Date,
          },
        },
      ],
      currentChallenge: {
        challengeId: {
          type: String,
          select: false,
        },
        method: {
          type: String,
        },
        expiresAt: {
          type: Date,
          select: false,
        },
        used: {
          type: Boolean,
          default: false,
        },
      },
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        delete ret.password;
        delete ret.passwordResetTokenHash;
        delete ret.passwordResetExpiresAt;
        delete ret.emailVerificationTokenHash;
        delete ret.emailVerificationExpiresAt;
        delete ret.__v;

        // Sanitize MFA internals
        if (ret.mfa) {
          if (ret.mfa.totp) {
            delete ret.mfa.totp.secret;
            delete ret.mfa.totp.pendingSecret;
            delete ret.mfa.totp.lastUsedTimeStep;
          }
          if (ret.mfa.emailOtp) {
            delete ret.mfa.emailOtp.codeHash;
            delete ret.mfa.emailOtp.expiresAt;
          }
          if (Array.isArray(ret.mfa.recoveryCodes)) {
            ret.mfa.recoveryCodesRemaining = ret.mfa.recoveryCodes.filter((rc) => !rc.used).length;
            ret.mfa.totalRecoveryCodes = ret.mfa.recoveryCodes.length;
            delete ret.mfa.recoveryCodes;
          }
          delete ret.mfa.currentChallenge;
        }

        return ret;
      },
    },
  }
);

// Pre-save hook: Hash password securely if modified
userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();

  // Generate salt and hash with cost factor 12
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);

  // If password was updated on existing document, track passwordChangedAt
  if (!this.isNew) {
    this.passwordChangedAt = new Date(Date.now() - 1000);
  }

  next();
});

/**
 * Compare candidate password with stored hash
 * @param {string} candidatePassword
 * @returns {Promise<boolean>}
 */
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!candidatePassword || !this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

/**
 * Check if password was changed after a JWT token was issued
 * @param {number} jwtIat - Token issued-at timestamp in seconds
 * @returns {boolean}
 */
userSchema.methods.changedPasswordAfter = function (jwtIat) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
    return jwtIat < changedTimestamp;
  }
  return false;
};

/**
 * Generate cryptographically secure random password reset token
 * Stores SHA-256 hash in database with 15-minute expiration
 * @returns {string} Raw unhashed token to deliver to user
 */
userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.passwordResetTokenHash = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  this.passwordResetExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

  return resetToken;
};

/**
 * Generate cryptographically secure email verification token
 * @returns {string} Raw token
 */
userSchema.methods.createEmailVerificationToken = function () {
  const verifyToken = crypto.randomBytes(32).toString('hex');

  this.emailVerificationTokenHash = crypto
    .createHash('sha256')
    .update(verifyToken)
    .digest('hex');

  this.emailVerificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  return verifyToken;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
