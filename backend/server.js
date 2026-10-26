const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const healthRoutes = require('./routes/healthRoutes');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// Middleware configuration
app.use(cors({
  origin: CLIENT_URL,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/health', healthRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to LMS API',
    healthCheck: '/api/health'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    requestedPath: req.originalUrl
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('[Server Error]', err.message || err);
  res.status(500).json({
    error: 'Internal Server Error'
  });
});

// Start server and connect to database
const server = app.listen(PORT, async () => {
  console.log(`[Server] LMS Backend running on port ${PORT}`);
  console.log(`[Server] Health check endpoint: http://localhost:${PORT}/api/health`);
  
  // Safe database connection
  await connectDB();
});

// Handle unhandled promise rejections safely without leaking secrets
process.on('unhandledRejection', (reason) => {
  const message = reason instanceof Error ? reason.message : String(reason);
  console.error('[Unhandled Rejection]', message);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('[Uncaught Exception]', err.message);
});

module.exports = { app, server };
