const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { logger } = require('../utils/logger');

let ioInstance = null;

const parseCookieToken = (cookieHeader) => {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(/(?:^|;\s*)jwt=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
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
  ioInstance.use((socket, next) => {
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

      if (!token) {
        return next(new Error('Authentication required for real-time notifications'));
      }

      const secret = process.env.JWT_SECRET || 'learnspace_development_jwt_secret_fallback_key';
      const decoded = jwt.verify(token, secret);

      socket.userId = decoded.id ? decoded.id.toString() : '';
      socket.userRole = decoded.role || 'student';

      if (!socket.userId) {
        return next(new Error('Invalid token payload'));
      }

      next();
    } catch (err) {
      return next(new Error('Authentication failed: Invalid session credentials'));
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

module.exports = {
  initSocket,
  getIO,
  emitToUser,
};

