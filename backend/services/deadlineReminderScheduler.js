const mongoose = require('mongoose');
const Assignment = require('../models/Assignment');
const AssignmentSubmission = require('../models/AssignmentSubmission');
const Enrollment = require('../models/Enrollment');
const DeadlineReminderDelivery = require('../models/DeadlineReminderDelivery');
const User = require('../models/User');
const Course = require('../models/Course');
const notificationService = require('./notificationService');
const emailService = require('./emailService');
const { logger } = require('../utils/logger');

let schedulerTimer = null;
let isJobRunning = false;

/**
 * Process all approaching assignment deadlines and dispatch idempotent reminders
 */
const processDeadlineReminders = async (currentTime = new Date()) => {
  if (isJobRunning) {
    logger.warn('processDeadlineReminders skipped: previous job execution still in progress');
    return { skipped: true, reason: 'concurrency_lock' };
  }

  isJobRunning = true;
  const now = new Date(currentTime);
  const results = {
    processedAssignments: 0,
    remindersSent: 0,
    emailsSent: 0,
    notificationsSent: 0,
    duplicatesSuppressed: 0,
    completedSkipped: 0,
    retriedEmails: 0,
    errors: [],
  };

  const is24hEnabled = process.env.ASSIGNMENT_REMINDER_24H_ENABLED !== 'false';
  const is1hEnabled = process.env.ASSIGNMENT_REMINDER_1H_ENABLED !== 'false';
  const isEmailEnabled = process.env.ASSIGNMENT_REMINDER_EMAIL_ENABLED !== 'false';
  const isNotificationEnabled = process.env.ASSIGNMENT_REMINDER_NOTIFICATION_ENABLED !== 'false';

  try {
    // 1. Find published assignments with deadlines in the next 24 hours (and in future)
    const windowEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const assignments = await Assignment.find({
      status: 'published',
      dueDate: { $gt: now, $lte: windowEnd },
    }).lean();

    results.processedAssignments = assignments.length;

    for (const assignment of assignments) {
      try {
        if (!assignment.dueDate || isNaN(new Date(assignment.dueDate).getTime())) {
          continue;
        }

        const timeRemainingMs = new Date(assignment.dueDate).getTime() - now.getTime();
        if (timeRemainingMs <= 0) continue;

        const courseId = assignment.course?._id || assignment.course;

        // Resolve course details (for course title and instructor check)
        let courseTitle = assignment.course?.title;
        let courseInstructorId = assignment.course?.instructor?.toString() || assignment.instructor?.toString();
        if (!courseTitle && courseId && typeof Course.find === 'function') {
          const courses = await Course.find({ _id: { $in: [courseId] } });
          if (courses && courses.length > 0) {
            courseTitle = courses[0].title;
            courseInstructorId = courses[0].instructor?.toString();
          }
        }

        // 2. Fetch active enrollments for this course
        const enrollments = await Enrollment.find({
          course: courseId,
          status: { $in: ['active', 'completed'] },
        }).select('student').lean();

        if (!enrollments || enrollments.length === 0) continue;

        // 3. Fetch all completed or submitted attempts for this assignment
        const submissions = await AssignmentSubmission.find({
          assignment: assignment._id,
          status: { $in: ['submitted', 'late', 'graded'] },
        }).select('student').lean();

        const completedStudentSet = new Set(submissions.map((s) => s.student.toString()));

        // Determine eligible reminder intervals (24h and optional 1h)
        const intervalsToCheck = [];
        if (timeRemainingMs <= 1 * 60 * 60 * 1000) {
          if (is1hEnabled) intervalsToCheck.push('1h');
        } else if (timeRemainingMs <= 24 * 60 * 60 * 1000) {
          if (is24hEnabled) intervalsToCheck.push('24h');
        }

        if (intervalsToCheck.length === 0) continue;

        for (const enr of enrollments) {
          const studentId = (enr.student?._id || enr.student)?.toString();
          if (!studentId) continue;

          // Rule: Skip students who have already submitted or completed the assignment
          if (completedStudentSet.has(studentId)) {
            results.completedSkipped++;
            continue;
          }

          // Rule: Exclude the course instructor or admins from receiving student reminders
          let studentUser = null;
          if (typeof User.findById === 'function') {
            studentUser = await User.findById(studentId);
          }
          if (studentUser && (studentUser.role === 'admin' || studentUser.accountStatus === 'suspended')) {
            continue;
          }
          if (studentUser && courseInstructorId && studentUser._id.toString() === courseInstructorId) {
            continue;
          }

          const studentEmail = studentUser?.email || enr.student?.email;
          const studentName = studentUser?.name || enr.student?.name || 'Learner';

          for (const interval of intervalsToCheck) {
            // Stable idempotency key: recipient + assignment + reminderType + dueDate timestamp
            const deadlineTime = new Date(assignment.dueDate).getTime();
            const idempotencyKey = `${studentId}_${assignment._id}_${interval}_${deadlineTime}`;

            let deliveryClaim;
            try {
              // Atomic claim using unique database index
              deliveryClaim = await DeadlineReminderDelivery.create({
                idempotencyKey,
                recipient: studentId,
                assignment: assignment._id,
                reminderType: interval,
                deadlineVersion: assignment.dueDate,
                status: 'pending',
                emailStatus: 'pending',
                notificationStatus: 'pending',
              });
            } catch (claimErr) {
              // E11000 duplicate key error means this reminder was already processed/claimed
              if (claimErr.code === 11000 || claimErr.message?.includes('duplicate key')) {
                results.duplicatesSuppressed++;
                continue;
              }
              throw claimErr;
            }

            // 1. Dispatch in-app notification (if enabled)
            if (isNotificationEnabled) {
              try {
                const timeDesc = interval === '1h' ? 'in less than 1 hour' : 'in 24 hours';
                await notificationService.createNotification({
                  recipient: studentId,
                  type: 'deadline_reminder',
                  title: `Deadline Approaching: ${assignment.title}`,
                  message: `Your assignment "${assignment.title}" is due ${timeDesc}. Be sure to submit your work before the deadline.`,
                  link: `/student/dashboard?tab=assignments&assignmentId=${assignment._id}`,
                  metadata: {
                    assignmentId: assignment._id,
                    courseId,
                    dueDate: assignment.dueDate,
                    reminderType: interval,
                  },
                });

                deliveryClaim.notificationStatus = 'delivered';
                results.notificationsSent++;
              } catch (dispatchErr) {
                logger.error(`Failed to dispatch in-app notification to student ${studentId}: ${dispatchErr.message}`);
                deliveryClaim.notificationStatus = 'failed';
                deliveryClaim.notificationError = dispatchErr.message;
                results.errors.push(dispatchErr.message);
              }
            } else {
              deliveryClaim.notificationStatus = 'skipped';
            }

            // 2. Dispatch automated reminder email (if enabled and student has email)
            if (isEmailEnabled && studentEmail) {
              try {
                const assignmentUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/student/dashboard?tab=assignments&assignmentId=${assignment._id}`;
                const emailSuccess = await emailService.sendAssignmentDeadlineReminderEmail({
                  to: studentEmail,
                  name: studentName,
                  assignmentTitle: assignment.title,
                  courseTitle: courseTitle || 'Your Course',
                  dueDate: assignment.dueDate,
                  reminderType: interval,
                  assignmentUrl,
                });

                if (emailSuccess) {
                  deliveryClaim.emailStatus = 'delivered';
                  deliveryClaim.emailSentAt = new Date();
                  results.emailsSent++;
                } else {
                  deliveryClaim.emailStatus = 'failed';
                  deliveryClaim.emailError = 'Email transport unconfigured or rejected delivery';
                }
              } catch (emailErr) {
                logger.warn(`Failed to dispatch deadline email to ${studentEmail}: ${emailErr.message}`);
                deliveryClaim.emailStatus = 'failed';
                deliveryClaim.emailError = emailErr.message;
              }
            } else if (!studentEmail) {
              deliveryClaim.emailStatus = 'skipped';
            } else {
              deliveryClaim.emailStatus = 'skipped';
            }

            // 3. Persist final delivery status
            if (deliveryClaim.notificationStatus === 'delivered' || deliveryClaim.emailStatus === 'delivered') {
              deliveryClaim.status = 'delivered';
              results.remindersSent++;
            } else {
              deliveryClaim.status = 'failed';
              deliveryClaim.errorDetails = deliveryClaim.notificationError || deliveryClaim.emailError || 'Failed to dispatch reminder';
            }

            await deliveryClaim.save();
          }
        }
      } catch (assignErr) {
        logger.error(`Error processing assignment ${assignment._id} reminders: ${assignErr.message}`);
        results.errors.push(assignErr.message);
      }
    }

    // 4. Bounded retry of previously failed emails (maximum 3 retry attempts per reminder)
    if (isEmailEnabled && typeof DeadlineReminderDelivery.find === 'function' && mongoose.connection.readyState === 1) {
      try {
        const failedClaims = await DeadlineReminderDelivery.find({
          emailStatus: 'failed',
          retryCount: { $lt: 3 },
        })
          .populate('recipient', 'name email role accountStatus')
          .populate('assignment', 'title dueDate status')
          .limit(25);

        for (const claim of failedClaims) {
          if (!claim.assignment || claim.assignment.status !== 'published') continue;
          if (!claim.recipient || !claim.recipient.email) continue;
          if (new Date(claim.assignment.dueDate).getTime() <= now.getTime()) continue;

          try {
            const assignmentUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/student/dashboard?tab=assignments&assignmentId=${claim.assignment._id}`;
            const retried = await emailService.sendAssignmentDeadlineReminderEmail({
              to: claim.recipient.email,
              name: claim.recipient.name,
              assignmentTitle: claim.assignment.title,
              courseTitle: 'Your Course',
              dueDate: claim.assignment.dueDate,
              reminderType: claim.reminderType,
              assignmentUrl,
            });

            if (retried) {
              claim.emailStatus = 'delivered';
              claim.emailSentAt = new Date();
              claim.status = 'delivered';
              results.retriedEmails++;
            } else {
              claim.retryCount = (claim.retryCount || 0) + 1;
            }
            await claim.save();
          } catch (retryErr) {
            claim.retryCount = (claim.retryCount || 0) + 1;
            claim.emailError = retryErr.message;
            await claim.save();
          }
        }
      } catch (retrySweepErr) {
        logger.warn(`Failed email retry sweep error: ${retrySweepErr.message}`);
      }
    }
  } catch (err) {
    logger.error(`processDeadlineReminders fatal error: ${err.message}`);
    results.errors.push(err.message);
  } finally {
    isJobRunning = false;
  }

  return results;
};

/**
 * Start the singleton background scheduler timer
 */
const startDeadlineReminderScheduler = (intervalMs) => {
  if (schedulerTimer) {
    logger.warn('Deadline reminder scheduler already active.');
    return schedulerTimer;
  }

  const defaultIntervalMinutes = Number(process.env.ASSIGNMENT_REMINDER_INTERVAL_MINUTES) || 5;
  const resolvedIntervalMs = intervalMs || defaultIntervalMinutes * 60 * 1000;

  // Run in background on periodic interval
  schedulerTimer = setInterval(async () => {
    try {
      await processDeadlineReminders();
    } catch (err) {
      logger.error(`Background reminder tick failed: ${err.message}`);
    }
  }, resolvedIntervalMs);

  // Prevent scheduler from holding process open on shutdown
  if (schedulerTimer.unref) {
    schedulerTimer.unref();
  }

  logger.info(`Deadline reminder scheduler activated (interval: ${resolvedIntervalMs / 60000} minutes)`);
  return schedulerTimer;
};

/**
 * Stop background scheduler timer cleanly
 */
const stopDeadlineReminderScheduler = () => {
  if (schedulerTimer) {
    clearInterval(schedulerTimer);
    schedulerTimer = null;
    logger.info('Deadline reminder scheduler stopped.');
  }
};

module.exports = {
  processDeadlineReminders,
  startDeadlineReminderScheduler,
  stopDeadlineReminderScheduler,
};
