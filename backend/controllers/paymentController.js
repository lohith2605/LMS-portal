const crypto = require('crypto');
const mongoose = require('mongoose');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const Payment = require('../models/Payment');
const User = require('../models/User');
const {
  sendPaymentReceiptEmail,
  sendInstructorEnrollmentNotificationEmail,
} = require('../services/emailService');
const notificationService = require('../services/notificationService');
const { getRazorpayInstance } = require('../config/razorpay');
const { getClientBaseUrl } = require('../utils/authUtils');
const { logger } = require('../utils/logger');

/**
 * Create a Razorpay payment order for paid course checkout
 * POST /api/payments/create-order
 */
const createOrder = async (req, res) => {
  try {
    const { courseId } = req.body;
    const studentId = req.user.id;

    if (!courseId || !mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({ error: 'A valid course ID is required.' });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ error: 'Course not found.' });
    }

    // Only approved and published courses can be purchased
    if (course.status !== 'published') {
      return res.status(400).json({
        error: 'Cannot purchase unapproved or unpublished courses.',
      });
    }

    // Instructors cannot purchase their own course
    if (course.instructor.toString() === studentId) {
      return res.status(400).json({
        error: 'Instructors cannot purchase their own courses.',
      });
    }

    // If course is free (₹0), redirect to free enrollment flow
    const price = Number(course.price || 0);
    if (price <= 0) {
      return res.status(400).json({
        error: 'This course is free. Please enroll directly without payment.',
        isFree: true,
      });
    }

    // Check if student is already actively enrolled
    const existingEnrollment = await Enrollment.findOne({
      student: studentId,
      course: course._id,
      status: 'active',
    });

    if (existingEnrollment) {
      return res.status(400).json({
        error: 'You are already enrolled in this course.',
      });
    }

    const razorpay = getRazorpayInstance();
    const amountInPaise = Math.round(price * 100);

    // Max 40 characters for Razorpay receipt identifier
    const receipt = `rcpt_${studentId.toString().slice(-6)}_${Date.now().toString().slice(-8)}`;

    const options = {
      amount: amountInPaise,
      currency: 'INR',
      receipt,
      notes: {
        courseId: course._id.toString(),
        studentId: studentId.toString(),
        courseTitle: course.title.slice(0, 40),
      },
    };

    const order = await razorpay.orders.create(options);

    // Persist payment record
    const payment = await Payment.create({
      student: studentId,
      course: course._id,
      razorpayOrderId: order.id,
      amount: price,
      currency: 'INR',
      status: 'created',
      receipt,
    });

    logger.info(`Payment order created: ${order.id} for course "${course.title}" (${course._id}) by ${req.user.email}`);

    return res.status(201).json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID || '',
      course: {
        id: course._id.toString(),
        title: course.title,
        price: course.price,
        thumbnail: course.thumbnail,
      },
      paymentId: payment._id.toString(),
    });
  } catch (error) {
    logger.error(`Create payment order error: ${error.message}`);
    return res.status(500).json({
      error: 'Failed to initiate payment checkout.',
    });
  }
};

/**
 * Verify Razorpay payment signature and confirm course enrollment
 * POST /api/payments/verify
 */
const verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      courseId,
    } = req.body;

    const studentId = req.user.id;

    // Validate presence and type of required fields
    if (
      !razorpay_order_id ||
      typeof razorpay_order_id !== 'string' ||
      !razorpay_payment_id ||
      typeof razorpay_payment_id !== 'string' ||
      !razorpay_signature ||
      typeof razorpay_signature !== 'string' ||
      !courseId ||
      !mongoose.Types.ObjectId.isValid(courseId)
    ) {
      return res.status(400).json({
        error: 'Missing or invalid payment verification parameters.',
      });
    }

    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) {
      logger.error('RAZORPAY_KEY_SECRET is not configured.');
      return res.status(500).json({
        error: 'Payment verification service is currently unconfigured.',
      });
    }

    // Timing-safe HMAC-SHA256 signature verification
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    const expectedBuf = Buffer.from(expectedSignature, 'utf8');
    const receivedBuf = Buffer.from(razorpay_signature, 'utf8');

    if (
      expectedBuf.length !== receivedBuf.length ||
      !crypto.timingSafeEqual(expectedBuf, receivedBuf)
    ) {
      logger.warn(`Signature verification failed for order ${razorpay_order_id} by student ${req.user.email}`);

      // Record failed payment status if order exists
      await Payment.findOneAndUpdate(
        { razorpayOrderId: razorpay_order_id },
        { status: 'failed', failureReason: 'Invalid Razorpay signature' }
      );

      return res.status(400).json({
        error: 'Invalid payment signature. Payment verification rejected.',
      });
    }

    // Locate the payment record
    const payment = await Payment.findOne({ razorpayOrderId: razorpay_order_id });
    if (!payment) {
      return res.status(404).json({
        error: 'Payment order record not found in system.',
      });
    }

    // Verify student ownership
    if (payment.student.toString() !== studentId.toString()) {
      return res.status(403).json({
        error: 'Payment order does not belong to the authenticated user.',
      });
    }

    // Verify course association
    if (payment.course.toString() !== courseId.toString()) {
      return res.status(400).json({
        error: 'Payment order does not match the specified course.',
      });
    }

    // Handle repeated/concurrent verification idempotently
    if (payment.status === 'completed') {
      const existingEnrollment = await Enrollment.findOne({
        student: studentId,
        course: payment.course,
        status: 'active',
      });

      return res.status(200).json({
        message: 'Payment has already been verified and course access granted.',
        isAlreadyEnrolled: true,
        enrollment: existingEnrollment
          ? {
              id: existingEnrollment._id.toString(),
              courseId: payment.course.toString(),
              enrolledAt: existingEnrollment.enrolledAt,
              status: existingEnrollment.status,
            }
          : null,
        payment: {
          id: payment._id.toString(),
          orderId: payment.razorpayOrderId,
          paymentId: payment.razorpayPaymentId,
          amount: payment.amount,
          currency: payment.currency,
          status: payment.status,
        },
      });
    }

    // Verify with Razorpay gateway API when available
    const razorpay = getRazorpayInstance();
    try {
      const gatewayPayment = await razorpay.payments.fetch(razorpay_payment_id);
      if (gatewayPayment) {
        if (gatewayPayment.order_id && gatewayPayment.order_id !== razorpay_order_id) {
          return res.status(400).json({
            error: 'Gateway payment does not match the expected order ID.',
          });
        }
        if (gatewayPayment.currency && gatewayPayment.currency.toUpperCase() !== payment.currency.toUpperCase()) {
          return res.status(400).json({
            error: 'Gateway payment currency mismatch.',
          });
        }
        if (gatewayPayment.amount && gatewayPayment.amount !== Math.round(payment.amount * 100)) {
          return res.status(400).json({
            error: 'Gateway payment amount mismatch.',
          });
        }
        if (gatewayPayment.status === 'failed') {
          payment.status = 'failed';
          payment.failureReason = gatewayPayment.error_description || 'Gateway transaction failed';
          await payment.save();
          return res.status(400).json({
            error: 'Payment was marked as failed by the gateway.',
          });
        }
      }
    } catch (apiErr) {
      // If external fetch fails (e.g. offline mock during test runs), the HMAC verification above ensures authenticity
      logger.info(`Razorpay gateway fetch note: ${apiErr.message}`);
    }

    // Atomically mark payment completed
    payment.status = 'completed';
    payment.razorpayPaymentId = razorpay_payment_id;
    payment.razorpaySignature = razorpay_signature;
    payment.paidAt = new Date();
    await payment.save();

    // Confirm or create course enrollment
    let enrollment = await Enrollment.findOne({
      student: studentId,
      course: payment.course,
    });

    if (enrollment) {
      enrollment.status = 'active';
      enrollment.enrolledAt = new Date();
      enrollment.enrollmentType = 'paid';
      enrollment.payment = payment._id;
      enrollment.amountPaid = payment.amount;
      await enrollment.save();
    } else {
      enrollment = await Enrollment.create({
        student: studentId,
        course: payment.course,
        enrolledAt: new Date(),
        status: 'active',
        completedLessons: [],
        lastAccessedAt: new Date(),
        enrollmentType: 'paid',
        payment: payment._id,
        amountPaid: payment.amount,
      });
    }

    // Trigger email notifications (wrapped safely to avoid blocking or rolling back)
    try {
      const student = await User.findById(studentId).select('name email');
      const course = await Course.findById(payment.course).populate('instructor', 'name email');

      // 1. Student Payment Receipt Email (Duplicate-protected)
      if (!payment.receiptEmailSent && student && student.email) {
        try {
          const clientBaseUrl = getClientBaseUrl();
          const courseUrl = course && course.slug
            ? `${clientBaseUrl}/courses/${course.slug}`
            : `${clientBaseUrl}/student/dashboard?tab=courses`;

          const sent = await sendPaymentReceiptEmail({
            to: student.email,
            studentName: student.name,
            courseTitle: course ? course.title : 'Course Enrollment',
            instructorName: course && course.instructor ? course.instructor.name : 'Course Instructor',
            amount: payment.amount,
            currency: payment.currency,
            paymentDate: payment.paidAt || new Date(),
            razorpayPaymentId: payment.razorpayPaymentId,
            razorpayOrderId: payment.razorpayOrderId,
            receiptId: payment.receipt,
            courseUrl,
          });

          if (sent) {
            payment.receiptEmailSent = true;
            payment.receiptEmailSentAt = new Date();
            payment.receiptEmailError = null;
          } else {
            payment.receiptEmailError = 'Email service not configured or simulation mode';
          }
        } catch (mailErr) {
          logger.warn(`Failed to dispatch payment receipt email to ${student.email}: ${mailErr.message}`);
          payment.receiptEmailSent = false;
          payment.receiptEmailError = mailErr.message;
        }
      }

      // 2. Instructor Enrollment Notification Email (Duplicate-protected)
      if (!payment.instructorNotificationSent) {
        const instructor = course && course.instructor;
        if (instructor && instructor.email) {
          try {
            const clientBaseUrl = getClientBaseUrl();
            const dashboardUrl = `${clientBaseUrl}/instructor/dashboard`;

            const sent = await sendInstructorEnrollmentNotificationEmail({
              to: instructor.email,
              instructorName: instructor.name,
              studentName: student ? student.name : 'Student',
              studentEmail: student ? student.email : '',
              courseTitle: course ? course.title : 'Course',
              enrollmentDate: enrollment.enrolledAt || new Date(),
              enrollmentType: 'paid',
              amount: payment.amount,
              currency: payment.currency,
              dashboardUrl,
            });

            if (sent) {
              payment.instructorNotificationSent = true;
              payment.instructorNotificationSentAt = new Date();
              payment.instructorNotificationError = null;
            } else {
              payment.instructorNotificationError = 'Email service not configured or simulation mode';
            }
          } catch (mailErr) {
            logger.warn(`Failed to dispatch instructor notification email to ${instructor.email}: ${mailErr.message}`);
            payment.instructorNotificationSent = false;
            payment.instructorNotificationError = mailErr.message;
          }
        } else {
          logger.warn(`Instructor email not available for course ${payment.course}; skipping instructor notification.`);
          payment.instructorNotificationError = 'Instructor email not available';
        }
      }

      await payment.save();

      // 3. Real-time & in-app notifications for successful paid enrollment
      try {
        // Notify Student
        await notificationService.createNotification({
          recipient: studentId,
          type: 'course_enrolled',
          title: 'Course Enrollment Confirmed!',
          message: `Your payment was successful and you are now enrolled in "${course ? course.title : 'the course'}".`,
          link: course && course.slug ? `/courses/${course.slug}/learn` : `/courses/${payment.course}/learn`,
          metadata: {
            courseId: payment.course,
            enrollmentId: enrollment._id,
            paymentId: payment._id,
            enrollmentType: 'paid',
            amount: payment.amount,
          },
        });

        // Notify Instructor (if not self-enrollment)
        const instructorId = course && course.instructor ? (course.instructor._id || course.instructor).toString() : '';
        if (instructorId && instructorId !== studentId.toString()) {
          const studentName = student ? student.name : 'A student';
          await notificationService.createNotification({
            recipient: instructorId,
            type: 'course_enrolled',
            title: 'New Student Enrolled',
            message: `${studentName} purchased and enrolled in your course "${course ? course.title : 'Course'}".`,
            link: '/instructor/dashboard',
            metadata: {
              courseId: payment.course,
              studentId,
              enrollmentId: enrollment._id,
              paymentId: payment._id,
              enrollmentType: 'paid',
              amount: payment.amount,
            },
          });
        }
      } catch (inAppErr) {
        logger.warn(`Failed to dispatch in-app enrollment notifications: ${inAppErr.message}`);
      }
    } catch (notifErr) {
      logger.warn(`Notification processing error for payment ${payment._id}: ${notifErr.message}`);
    }

    logger.success(
      `Payment verified & student enrolled: ${req.user.email} -> Course ${payment.course} (₹${payment.amount}, Payment ID: ${razorpay_payment_id})`
    );

    return res.status(200).json({
      message: 'Payment verified successfully. Welcome to the course!',
      enrollment: {
        id: enrollment._id.toString(),
        courseId: payment.course.toString(),
        enrolledAt: enrollment.enrolledAt,
        status: enrollment.status,
      },
      payment: {
        id: payment._id.toString(),
        orderId: payment.razorpayOrderId,
        paymentId: payment.razorpayPaymentId,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
      },
    });
  } catch (error) {
    logger.error(`Verify payment error: ${error.message}`);
    return res.status(500).json({
      error: 'Failed to verify payment and confirm enrollment.',
    });
  }
};

/**
 * Retrieve authenticated student's payment transaction history
 * GET /api/payments/my-payments
 */
const getMyPayments = async (req, res) => {
  try {
    const studentId = req.user.id;

    const payments = await Payment.find({ student: studentId })
      .populate('course', 'title slug thumbnail category level')
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      payments,
      count: payments.length,
    });
  } catch (error) {
    logger.error(`Get my payments error: ${error.message}`);
    return res.status(500).json({
      error: 'Failed to retrieve payment history.',
    });
  }
};

module.exports = {
  createOrder,
  verifyPayment,
  getMyPayments,
};

