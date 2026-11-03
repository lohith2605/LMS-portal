const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Announcement title is required'],
      trim: true,
      maxlength: [150, 'Announcement title cannot exceed 150 characters'],
    },
    content: {
      type: String,
      required: [true, 'Announcement content is required'],
      trim: true,
      maxlength: [5000, 'Announcement content cannot exceed 5000 characters'],
    },
    scope: {
      type: String,
      required: [true, 'Announcement scope is required'],
      enum: {
        values: ['course', 'platform'],
        message: '{VALUE} is not a valid announcement scope',
      },
      default: 'course',
      index: true,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: [
        function () {
          return this.scope === 'course';
        },
        'Course reference is required for course announcements.',
      ],
      default: null,
      index: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Announcement author is required'],
      index: true,
    },
    targetRoles: {
      type: [String],
      enum: {
        values: ['student', 'instructor', 'all'],
        message: '{VALUE} is not a valid target role',
      },
      default: ['all'],
    },
    priority: {
      type: String,
      enum: {
        values: ['low', 'normal', 'high', 'urgent'],
        message: '{VALUE} is not a valid priority level',
      },
      default: 'normal',
      index: true,
    },
    isPinned: {
      type: Boolean,
      default: false,
      index: true,
    },
    expiresAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Validate relationship between scope and course reference
announcementSchema.pre('validate', function () {
  if (this.scope === 'course') {
    if (!this.course) {
      this.invalidate('course', 'Course reference is required for course announcements.');
    }
  } else if (this.scope === 'platform') {
    this.course = null;
  }
});

// Indexes for query performance and sorting
announcementSchema.index({ scope: 1, course: 1, isPinned: -1, createdAt: -1 });
announcementSchema.index({ isPinned: -1, createdAt: -1 });
announcementSchema.index({ author: 1, createdAt: -1 });

module.exports = mongoose.model('Announcement', announcementSchema);
