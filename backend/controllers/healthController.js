const mongoose = require('mongoose');

/**
 * Health check controller
 * Distinguishes server availability and MongoDB Atlas connection status.
 * Returns HTTP 200 when operational and connected, or HTTP 503 if database is unavailable.
 */
const getHealthStatus = (req, res) => {
  const readyState = mongoose.connection.readyState;
  const isUriConfigured = Boolean(process.env.MONGODB_URI && process.env.MONGODB_URI.trim());

  let dbStatus = 'disconnected';
  let dbMessage = 'Database is disconnected';

  if (!isUriConfigured) {
    dbStatus = 'unconfigured';
    dbMessage = 'MongoDB Atlas connection string not configured';
  } else {
    switch (readyState) {
      case 1:
        dbStatus = 'connected';
        dbMessage = 'Connected to MongoDB Atlas';
        break;
      case 2:
        dbStatus = 'connecting';
        dbMessage = 'Connecting to MongoDB Atlas';
        break;
      case 3:
        dbStatus = 'disconnecting';
        dbMessage = 'Disconnecting from MongoDB Atlas';
        break;
      case 0:
      default:
        dbStatus = 'disconnected';
        dbMessage = 'Database is disconnected';
        break;
    }
  }

  const isDbConnected = readyState === 1;
  const httpStatusCode = isDbConnected ? 200 : 503;
  const appStatus = isDbConnected ? 'ok' : 'degraded';

  res.status(httpStatusCode).json({
    status: appStatus,
    message: isDbConnected
      ? 'LMS Backend API is operational and database is connected'
      : 'LMS Backend API is operational but database is not connected',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || 'development',
    server: {
      status: 'healthy',
      port: Number(process.env.PORT) || 5000,
    },
    database: {
      status: dbStatus,
      readyState,
      connected: isDbConnected,
      message: dbMessage,
    },
  });
};

module.exports = {
  getHealthStatus,
};
