const mongoose = require('mongoose');
const Session = require('../models/Session');
const { parseRequestDevice } = require('./deviceParser');
const { logger } = require('./logger');

// Session policy configuration with validation and sensible defaults
const parseNumber = (val, defaultVal, min, max) => {
  const parsed = Number(val);
  if (isNaN(parsed) || parsed < min || (max && parsed > max)) {
    return defaultVal;
  }
  return parsed;
};

const IDLE_TIMEOUT_MINUTES = parseNumber(
  process.env.SESSION_IDLE_TIMEOUT_MINUTES,
  10,
  1,
  1440
); // 10 minutes default
const WARNING_BEFORE_EXPIRY_MINUTES = parseNumber(
  process.env.SESSION_WARNING_BEFORE_EXPIRY_MINUTES,
  3,
  1,
  IDLE_TIMEOUT_MINUTES
); // 3 minutes warning countdown default
const ABSOLUTE_TIMEOUT_HOURS = parseNumber(
  process.env.SESSION_ABSOLUTE_TIMEOUT_HOURS,
  8,
  1,
  720
); // 8 hours absolute lifetime default
const ACTIVITY_UPDATE_INTERVAL_SECONDS = parseNumber(
  process.env.SESSION_ACTIVITY_UPDATE_INTERVAL_SECONDS,
  60,
  5,
  3600
); // 60s activity throttle default

const IDLE_TIMEOUT_MS = IDLE_TIMEOUT_MINUTES * 60 * 1000;
const WARNING_BEFORE_EXPIRY_MS = WARNING_BEFORE_EXPIRY_MINUTES * 60 * 1000;
const ABSOLUTE_TIMEOUT_MS = ABSOLUTE_TIMEOUT_HOURS * 60 * 60 * 1000;
const ACTIVITY_THROTTLE_MS = ACTIVITY_UPDATE_INTERVAL_SECONDS * 1000;

const SESSION_POLICY = {
  idleTimeoutMinutes: IDLE_TIMEOUT_MINUTES,
  idleTimeoutMs: IDLE_TIMEOUT_MS,
  warningBeforeExpiryMinutes: WARNING_BEFORE_EXPIRY_MINUTES,
  warningBeforeExpiryMs: WARNING_BEFORE_EXPIRY_MS,
  absoluteTimeoutHours: ABSOLUTE_TIMEOUT_HOURS,
  absoluteTimeoutMs: ABSOLUTE_TIMEOUT_MS,
  activityUpdateIntervalSeconds: ACTIVITY_UPDATE_INTERVAL_SECONDS,
  activityThrottleMs: ACTIVITY_THROTTLE_MS,
};

// High-performance in-memory session registry for unit tests and environments without live MongoDB
const inMemorySessions = new Map();

/**
 * Builds a flexible MongoDB query filter for userId that matches either ObjectId or String representation
 * @param {string|mongoose.Types.ObjectId} userId
 * @returns {Object|string|mongoose.Types.ObjectId}
 */
const buildUserMatch = (userId) => {
  if (!userId) return null;
  const rawId = userId?._id ? userId._id : userId;
  const stringId = rawId.toString();
  if (mongoose.Types.ObjectId.isValid(stringId)) {
    return { $in: [stringId, new mongoose.Types.ObjectId(stringId)] };
  }
  return rawId;
};

/**
 * Builds a flexible MongoDB query filter for sessionId that matches either ObjectId or String representation
 * @param {string|mongoose.Types.ObjectId} sessionId
 * @returns {Object|string|mongoose.Types.ObjectId}
 */
const buildSessionIdMatch = (sessionId) => {
  if (!sessionId) return null;
  const stringId = sessionId.toString();
  if (mongoose.Types.ObjectId.isValid(stringId)) {
    return { $in: [stringId, new mongoose.Types.ObjectId(stringId)] };
  }
  return sessionId;
};

const isDbConnected = () => Boolean(mongoose.connection && mongoose.connection.readyState === 1);

const resetInMemorySessions = () => {
  inMemorySessions.clear();
};

/**
 * Create a new database-backed multi-device session for an authenticated user
 * @param {Object} params
 * @param {Object} params.user - Authenticated User document or object
 * @param {import('express').Request} [params.req] - Express request for device extraction
 * @param {string} [params.role] - User role override
 * @returns {Promise<Session|Object>}
 */
