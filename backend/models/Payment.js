const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student is required'],
      index: true,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Course is required'],
      index: true,
    },
    razorpayOrderId: {
      type: String,
      required: [true, 'Razorpay order ID is required'],
      unique: true,
      trim: true,
      index: true,
    },
    razorpayPaymentId: {
      type: String,
      trim: true,
      sparse: true,
      index: true,
    },
    razorpaySignature: {
      type: String,
      trim: true,
      default: '',
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0, 'Amount cannot be negative'],
    },
    currency: {
      type: String,
      default: 'INR',
      trim: true,
      uppercase: true,
    },
    status: {
      type: String,
      enum: ['created', 'completed', 'failed', 'refunded'],
      default: 'created',
      index: true,
    },
    failureReason: {
      type: String,
      default: '',
      trim: true,
    },
    receipt: {
      type: String,
      trim: true,
      default: '',
    },
    paidAt: {
      type: Date,
      default: null,
    },
    receiptEmailSent: {
      type: Boolean,
      default: false,
      index: true,
    },
    receiptEmailSentAt: {
      type: Date,
      default: null,
    },
    receiptEmailError: {
      type: String,
      default: null,
      trim: true,
    },
    instructorNotificationSent: {
      type: Boolean,
      default: false,
      index: true,
    },
    instructorNotificationSentAt: {
      type: Date,
      default: null,
    },
    instructorNotificationError: {
      type: String,
      default: null,
      trim: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

paymentSchema.index({ student: 1, course: 1, status: 1 });

const Payment = mongoose.model('Payment', paymentSchema);

module.exports = Payment;
