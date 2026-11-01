const {
  getActiveSessions,
  revokeSession,
  revokeOtherSessions,
  touchSession,
  SESSION_POLICY,
} = require('../utils/sessionUtils');
const { clearAuthCookie } = require('../utils/authUtils');
const { disconnectSessionSockets, disconnectUserSockets } = require('../services/socketService');
const { logger } = require('../utils/logger');

/**
 * List all active sessions belonging to the authenticated user
 * GET /api/auth/sessions
 */
const listSessions = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const currentSessionId = req.sessionId || req.session?._id;

    const sessions = await getActiveSessions(userId, currentSessionId);

    return res.status(200).json({
      success: true,
      currentSessionId: currentSessionId ? currentSessionId.toString() : null,
      sessions,
    });
  } catch (error) {
    logger.error(`Error listing active sessions: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve active sessions.',
    });
  }
};

/**
 * Get current session metadata
 * GET /api/auth/sessions/current
 */
const getCurrentSession = async (req, res) => {
  try {
    if (!req.session) {
      return res.status(404).json({
        success: false,
        message: 'No active session details found for this request.',
      });
    }

    const sess = req.session;
    return res.status(200).json({
      success: true,
      session: {
        id: sess._id.toString(),
        device: sess.device,
        userAgent: sess.userAgent,
        ipAddress: sess.ipAddress,
        createdAt: sess.createdAt,
        lastActiveAt: sess.lastActiveAt,
        idleExpiresAt: sess.idleExpiresAt,
        absoluteExpiresAt: sess.absoluteExpiresAt,
        isCurrent: true,
      },
      policy: SESSION_POLICY,
    });
  } catch (error) {
    logger.error(`Error getting current session: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve current session details.',
    });
  }
};

/**
 * Revoke a specific session belonging to the authenticated user
 * DELETE /api/auth/sessions/:sessionId
 */
const revokeSessionEndpoint = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id || req.user._id;
    const currentSessionId = req.sessionId || req.session?._id;
    const targetSessionId = sessionId === 'current' ? currentSessionId?.toString() : sessionId;

    if (!targetSessionId || (!/^[0-9a-fA-F]{24}$/.test(targetSessionId) && sessionId !== 'current')) {
      return res.status(400).json({
        success: false,
        message: 'A valid 24-character hexadecimal session ID is required.',
      });
    }

    const revoked = await revokeSession(targetSessionId, userId, 'user_revoked');
    if (!revoked) {
      return res.status(404).json({
        success: false,
        message: 'Session not found, already revoked, or belongs to another account.',
      });
    }

    logger.info(`Session [${targetSessionId}] revoked by user [${userId}]`);
    disconnectSessionSockets(targetSessionId);

    // If the user revoked their own current session, clear cookie and indicate logout
    const isCurrent =
      sessionId === 'current' ||
      (currentSessionId && currentSessionId.toString() === targetSessionId.toString());
    if (isCurrent) {
      clearAuthCookie(res);
      return res.status(200).json({
        success: true,
        message: 'Current session revoked. You have been logged out.',
        loggedOut: true,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Device session logged out successfully.',
      revokedSessionId: targetSessionId,
      loggedOut: false,
    });
  } catch (error) {
    logger.error(`Error revoking session: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to revoke device session.',
    });
  }
};

/**
 * Revoke all other active sessions for the authenticated user, preserving the current session
 * DELETE /api/auth/sessions/other
 */
const revokeOtherSessionsEndpoint = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const currentSessionId = req.sessionId || req.session?._id;

    if (!currentSessionId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot revoke other sessions without an active current session.',
      });
    }

    const revokedCount = await revokeOtherSessions(userId, currentSessionId, 'revoked_others');
    logger.info(`Revoked [${revokedCount}] other sessions for user [${userId}]`);
    disconnectUserSockets(userId, currentSessionId);

    return res.status(200).json({
      success: true,
      message: `Successfully logged out ${revokedCount} other ${revokedCount === 1 ? 'device' : 'devices'}.`,
      revokedCount,
    });
  } catch (error) {
    logger.error(`Error revoking other sessions: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to revoke other sessions.',
    });
  }
};

/**
 * Refresh current session's idle inactivity window without extending absolute deadline
 * POST /api/auth/sessions/refresh
 */
const refreshSessionEndpoint = async (req, res) => {
  try {
    if (!req.session) {
      return res.status(400).json({
        success: false,
        message: 'No active database session available to refresh.',
      });
    }

    const refreshed = await touchSession(req.session, true);
    if (!refreshed) {
      clearAuthCookie(res);
      return res.status(401).json({
        success: false,
        message: 'Session has been revoked or expired. Please sign in again.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Session refreshed successfully.',
      idleExpiresAt: req.session.idleExpiresAt,
      absoluteExpiresAt: req.session.absoluteExpiresAt,
      policy: SESSION_POLICY,
    });
  } catch (error) {
    logger.error(`Error refreshing session: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to refresh session.',
    });
  }
};

module.exports = {
  listSessions,
  getCurrentSession,
  revokeSessionEndpoint,
  revokeOtherSessionsEndpoint,
  refreshSessionEndpoint,
};