const createSession = async ({ user, req, role }) => {
  const userId = user._id ? user._id : user.id;
  const userRole = role || user.role || 'student';
  const now = new Date();

  const idleExpiresAt = new Date(now.getTime() + IDLE_TIMEOUT_MS);
  const absoluteExpiresAt = new Date(now.getTime() + ABSOLUTE_TIMEOUT_MS);

  // Extract client device and network metadata safely
  const deviceMeta = parseRequestDevice(req);
  const sessionTokenId = Session.generateSessionTokenId();

  if (isDbConnected()) {
    const session = await Session.create({
      userId,
      role: userRole,
      sessionTokenId,
      device: {
        browser: deviceMeta.browser,
        os: deviceMeta.os,
        type: deviceMeta.type,
      },
      userAgent: deviceMeta.userAgent,
      ipAddress: deviceMeta.ipAddress,
      lastActiveAt: now,
      idleExpiresAt,
      absoluteExpiresAt,
    });

    logger.info(
      `Session created: [${session._id}] for user ${user.email || userId} (${userRole}) from ${deviceMeta.browser} on ${deviceMeta.os} (${deviceMeta.ipAddress})`
    );

    return session;
  }

  // In-memory session store for tests
  const id = new mongoose.Types.ObjectId().toString();
  const session = {
    _id: id,
    id,
    userId,
    role: userRole,
    sessionTokenId,
    device: {
      browser: deviceMeta.browser,
      os: deviceMeta.os,
      type: deviceMeta.type,
    },
    userAgent: deviceMeta.userAgent,
    ipAddress: deviceMeta.ipAddress,
    lastActiveAt: now,
    idleExpiresAt,
    absoluteExpiresAt,
    revokedAt: null,
    revokeReason: null,
    createdAt: now,
    updatedAt: now,
    async save() {
      this.updatedAt = new Date();
      return this;
    },
    toJSON() {
      const copy = { ...this };
      copy.id = this.id || this._id.toString();
      return copy;
    },
  };

  inMemorySessions.set(id, session);
  return session;
};

/**
 * Validate a session against database state, revocation, idle deadline, and absolute lifetime
 * @param {string} sessionId
 * @param {string} userId
 * @returns {Promise<{ valid: boolean, reason?: string, session?: Session|Object }>}
 */
const validateSession = async (sessionId, userId) => {
  if (!sessionId || !userId) {
    return { valid: false, reason: 'missing_parameters' };
  }

  if (isDbConnected()) {
    const session = await Session.findOne({
      _id: buildSessionIdMatch(sessionId),
      userId: buildUserMatch(userId),
    });

    if (!session) {
      return { valid: false, reason: 'not_found' };
    }

    if (session.revokedAt) {
      return { valid: false, reason: 'revoked', session };
    }

    const now = new Date();

    // Enforce immutable absolute lifetime
    if (now > session.absoluteExpiresAt) {
      await Session.updateOne(
        { _id: session._id, revokedAt: null },
        { $set: { revokedAt: now, revokeReason: 'absolute_timeout' } }
      );
      session.revokedAt = now;
      session.revokeReason = 'absolute_timeout';
      return { valid: false, reason: 'absolute_timeout', session };
    }

    // Enforce sliding inactivity timeout
    if (now > session.idleExpiresAt) {
      await Session.updateOne(
        { _id: session._id, revokedAt: null },
        { $set: { revokedAt: now, revokeReason: 'idle_timeout' } }
      );
      session.revokedAt = now;
      session.revokeReason = 'idle_timeout';
      return { valid: false, reason: 'idle_timeout', session };
    }

    return { valid: true, session };
  }

  // In-memory fallback for test environments
  const session = inMemorySessions.get(sessionId?.toString());
  if (!session) {
    return { valid: false, reason: 'not_found' };
  }

  const sessUserId = session.userId?._id ? session.userId._id.toString() : session.userId.toString();
  const targetUserId = userId?._id ? userId._id.toString() : userId.toString();
  if (sessUserId !== targetUserId) {
    return { valid: false, reason: 'not_found' };
  }

  if (session.revokedAt) {
    return { valid: false, reason: 'revoked', session };
  }

  const now = new Date();
  if (now > session.absoluteExpiresAt) {
    session.revokedAt = now;
    session.revokeReason = 'absolute_timeout';
    return { valid: false, reason: 'absolute_timeout', session };
  }

  if (now > session.idleExpiresAt) {
    session.revokedAt = now;
    session.revokeReason = 'idle_timeout';
    return { valid: false, reason: 'idle_timeout', session };
  }

  return { valid: true, session };
};

