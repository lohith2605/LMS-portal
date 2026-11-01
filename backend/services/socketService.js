const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { getJwtSecret } = require('../utils/authUtils');
const { validateSession } = require('../utils/sessionUtils');
const { logger } = require('../utils/logger');

let ioInstance = null;

const parseCookieToken = (cookieHeader) => {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(/(?:^|;\s*)jwt=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
};

/**
 * Verify socket token, purpose, database session, and account status
 * @param {string} token
 * @returns {Promise<{ id: string, role: string, sessionId?: string }>}
 */
const verifySocketToken = async (token) => {
  if (!token) {
    throw new Error('Authentication required for real-time notifications');
  }

  const secret = getJwtSecret();
  const decoded = jwt.verify(token, secret);

  // 1. Enforce purpose check: Reject MFA challenge / pre-auth tokens
  if (decoded.purpose && decoded.purpose !== 'authenticated') {
    throw new Error('Authentication failed: Pre-auth token cannot be used for persistent socket connection');
  }

  const userId = decoded.id ? decoded.id.toString() : '';
  if (!userId) {
    throw new Error('Invalid token payload');
  }

  // 2. Validate database-backed session if session ID is embedded
  const sessionId = decoded.sid || decoded.sessionId;
  if (sessionId) {
    const sessionResult = await validateSession(sessionId, decoded.id);
    if (!sessionResult.valid) {
      throw new Error(
        `Authentication failed: Session has been revoked or expired (${sessionResult.reason || 'revoked'})`
      );
    }
  } else if (process.env.NODE_ENV !== 'test') {
    throw new Error('Authentication failed: Missing active session identifier');
  }

  // 3. Validate user account existence and status
  const user = await User.findById(decoded.id);
  if (!user || user.accountStatus !== 'active') {
    throw new Error('Authentication failed: User account is inactive or suspended');
  }

  return { id: userId, role: decoded.role || 'student', sessionId: sessionId ? sessionId.toString() : null };
};

const initSocket = (httpServer) => {
  const isProduction = process.env.NODE_ENV === 'production';
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const rawUrls = process.env.CLIENT_URL ? process.env.CLIENT_URL.split(',').map((u) => u.trim()) : [];
  const defaultOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
  ];
  const allowedOrigins = Array.from(new Set([...defaultOrigins, clientUrl, ...rawUrls]));

  ioInstance = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (!isProduction && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
          return callback(null, true);
        }
        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        return callback(null, false);
      },
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // Authenticate socket connections using HttpOnly JWT cookie or Authorization handshake
  ioInstance.use(async (socket, next) => {
    try {
      let token = parseCookieToken(socket.request.headers.cookie);

      if (!token && socket.handshake.auth && socket.handshake.auth.token) {
        token = socket.handshake.auth.token;
      } else if (!token && socket.handshake.headers && socket.handshake.headers.authorization) {
        const header = socket.handshake.headers.authorization;
        if (header.startsWith('Bearer ')) {
          token = header.slice(7);
        }
      }

      const auth = await verifySocketToken(token);
      socket.userId = auth.id;
      socket.userRole = auth.role;
      socket.sessionId = auth.sessionId;

      next();
    } catch (err) {
      return next(new Error(`Authentication failed: ${err.message || 'Invalid session credentials'}`));
    }
  });

  ioInstance.on('connection', (socket) => {
    const userRoom = `user_${socket.userId}`;
    socket.join(userRoom);

    socket.on('disconnect', () => {
      socket.leave(userRoom);
    });
  });

  logger.info('Socket.IO real-time notification engine initialized');
  return ioInstance;
};

const getIO = () => ioInstance;

const emitToUser = (userId, event, payload) => {
  if (!ioInstance || !userId) return false;
  try {
    ioInstance.to(`user_${userId.toString()}`).emit(event, payload);
    return true;
  } catch (err) {
    logger.warn(`Failed to emit real-time event to user_${userId}: ${err.message}`);
    return false;
  }
};

/**
 * Disconnect active socket connections for a revoked session
 * @param {string} sessionId
 */
const disconnectSessionSockets = (sessionId) => {
  if (!ioInstance || !sessionId) return;
  try {
    const sockets = ioInstance.sockets.sockets;
    for (const [id, s] of sockets) {
      if (s.sessionId === sessionId.toString()) {
        s.emit('session_revoked', { message: 'Your session has been logged out.' });
        s.disconnect(true);
      }
    }
  } catch (err) {
    logger.warn(`Error disconnecting sockets for session ${sessionId}: ${err.message}`);
  }
};

/**
 * Disconnect active socket connections for a user across all (or other) sessions
 * @param {string} userId
 * @param {string} [exceptSessionId]
 */
const disconnectUserSockets = (userId, exceptSessionId = null) => {
  if (!ioInstance || !userId) return;
  try {
    const sockets = ioInstance.sockets.sockets;
    for (const [id, s] of sockets) {
      if (s.userId === userId.toString()) {
        if (!exceptSessionId || s.sessionId !== exceptSessionId.toString()) {
          s.emit('session_revoked', { message: 'Your session has been logged out.' });
          s.disconnect(true);
        }
      }
    }
  } catch (err) {
    logger.warn(`Error disconnecting sockets for user ${userId}: ${err.message}`);
  }
};

module.exports = {
  initSocket,
  getIO,
  emitToUser,
  disconnectSessionSockets,
  disconnectUserSockets,
  verifySocketToken,
};
