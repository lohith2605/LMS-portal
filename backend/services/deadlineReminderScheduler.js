const mongoose = require('mongoose');
const Assignment = require('../models/Assignment');
const AssignmentSubmission = require('../models/AssignmentSubmission');
const Enrollment = require('../models/Enrollment');
const DeadlineReminderDelivery = require('../models/DeadlineReminderDelivery');
const notificationService = require('./notificationService');
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
    duplicatesSuppressed: 0,
    completedSkipped: 0,
    errors: [],
  };

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
        const timeRemainingMs = new Date(assignment.dueDate).getTime() - now.getTime();
        const courseId = assignment.course?._id || assignment.course;

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
          intervalsToCheck.push('1h');
        } else if (timeRemainingMs <= 24 * 60 * 60 * 1000) {
          intervalsToCheck.push('24h');
        }

        for (const enr of enrollments) {
          const studentId = (enr.student?._id || enr.student)?.toString();
          if (!studentId) continue;

          // Rule: Skip students who have already submitted or completed the assignment
          if (completedStudentSet.has(studentId)) {
            results.completedSkipped++;
            continue;
          }

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
              });
            } catch (claimErr) {
              // E11000 duplicate key error means this reminder was already processed/claimed
              if (claimErr.code === 11000 || claimErr.message?.includes('duplicate key')) {
                results.duplicatesSuppressed++;
                continue;
              }
              throw claimErr;
            }

            // Dispatch persistent notification through Phase 10 engine
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

              deliveryClaim.status = 'delivered';
              await deliveryClaim.save();
              results.remindersSent++;
            } catch (dispatchErr) {
              logger.error(`Failed to dispatch reminder to student ${studentId}: ${dispatchErr.message}`);
              deliveryClaim.status = 'failed';
              deliveryClaim.errorDetails = dispatchErr.message;
              await deliveryClaim.save();
              results.errors.push(dispatchErr.message);
            }
          }
        }
      } catch (assignErr) {
        logger.error(`Error processing assignment ${assignment._id} reminders: ${assignErr.message}`);
        results.errors.push(assignErr.message);
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
const startDeadlineReminderScheduler = (intervalMs = 15 * 60 * 1000) => {
  if (schedulerTimer) {
    logger.warn('Deadline reminder scheduler already active.');
    return schedulerTimer;
  }

  // Run in background on periodic interval
  schedulerTimer = setInterval(async () => {
    try {
      await processDeadlineReminders();
    } catch (err) {
      logger.error(`Background reminder tick failed: ${err.message}`);
    }
  }, intervalMs);

  // Prevent scheduler from holding process open on shutdown
  if (schedulerTimer.unref) {
    schedulerTimer.unref();
  }

  logger.info(`Deadline reminder scheduler activated (interval: ${intervalMs / 60000} minutes)`);
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