/**
 * Update session activity timestamp and extend sliding idle window (throttled)
 * Guarantees that idle deadline never exceeds the immutable absolute deadline.
 * Atomic conditional update ensures revoked or expired sessions cannot be revived.
 * @param {Session|Object} session
 * @param {boolean} [force=false] - Force update without waiting for activity throttle
 * @returns {Promise<boolean>} Whether an update occurred
 */
const touchSession = async (session, force = false) => {
  if (!session || !session.lastActiveAt) return false;

  const now = Date.now();
  const elapsed = now - new Date(session.lastActiveAt).getTime();

  // Throttle database writes according to configured interval (unless forced, e.g. refresh endpoint)
  if (force || elapsed >= ACTIVITY_THROTTLE_MS) {
    const nowDate = new Date(now);
    const candidateIdle = new Date(now + IDLE_TIMEOUT_MS);
    const cappedIdle = new Date(
      Math.min(candidateIdle.getTime(), new Date(session.absoluteExpiresAt).getTime())
    );

    if (isDbConnected()) {
      const result = await Session.updateOne(
        {
          _id: session._id,
          revokedAt: null,
          idleExpiresAt: { $gt: nowDate },
          absoluteExpiresAt: { $gt: nowDate },
        },
        {
          $set: {
            lastActiveAt: nowDate,
            idleExpiresAt: cappedIdle,
          },
        }
      );
      if (result.matchedCount === 0) {
        return false;
      }
    } else {
      const sess = inMemorySessions.get(session._id?.toString() || session.id?.toString());
      if (
        sess &&
        !sess.revokedAt &&
        new Date(sess.idleExpiresAt) > nowDate &&
        new Date(sess.absoluteExpiresAt) > nowDate
      ) {
        sess.lastActiveAt = nowDate;
        sess.idleExpiresAt = cappedIdle;
      } else {
        return false;
      }
    }

    session.lastActiveAt = nowDate;
    session.idleExpiresAt = cappedIdle;
    return true;
  }

  return false;
};

/**
 * Revoke a specific session belonging to a user
 * @param {string} sessionId
 * @param {string} userId
 * @param {string} reason
 * @returns {Promise<Session|Object|null>}
 */
const revokeSession = async (sessionId, userId, reason = 'user_revoked') => {
  if (isDbConnected()) {
    return Session.findOneAndUpdate(
      { _id: buildSessionIdMatch(sessionId), userId: buildUserMatch(userId), revokedAt: null },
      {
        $set: {
          revokedAt: new Date(),
          revokeReason: reason,
        },
      },
      { new: true }
    );
  }

  const session = inMemorySessions.get(sessionId?.toString());
  if (!session) return null;

  const sessUserId = session.userId?._id ? session.userId._id.toString() : session.userId.toString();
  const targetUserId = userId?._id ? userId._id.toString() : userId.toString();
  if (sessUserId === targetUserId && !session.revokedAt) {
    session.revokedAt = new Date();
    session.revokeReason = reason;
    return session;
  }
  return null;
};

/**
 * Revoke all other active sessions for a user, retaining the current session
 * @param {string} userId
 * @param {string} currentSessionId
 * @param {string} reason
 * @returns {Promise<number>} Number of sessions revoked
 */
const revokeOtherSessions = async (userId, currentSessionId, reason = 'revoked_others') => {
  if (isDbConnected()) {
    const currentIdMatch = buildSessionIdMatch(currentSessionId);
    const excludeIds = currentIdMatch?.$in || [currentSessionId];
    const result = await Session.updateMany(
      {
        userId: buildUserMatch(userId),
        _id: { $nin: excludeIds },
        revokedAt: null,
      },
      {
        $set: {
          revokedAt: new Date(),
          revokeReason: reason,
        },
      }
    );

    return result.modifiedCount || 0;
  }

  const targetUserId = userId?._id ? userId._id.toString() : userId.toString();
  let count = 0;
  for (const session of inMemorySessions.values()) {
    const sessUserId = session.userId?._id ? session.userId._id.toString() : session.userId.toString();
    const sessId = session._id?.toString() || session.id?.toString();
    if (sessUserId === targetUserId && sessId !== currentSessionId?.toString() && !session.revokedAt) {
      session.revokedAt = new Date();
      session.revokeReason = reason;
      count++;
    }
  }
  return count;
};

