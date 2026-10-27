const mongoose = require('mongoose');

const lessonSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Lesson title is required'],
      trim: true,
      maxlength: [150, 'Lesson title cannot exceed 150 characters'],
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    contentType: {
      type: String,
      enum: {
        values: ['video', 'text', 'document'],
        message: '{VALUE} is not a valid lesson content type',
      },
      default: 'video',
    },
    videoUrl: {
      type: String,
      trim: true,
      default: '',
    },
    textContent: {
      type: String,
      default: '',
    },
    attachmentUrl: {
      type: String,
      trim: true,
      default: '',
    },
    duration: {
      type: String,
      trim: true,
      default: '10 mins',
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
    isPublished: {
      type: Boolean,
      default: true,
    },
  },
  { _id: true, timestamps: true }
);

const sectionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Section title is required'],
      trim: true,
      maxlength: [150, 'Section title cannot exceed 150 characters'],
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
    lessons: [lessonSchema],
  },
  { _id: true, timestamps: true }
);

const courseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Course title is required'],
      trim: true,
      maxlength: [150, 'Course title cannot exceed 150 characters'],
    },
    slug: {
      type: String,
      required: [true, 'Course slug is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    summary: {
      type: String,
      required: [true, 'Course summary is required'],
      trim: true,
      maxlength: [300, 'Summary cannot exceed 300 characters'],
    },
    description: {
      type: String,
      required: [true, 'Course full description is required'],
      trim: true,
    },
    instructor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Course must have an assigned instructor'],
      index: true,
    },
    category: {
      type: String,
      enum: ['Development', 'Design', 'Data', 'Business', 'Other'],
      default: 'Development',
      index: true,
    },
    level: {
      type: String,
      enum: ['Beginner', 'Intermediate', 'Advanced', 'All Levels'],
      default: 'Intermediate',
      index: true,
    },
    thumbnail: {
      type: String,
      trim: true,
      default: '',
    },
    learningObjectives: {
      type: [String],
      default: [],
    },
    prerequisites: {
      type: String,
      trim: true,
      default: '',
    },
    intendedAudience: {
      type: String,
      trim: true,
      default: '',
    },
    estimatedDuration: {
      type: String,
      trim: true,
      default: '6 weeks',
    },
    language: {
      type: String,
      trim: true,
      default: 'English',
    },
    status: {
      type: String,
      enum: ['draft', 'pending_review', 'published', 'rejected', 'archived'],
      default: 'draft',
      index: true,
    },
    rejectionReason: {
      type: String,
      default: '',
      trim: true,
    },
    publishedAt: {
      type: Date,
    },
    sections: [sectionSchema],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for total lessons count across all sections
courseSchema.virtual('totalLessonsCount').get(function () {
  if (!this.sections) return 0;
  return this.sections.reduce((acc, sec) => acc + (sec.lessons ? sec.lessons.length : 0), 0);
});

// Helper static to generate URL-safe unique slug
courseSchema.statics.generateSlug = async function (title, currentCourseId = null) {
  let baseSlug = title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (!baseSlug) {
    baseSlug = `course-${Date.now()}`;
  }

  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const existing = await this.findOne({ slug });
    if (!existing || (currentCourseId && existing._id.toString() === currentCourseId.toString())) {
      break;
    }
    slug = `${baseSlug}-${counter++}`;
  }

  return slug;
};

const Course = mongoose.model('Course', courseSchema);

module.exports = Course;
