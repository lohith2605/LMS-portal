const mongoose = require('mongoose');
const dns = require('dns');
const { logger } = require('../utils/logger');

// Configure reliable DNS servers (Google Public DNS) to resolve Atlas SRV and TXT records
// This resolves the 'querySrv ECONNREFUSED' issue encountered with certain local network resolvers.
try {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
} catch (dnsErr) {
  logger.warn(`Custom DNS configuration warning: ${dnsErr.message}`);
}

let connectionPromise = null;

/**
 * Establish connection to MongoDB Atlas using Mongoose.
 * Reuses existing connection if already established or in-progress.
 *
 * @returns {Promise<mongoose.Connection>}
 */
const connectDB = async () => {
  // If already connected, return existing connection
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  // If connection is in progress, return the active promise to avoid duplicate connections
  if (connectionPromise) {
    return connectionPromise;
  }

  const uri = process.env.MONGODB_URI ? process.env.MONGODB_URI.trim() : '';

  if (!uri) {
    const missingUriError = new Error('MONGODB_URI is not set in environment variables');
    logger.error('Database connection aborted: MONGODB_URI is not configured in backend/.env');
    throw missingUriError;
  }

  const connectionOptions = {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  };

  // Register connection event listeners once
  if (mongoose.connection.listenerCount('error') === 0) {
    mongoose.connection.on('error', (err) => {
      logger.error(`MongoDB runtime error: ${err.message}`);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB Atlas connection lost / disconnected.');
    });

    mongoose.connection.on('reconnected', () => {
      logger.success('MongoDB Atlas connection restored (reconnected).');
    });
  }

  connectionPromise = (async () => {
    try {
      logger.info('Connecting to MongoDB Atlas cluster...');
      await mongoose.connect(uri, connectionOptions);
      logger.success('MongoDB Atlas connection established successfully.');
      return mongoose.connection;
    } catch (error) {
      let errorCategory = 'Connection failed';
      let troubleshooting = 'Verify your network connection and Atlas cluster status.';

      if (error.name === 'MongooseServerSelectionError') {
        errorCategory = 'Server selection timeout';
        troubleshooting = 'Check Atlas Network Access / IP Access List (whitelist current IP), or verify DNS resolution.';
      } else if (error.message.includes('bad auth') || error.message.includes('Authentication failed')) {
        errorCategory = 'Authentication error';
        troubleshooting = 'Check database username and password in MONGODB_URI (URL-encode special characters).';
      } else if (error.message.includes('ECONNREFUSED') || error.message.includes('ENOTFOUND')) {
        errorCategory = 'DNS / Network unreachable';
        troubleshooting = 'Verify cluster hostname and ensure outbound traffic to port 27017 is not blocked by a firewall.';
      }

      logger.error(`[Database Error: ${errorCategory}] ${error.message}`);
      logger.warn(`Troubleshooting: ${troubleshooting}`);
      throw error;
    } finally {
      connectionPromise = null;
    }
  })();

  return connectionPromise;
};

module.exports = connectDB;
