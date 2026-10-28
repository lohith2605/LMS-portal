const mongoose = require('mongoose');

const deadlineReminderDeliverySchema = new mongoose.Schema(
  {
    idempotencyKey: {
      type: String,
      required: [true, 'Idempotency key is required'],
      unique: true,
      index: true,
      trim: true,
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Recipient reference is required'],
      index: true,
    },
    assignment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Assignment',
      required: [true, 'Assignment reference is required'],
      index: true,
    },
    reminderType: {
      type: String,
      enum: {
        values: ['24h', '1h'],
        message: '{VALUE} is not a valid reminder interval',
      },
      required: [true, 'Reminder interval type is required'],
    },
    deadlineVersion: {
      type: Date,
      required: [true, 'Deadline version timestamp is required'],
    },
    sentAt: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['pending', 'delivered', 'failed'],
      default: 'pending',
      index: true,
    },
    errorDetails: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
    bufferCommands: false,
  }
);

// Compound index for quick lookups on specific assignment reminders
deadlineReminderDeliverySchema.index({ assignment: 1, recipient: 1, reminderType: 1 });

const DeadlineReminderDelivery = mongoose.model(
  'DeadlineReminderDelivery',
  deadlineReminderDeliverySchema
);

module.exports = DeadlineReminderDelivery;

