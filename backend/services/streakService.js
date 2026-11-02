const mongoose = require('mongoose');
const LearningActivity = require('../models/LearningActivity');
const DailyStudySummary = require('../models/DailyStudySummary');
const Enrollment = require('../models/Enrollment');
const Course = require('../models/Course');
const User = require('../models/User');
const { logger } = require('../utils/logger');

const DEFAULT_TIMEZONE = 'Asia/Kolkata';
const MAX_INTERVAL_SECONDS = 300; // Maximum allowed single study heartbeat duration (5 mins)
const MIN_INTERVAL_SECONDS = 1;

/**
 * Validate whether a string is a recognized IANA timezone identifier
 * @param {string} tz
 * @returns {boolean}
 */
const isValidTimeZone = (tz) => {
  if (!tz || typeof tz !== 'string') return false;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
};

/**
 * Return local calendar date key 'YYYY-MM-DD' for a date in a specified timezone
 * @param {Date|number|string} date
 * @param {string} timeZone
 * @returns {string}
 */
const getLocalDateKey = (date = new Date(), timeZone = DEFAULT_TIMEZONE) => {
  const validTz = isValidTimeZone(timeZone) ? timeZone : DEFAULT_TIMEZONE;
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) {
    throw new Error('Invalid date provided to getLocalDateKey');
  }
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: validTz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(d);
};

/**
 * Convert YYYY-MM-DD to UTC timestamp at midnight
 * @param {string} dateKey
 * @returns {number}
 */
const dateKeyToUtcTime = (dateKey) => {
  const [year, month, day] = dateKey.split('-').map(Number);
  return Date.UTC(year, month - 1, day);
};

/**
 * Add or subtract days from a YYYY-MM-DD date key deterministically
 * @param {string} dateKey
 * @param {number} offsetDays
 * @returns {string}
 */
const getOffsetDateKey = (dateKey, offsetDays) => {
  const utc = dateKeyToUtcTime(dateKey) + offsetDays * 86400000;
  const d = new Date(utc);
  return d.toISOString().slice(0, 10);
};

/**
 * Compute the difference in whole calendar days between two YYYY-MM-DD dates
 * @param {string} dateKey1
 * @param {string} dateKey2
 * @returns {number}
 */
const getDaysDifference = (dateKey1, dateKey2) => {
  return Math.round((dateKeyToUtcTime(dateKey1) - dateKeyToUtcTime(dateKey2)) / 86400000);
};

/**
 * Pure streak calculation algorithm
 *
 * Rules:
 * 1. A student qualifies for a streak day by having qualifyingActivitiesCount > 0 on that local calendar day.
 * 2. If student has a qualifying activity today, current streak = consecutive qualifying days ending today.
 * 3. If no qualifying activity today, but qualified yesterday, current streak = consecutive qualifying days ending yesterday.
 * 4. If latest qualifying activity is older than yesterday, current streak = 0.
 * 5. Longest streak = maximum consecutive run of qualifying days in history.
 * 6. Missing a calendar day breaks a streak. Multiple activities on same day count as 1 streak day.
 *
 * @param {string[]} qualifyingDateKeys - Array of unique local date keys (YYYY-MM-DD)
 * @param {string} todayDateKey - The student's local date key for today (YYYY-MM-DD)
 * @returns {{ currentStreak: number, longestStreak: number, todayQualified: boolean, lastQualifiedDate: string|null }}
 */
