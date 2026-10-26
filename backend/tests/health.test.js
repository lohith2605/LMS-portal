const test = require('node:test');
const assert = require('node:assert');
const mongoose = require('mongoose');
const { getHealthStatus } = require('../controllers/healthController');

test('Health Controller returns 503 degraded when database is disconnected', () => {
  const originalReadyState = mongoose.connection.readyState;
  const originalUri = process.env.MONGODB_URI;
  process.env.MONGODB_URI = 'mongodb://localhost:27017/test';

  // Simulate disconnected state (readyState = 0)
  Object.defineProperty(mongoose.connection, 'readyState', { value: 0, configurable: true });

  const req = {};
  let statusCode = null;
  let responseData = null;

  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(data) {
      responseData = data;
      return this;
    }
  };

  getHealthStatus(req, res);

  assert.strictEqual(statusCode, 503);
  assert.strictEqual(responseData.status, 'degraded');
  assert.strictEqual(responseData.server.status, 'healthy');
  assert.strictEqual(responseData.database.connected, false);

  // Restore
  Object.defineProperty(mongoose.connection, 'readyState', { value: originalReadyState, configurable: true });
  process.env.MONGODB_URI = originalUri;
});

test('Health Controller returns 200 ok when database is connected', () => {
  const originalReadyState = mongoose.connection.readyState;
  const originalUri = process.env.MONGODB_URI;
  process.env.MONGODB_URI = 'mongodb://localhost:27017/test';

  // Simulate connected state (readyState = 1)
  Object.defineProperty(mongoose.connection, 'readyState', { value: 1, configurable: true });

  const req = {};
  let statusCode = null;
  let responseData = null;

  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(data) {
      responseData = data;
      return this;
    }
  };

  getHealthStatus(req, res);

  assert.strictEqual(statusCode, 200);
  assert.strictEqual(responseData.status, 'ok');
  assert.strictEqual(responseData.server.status, 'healthy');
  assert.strictEqual(responseData.database.status, 'connected');
  assert.strictEqual(responseData.database.connected, true);

  // Restore
  Object.defineProperty(mongoose.connection, 'readyState', { value: originalReadyState, configurable: true });
  process.env.MONGODB_URI = originalUri;
});
