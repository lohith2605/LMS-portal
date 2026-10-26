const dotenv = require('dotenv');
// 1. Load environment variables before any code reads process.env
dotenv.config();

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const requestLogger = require('./middleware/requestLogger');
const healthRoutes = require('./routes/healthRoutes');
const { logger } = require('./utils/logger');

const app = express();
const PORT = Number(process.env.PORT) || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
const NODE_ENV = process.env.NODE_ENV || 'development';

// 2. Global Middleware
app.use(cors({
  origin: CLIENT_URL,
  credentials: true,
}));

// Mount structured HTTP request logger before routes to capture all incoming requests
app.use(requestLogger);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 3. Application Routes
app.use('/api/health', healthRoutes);

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

    serverInstance = app.listen(PORT, () => {
      // Extract safe database host info without credentials
      const dbHost = mongoose.connection.host || 'MongoDB Atlas';
      const isDbConnected = mongoose.connection.readyState === 1;

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