const computeStreaksFromDates = (qualifyingDateKeys = [], todayDateKey) => {
  if (!todayDateKey || typeof todayDateKey !== 'string') {
    todayDateKey = getLocalDateKey(new Date(), DEFAULT_TIMEZONE);
  }

  const uniqueSortedDates = Array.from(new Set(qualifyingDateKeys))
    .filter((d) => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d))
    .sort((a, b) => dateKeyToUtcTime(a) - dateKeyToUtcTime(b));

  if (uniqueSortedDates.length === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      todayQualified: false,
      lastQualifiedDate: null,
    };
  }

  const dateSet = new Set(uniqueSortedDates);
  const yesterdayDateKey = getOffsetDateKey(todayDateKey, -1);
  const todayQualified = dateSet.has(todayDateKey);

  // 1. Calculate Current Streak
  let currentStreak = 0;
  if (todayQualified) {
    let checkDate = todayDateKey;
    while (dateSet.has(checkDate)) {
      currentStreak++;
      checkDate = getOffsetDateKey(checkDate, -1);
    }
  } else if (dateSet.has(yesterdayDateKey)) {
    let checkDate = yesterdayDateKey;
    while (dateSet.has(checkDate)) {
      currentStreak++;
      checkDate = getOffsetDateKey(checkDate, -1);
    }
  } else {
    currentStreak = 0;
  }

  // 2. Calculate Longest Streak across all historical dates
  let longestStreak = 0;
  let currentRun = 0;
  let prevUtc = null;

  for (const dk of uniqueSortedDates) {
    const utc = dateKeyToUtcTime(dk);
    if (prevUtc === null) {
      currentRun = 1;
    } else {
      const diff = Math.round((utc - prevUtc) / 86400000);
      if (diff === 1) {
        currentRun++;
      } else if (diff > 1) {
        currentRun = 1;
      }
    }
    if (currentRun > longestStreak) {
      longestStreak = currentRun;
    }
    prevUtc = utc;
  }

  if (currentStreak > longestStreak) {
    longestStreak = currentStreak;
  }

  const lastQualifiedDate = uniqueSortedDates[uniqueSortedDates.length - 1] || null;

  return {
    currentStreak,
    longestStreak,
    todayQualified,
    lastQualifiedDate,
  };
};

/**
 * Calculate streak and historical summary for a student from database
 * @param {string|mongoose.Types.ObjectId} userId
 * @param {string} timeZone
 */
const calculateStudentStreaks = async (userId, timeZone = DEFAULT_TIMEZONE) => {
  const validTz = isValidTimeZone(timeZone) ? timeZone : DEFAULT_TIMEZONE;
  const todayDateKey = getLocalDateKey(new Date(), validTz);

  // Fetch all summaries for this student that have at least 1 qualifying activity
  const summaries = await DailyStudySummary.find({
    student: userId,
    qualifyingActivitiesCount: { $gt: 0 },
  })
    .select('dateKey qualifyingActivitiesCount')
    .lean();

  const qualifyingDates = summaries.map((s) => s.dateKey);
  return computeStreaksFromDates(qualifyingDates, todayDateKey);
};

/**
 * Record bounded active study time for an enrolled course
 *
 * Enforces:
 * - Valid bounded duration (1s - 300s)
 * - User must be enrolled in course
 * - Idempotency by idempotencyKey to prevent double-counting
 * - Atomic increment of daily study time
 *
 * @param {Object} params
 */
