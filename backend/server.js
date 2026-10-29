const dotenv = require('dotenv');
// 1. Load environment variables before any code reads process.env
dotenv.config();

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const cookieParser = require('cookie-parser');
const requestLogger = require('./middleware/requestLogger');
const healthRoutes = require('./routes/healthRoutes');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const courseRoutes = require('./routes/courseRoutes');
const instructorRoutes = require('./routes/instructorRoutes');
const studentRoutes = require('./routes/studentRoutes');
const certificateRoutes = require('./routes/certificateRoutes');
const discussionRoutes = require('./routes/discussionRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const calendarRoutes = require('./routes/calendarRoutes');
const { startDeadlineReminderScheduler, stopDeadlineReminderScheduler } = require('./services/deadlineReminderScheduler');
const http = require('http');
const { initSocket } = require('./services/socketService');
const { logger } = require('./utils/logger');

const app = express();
const PORT = Number(process.env.PORT) || 5001;
const NODE_ENV = process.env.NODE_ENV || 'development';
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
const rawClientUrls = process.env.CLIENT_URL ? process.env.CLIENT_URL.split(',').map((u) => u.trim()) : [];
const defaultAllowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
];
const allowedOrigins = Array.from(new Set([...defaultAllowedOrigins, ...rawClientUrls]));

// 2. Global Middleware
app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests or same-origin
    if (!origin) return callback(null, true);

    // In development mode, allow any localhost or 127.0.0.1 port (e.g., Vite on 5174)
    if (NODE_ENV !== 'production') {
      const isLocalhost = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
      if (isLocalhost) {
        return callback(null, true);
      }
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(null, false);
  },
  credentials: true,
}));

// Mount structured HTTP request logger before routes to capture all incoming requests
app.use(requestLogger);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// 3. Application Routes
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/instructor', instructorRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/discussions', discussionRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/calendar', calendarRoutes);


// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to LMS API',
    healthCheck: '/api/health',
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    requestedPath: req.originalUrl,
  });
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error(`Unhandled request error: ${err.message || err}`);
  res.status(500).json({
    error: 'Internal Server Error',
  });
});

// 4. Server Lifecycle Management
let serverInstance = null;
let isShuttingDown = false;

const startServer = async () => {
  try {
    // Connect to database before accepting traffic
    await connectDB();

    const httpServer = http.createServer(app);
    initSocket(httpServer);
    if (NODE_ENV !== 'test') {
      startDeadlineReminderScheduler();
    }
    serverInstance = httpServer.listen(PORT, () => {
      // Extract safe database host info without credentials
      const dbHost = mongoose.connection.host || 'MongoDB Atlas';
      const isDbConnected = mongoose.connection.readyState === 1;

      const registeredEndpoints = [
        { method: 'POST', path: '/api/auth/register', access: 'Public, Rate-limited' },
        { method: 'POST', path: '/api/auth/login', access: 'Public, Rate-limited' },
        { method: 'POST', path: '/api/auth/logout', access: 'Authenticated' },
        { method: 'GET', path: '/api/auth/me', access: 'Authenticated Session' },
        { method: 'POST', path: '/api/auth/forgot-password', access: 'Public, Rate-limited' },
        { method: 'POST', path: '/api/auth/reset-password', access: 'Public, Rate-limited' },
        { method: 'PATCH', path: '/api/auth/change-password', access: 'Authenticated' },
        { method: 'POST', path: '/api/auth/verify-email', access: 'Public' },
        { method: 'POST', path: '/api/auth/resend-verification', access: 'Authenticated' },
        { method: 'GET', path: '/api/auth/student-only', access: 'Student, Admin' },
        { method: 'GET', path: '/api/auth/instructor-only', access: 'Instructor, Admin' },
        { method: 'GET', path: '/api/auth/admin-only', access: 'Admin Only' },
        { method: 'GET', path: '/api/health', access: 'Public Health Check' },
      ];

      // Display UTSAV-style professional banner
      logger.banner({
        appName: 'LMS — Learning Management System API',
        environment: NODE_ENV,
        port: PORT,
        healthPath: '/api/health',
        clientUrl: CLIENT_URL,
        dbStatus: isDbConnected ? 'Connected' : 'Disconnected',
        dbHost: `MongoDB Atlas (${dbHost})`,
        isDbConnected,
        endpoints: registeredEndpoints,
      });
    });

    // Handle port in use / server errors
    serverInstance.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        logger.portInUse(PORT);
      } else {
        logger.error(`Server socket error: ${err.message}`);
      }
      process.exit(1);
    });

    return serverInstance;
  } catch (error) {
    logger.error(`Server startup aborted due to database connection failure: ${error.message}`);
    process.exit(1);
  }
};

// Graceful shutdown handler
const gracefulShutdown = (signal) => {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.warn(`Received ${signal}. Initiating graceful shutdown...`);
  stopDeadlineReminderScheduler();

  const forceExitTimer = setTimeout(() => {
    logger.error('Graceful shutdown timed out (5s). Forcing process exit.');
    process.exit(1);
  }, 5000);
  forceExitTimer.unref();

  if (serverInstance) {
    serverInstance.close(async () => {
      logger.info('HTTP server closed. Stopping accepting new connections.');
      try {
        if (mongoose.connection.readyState !== 0) {
          await mongoose.connection.close(false);
          logger.info('Database connection closed cleanly.');
        }
        clearTimeout(forceExitTimer);
        logger.success('LMS Backend shutdown complete.');
        process.exit(0);
      } catch (dbErr) {
        logger.error(`Error while closing database connection: ${dbErr.message}`);
        process.exit(1);
      }
    });
  } else {
    process.exit(0);
  }
};

// Register shutdown signals once if executed directly
if (require.main === module) {
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

  startServer();
}

// Global process error safety
process.on('unhandledRejection', (reason) => {
  const message = reason instanceof Error ? reason.message : String(reason);
  logger.error(`Unhandled Promise Rejection: ${message}`);
});

process.on('uncaughtException', (err) => {
  logger.error(`Uncaught Exception: ${err.message}`);
});

module.exports = { app, startServer, gracefulShutdown };