/**
 * Revoke every session for a user (e.g. on account suspension)
 * @param {string} userId
 * @param {string} reason
 * @returns {Promise<number>}
 */
const revokeAllSessions = async (userId, reason = 'account_suspended') => {
  if (isDbConnected()) {
    const result = await Session.updateMany(
      { userId: buildUserMatch(userId), revokedAt: null },
      {
        $set: {
          revokedAt: new Date(),
          revokeReason: reason,
        },
      }
    );

    return result.modifiedCount || 0;
  }

  const targetUserId = userId?._id ? userId._id.toString() : userId.toString();
  let count = 0;
  for (const session of inMemorySessions.values()) {
    const sessUserId = session.userId?._id ? session.userId._id.toString() : session.userId.toString();
    if (sessUserId === targetUserId && !session.revokedAt) {
      session.revokedAt = new Date();
      session.revokeReason = reason;
      count++;
    }
  }
  return count;
};

/**
 * Format active sessions safely for client consumption
 * @param {string} userId
 * @param {string} currentSessionId
 * @returns {Promise<Array>}
 */
const getActiveSessions = async (userId, currentSessionId) => {
  const now = new Date();

  if (isDbConnected()) {
    const sessions = await Session.find({
      userId: buildUserMatch(userId),
      revokedAt: null,
      idleExpiresAt: { $gt: now },
      absoluteExpiresAt: { $gt: now },
    }).sort({ lastActiveAt: -1 });

    return sessions.map((sess) => ({
      id: sess._id.toString(),
      device: sess.device,
      userAgent: sess.userAgent,
      ipAddress: sess.ipAddress,
      createdAt: sess.createdAt,
      lastActiveAt: sess.lastActiveAt,
      idleExpiresAt: sess.idleExpiresAt,
      absoluteExpiresAt: sess.absoluteExpiresAt,
      isCurrent: sess._id.toString() === currentSessionId?.toString(),
    }));
  }

  const targetUserId = userId?._id ? userId._id.toString() : userId.toString();
  const matched = [];
  for (const sess of inMemorySessions.values()) {
    const sessUserId = sess.userId?._id ? sess.userId._id.toString() : sess.userId.toString();
    if (
      sessUserId === targetUserId &&
      !sess.revokedAt &&
      new Date(sess.idleExpiresAt) > now &&
      new Date(sess.absoluteExpiresAt) > now
    ) {
      matched.push(sess);
    }
  }

  matched.sort((a, b) => new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime());

  return matched.map((sess) => ({
    id: sess._id?.toString() || sess.id?.toString(),
    device: sess.device,
    userAgent: sess.userAgent,
    ipAddress: sess.ipAddress,
    createdAt: sess.createdAt,
    lastActiveAt: sess.lastActiveAt,
    idleExpiresAt: sess.idleExpiresAt,
    absoluteExpiresAt: sess.absoluteExpiresAt,
    isCurrent: (sess._id?.toString() || sess.id?.toString()) === currentSessionId?.toString(),
  }));
};

module.exports = {
  IDLE_TIMEOUT_MINUTES,
  WARNING_BEFORE_EXPIRY_MINUTES,
  ABSOLUTE_TIMEOUT_HOURS,
  ACTIVITY_UPDATE_INTERVAL_SECONDS,
  IDLE_TIMEOUT_MS,
  WARNING_BEFORE_EXPIRY_MS,
  ABSOLUTE_TIMEOUT_MS,
  ACTIVITY_THROTTLE_MS,
  SESSION_POLICY,
  createSession,
  validateSession,
  touchSession,
  revokeSession,
  revokeOtherSessions,
  revokeAllSessions,
  getActiveSessions,
  resetInMemorySessions,
  inMemorySessions,
};