const recordActiveStudyTime = async ({
  userId,
  courseId,
  durationSeconds,
  timeZone = DEFAULT_TIMEZONE,
  idempotencyKey = null,
  lessonId = null,
  sectionId = null,
  metadata = {},
}) => {
  // 1. Validate inputs
  if (!userId || !courseId) {
    const err = new Error('User ID and Course ID are required.');
    err.statusCode = 400;
    throw err;
  }

  const duration = Number(durationSeconds);
  if (
    !Number.isFinite(duration) ||
    duration < MIN_INTERVAL_SECONDS ||
    duration > MAX_INTERVAL_SECONDS
  ) {
    const err = new Error(
      `Invalid study duration. Must be a number between ${MIN_INTERVAL_SECONDS} and ${MAX_INTERVAL_SECONDS} seconds.`
    );
    err.statusCode = 400;
    throw err;
  }

  // 2. Validate enrollment
  const enrollment = await Enrollment.findOne({
    student: userId,
    course: courseId,
    status: { $in: ['active', 'completed'] },
  });

  if (!enrollment) {
    const err = new Error('You must be enrolled in this course to record study time.');
    err.statusCode = 403;
    throw err;
  }

  // 3. Check lesson belonging if lessonId is provided
  if (lessonId) {
    const course = await Course.findById(courseId).select('sections');
    if (!course) {
      const err = new Error('Course not found.');
      err.statusCode = 404;
      throw err;
    }
    const lessonFound = (course.sections || []).some((s) =>
      (s.lessons || []).some((l) => l._id.toString() === lessonId.toString())
    );
    if (!lessonFound) {
      const err = new Error('Lesson does not belong to the specified course.');
      err.statusCode = 400;
      throw err;
    }
  }

  // 4. Idempotency check
  if (idempotencyKey) {
    const existing = await LearningActivity.findOne({
      student: userId,
      idempotencyKey,
    });
    if (existing) {
      return {
        success: true,
        alreadyRecorded: true,
        durationSeconds: existing.durationSeconds,
        localDateKey: existing.localDateKey,
        message: 'Study interval previously recorded',
      };
    }
  }

  const validTz = isValidTimeZone(timeZone) ? timeZone : DEFAULT_TIMEZONE;
  const localDateKey = getLocalDateKey(new Date(), validTz);

  // 5. Persist learning activity event
  const activity = await LearningActivity.create({
    student: userId,
    course: courseId,
    sectionId: sectionId || null,
    lessonId: lessonId || null,
    activityType: 'study_interval',
    occurredAt: new Date(),
    localDateKey,
    durationSeconds: duration,
    idempotencyKey: idempotencyKey || null,
    timezone: validTz,
    metadata: metadata || {},
  });

  // 6. Atomically update daily summary
  const summary = await DailyStudySummary.findOneAndUpdate(
    { student: userId, dateKey: localDateKey },
    {
      $inc: { activeStudySeconds: duration },
      $addToSet: { coursesStudied: courseId },
      $setOnInsert: {
        timezone: validTz,
        qualifyingActivitiesCount: 0,
        qualifyingActivities: [],
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return {
    success: true,
    activityId: activity._id.toString(),
    durationSeconds: duration,
    localDateKey,
    activeStudySecondsToday: summary.activeStudySeconds,
  };
};

/**
 * Record a qualifying completion activity (lesson completion, quiz attempt, etc.)
 *
 * Enforces:
 * - Enrollment validation
 * - Lesson ownership validation
 * - Idempotency: Duplicate completion of the same lesson does NOT inflate streak credit
 * - Updates daily summary qualifying count
 * - Updates User.learningStreak cache
 *
 * @param {Object} params
 */
const recordQualifyingActivity = async ({
  userId,
  courseId,
  lessonId = null,
  sectionId = null,
  activityType = 'lesson_completion',
  timeZone = DEFAULT_TIMEZONE,
  idempotencyKey = null,
  metadata = {},
}) => {
  if (!userId || !courseId) {
    const err = new Error('User ID and Course ID are required.');
    err.statusCode = 400;
    throw err;
  }

  // 1. Validate enrollment
  const enrollment = await Enrollment.findOne({
    student: userId,
    course: courseId,
    status: { $in: ['active', 'completed'] },
  });

  if (!enrollment) {
    const err = new Error('You must be enrolled in this course to record completion.');
    err.statusCode = 403;
    throw err;
  }

  // 2. Validate lesson ownership if provided
  let resolvedSectionId = sectionId;
  if (lessonId) {
    const course = await Course.findById(courseId).select('sections');
    if (!course) {
      const err = new Error('Course not found.');
      err.statusCode = 404;
      throw err;
    }
    let matchedSection = null;
    const lessonFound = (course.sections || []).some((s) => {
      const hasLesson = (s.lessons || []).some(
        (l) => l._id.toString() === lessonId.toString()
      );
      if (hasLesson) matchedSection = s._id;
      return hasLesson;
    });

    if (!lessonFound) {
      const err = new Error('Lesson does not belong to the specified course.');
      err.statusCode = 400;
      throw err;
    }
    if (!resolvedSectionId && matchedSection) {
      resolvedSectionId = matchedSection;
    }
  }

  const validTz = isValidTimeZone(timeZone) ? timeZone : DEFAULT_TIMEZONE;
  const localDateKey = getLocalDateKey(new Date(), validTz);

  // 3. Deduplication check: prevent duplicate streak credit for the same lesson
  if (lessonId && activityType === 'lesson_completion') {
    const existing = await LearningActivity.findOne({
      student: userId,
      course: courseId,
      lessonId,
      activityType: 'lesson_completion',
    });
    if (existing) {
      return {
        success: true,
        duplicate: true,
        message: 'Lesson completion already recorded.',
        activityId: existing._id.toString(),
      };
    }
  }

  if (idempotencyKey) {
    const existing = await LearningActivity.findOne({
      student: userId,
      idempotencyKey,
    });
    if (existing) {
      return {
        success: true,
        duplicate: true,
        message: 'Activity already recorded.',
        activityId: existing._id.toString(),
      };
    }
  }

  // 4. Record new qualifying learning activity
  const activity = await LearningActivity.create({
    student: userId,
    course: courseId,
    sectionId: resolvedSectionId || null,
    lessonId: lessonId || null,
    activityType,
    occurredAt: new Date(),
    localDateKey,
    durationSeconds: 0,
    idempotencyKey: idempotencyKey || null,
    timezone: validTz,
    metadata: metadata || {},
  });

  // 5. Atomically update DailyStudySummary
  const summary = await DailyStudySummary.findOneAndUpdate(
    { student: userId, dateKey: localDateKey },
    {
      $inc: { qualifyingActivitiesCount: 1 },
      $addToSet: { coursesStudied: courseId },
      $push: {
        qualifyingActivities: {
          activityType,
          courseId,
          lessonId: lessonId || null,
          completedAt: new Date(),
          metadata: metadata || {},
        },
      },
      $setOnInsert: {
        timezone: validTz,
        activeStudySeconds: 0,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  // 6. Recalculate streak and update user cached streak values
  const streakData = await calculateStudentStreaks(userId, validTz);

  await User.findByIdAndUpdate(userId, {
    timezone: validTz,
    learningStreak: {
      currentStreak: streakData.currentStreak,
      longestStreak: streakData.longestStreak,
      lastQualifiedDate: streakData.lastQualifiedDate,
    },
  }).catch((uErr) => {
    logger.warn(`Could not update user streak cache: ${uErr.message}`);
  });

  return {
    success: true,
    activityId: activity._id.toString(),
    localDateKey,
    qualifyingActivitiesCount: summary.qualifyingActivitiesCount,
    streak: streakData,
  };
};

/**
 * Retrieve comprehensive learning summary and streak statistics for a student
 *
 * Returns:
 * - currentStreak
 * - longestStreak
 * - todayStudySeconds
 * - weekStudySeconds
 * - todayQualified
 * - lastQualifiedDate
 * - timezone
 * - dailySummaries (all 7 days of the local calendar week)
 *
 * @param {string|mongoose.Types.ObjectId} userId
 * @param {string} requestedTimeZone
 */
const getLearningSummary = async (userId, requestedTimeZone = null) => {
  // Resolve timezone preference
  let timeZone = DEFAULT_TIMEZONE;
  if (isValidTimeZone(requestedTimeZone)) {
    timeZone = requestedTimeZone;
  } else {
    const user = await User.findById(userId).select('timezone').lean();
    if (user && isValidTimeZone(user.timezone)) {
      timeZone = user.timezone;
    }
  }

  const todayDateKey = getLocalDateKey(new Date(), timeZone);

  // 1. Fetch all qualifying summaries to compute authoritative streaks
  const allSummaries = await DailyStudySummary.find({ student: userId }).lean();

  const qualifyingDates = allSummaries
    .filter((s) => s.qualifyingActivitiesCount > 0)
    .map((s) => s.dateKey);

  const streakData = computeStreaksFromDates(qualifyingDates, todayDateKey);

  // 2. Compute local week boundaries (Monday through Sunday)
  const todayUtc = dateKeyToUtcTime(todayDateKey);
  const todayDayOfWeek = new Date(todayUtc).getUTCDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  const isoDayOfWeek = todayDayOfWeek === 0 ? 7 : todayDayOfWeek; // 1 = Mon ... 7 = Sun

  const mondayOffset = -(isoDayOfWeek - 1);
  const mondayDateKey = getOffsetDateKey(todayDateKey, mondayOffset);

  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const weekDays = [];
  let weekStudySeconds = 0;
  let todayStudySeconds = 0;
  let todayQualifyingCount = 0;

  const summaryMap = new Map();
  allSummaries.forEach((s) => {
    summaryMap.set(s.dateKey, s);
  });

  for (let i = 0; i < 7; i++) {
    const dateKey = getOffsetDateKey(mondayDateKey, i);
    const dayLabel = dayNames[i];
    const summary = summaryMap.get(dateKey);
    const studySeconds = summary ? summary.activeStudySeconds || 0 : 0;
    const qualifyingCount = summary ? summary.qualifyingActivitiesCount || 0 : 0;
    const isToday = dateKey === todayDateKey;

    if (isToday) {
      todayStudySeconds = studySeconds;
      todayQualifyingCount = qualifyingCount;
    }
    weekStudySeconds += studySeconds;

    weekDays.push({
      date: dateKey,
      day: dayLabel,
      studySeconds,
      qualifyingCount,
      isToday,
    });
  }

  return {
    currentStreak: streakData.currentStreak,
    longestStreak: streakData.longestStreak,
    todayStudySeconds,
    weekStudySeconds,
    todayQualified: streakData.todayQualified,
    todayQualifyingCount,
    lastQualifiedDate: streakData.lastQualifiedDate,
    timezone: timeZone,
    dailySummaries: weekDays,
  };
};

/**
 * Retrieve monthly daily learning history for calendar/heatmap view
 * @param {string|mongoose.Types.ObjectId} userId
 * @param {string} yearMonth - Format 'YYYY-MM'
 * @param {string} requestedTimeZone
 */
const getMonthlyActivity = async (userId, yearMonth, requestedTimeZone = null) => {
  let timeZone = DEFAULT_TIMEZONE;
  if (isValidTimeZone(requestedTimeZone)) {
    timeZone = requestedTimeZone;
  } else {
    const user = await User.findById(userId).select('timezone').lean();
    if (user && isValidTimeZone(user.timezone)) {
      timeZone = user.timezone;
    }
  }

  let targetMonth = yearMonth;
  if (!targetMonth || !/^\d{4}-\d{2}$/.test(targetMonth)) {
    const todayKey = getLocalDateKey(new Date(), timeZone);
    targetMonth = todayKey.slice(0, 7);
  }

  const startDateKey = `${targetMonth}-01`;
  const endDateKey = `${targetMonth}-31`;

  const summaries = await DailyStudySummary.find({
    student: userId,
    dateKey: { $gte: startDateKey, $lte: endDateKey },
  })
    .select('dateKey activeStudySeconds qualifyingActivitiesCount coursesStudied')
    .lean();

  return {
    month: targetMonth,
    timezone: timeZone,
    days: summaries.map((s) => ({
      date: s.dateKey,
      studySeconds: s.activeStudySeconds || 0,
      qualifyingCount: s.qualifyingActivitiesCount || 0,
      hasQualifyingActivity: (s.qualifyingActivitiesCount || 0) > 0,
    })),
  };
};

module.exports = {
  DEFAULT_TIMEZONE,
  MAX_INTERVAL_SECONDS,
  MIN_INTERVAL_SECONDS,
  isValidTimeZone,
  getLocalDateKey,
  dateKeyToUtcTime,
  getOffsetDateKey,
  getDaysDifference,
  computeStreaksFromDates,
  calculateStudentStreaks,
  recordActiveStudyTime,
  recordQualifyingActivity,
  getLearningSummary,
  getMonthlyActivity,
};

