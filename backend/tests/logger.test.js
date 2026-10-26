const test = require('node:test');
const assert = require('node:assert');
const { logger } = require('../utils/logger');
const requestLogger = require('../middleware/requestLogger');

test('Logger provides info, success, warn, error, http, and banner functions', () => {
  assert.strictEqual(typeof logger.info, 'function');
  assert.strictEqual(typeof logger.success, 'function');
  assert.strictEqual(typeof logger.warn, 'function');
  assert.strictEqual(typeof logger.error, 'function');
  assert.strictEqual(typeof logger.http, 'function');
  assert.strictEqual(typeof logger.banner, 'function');
  assert.strictEqual(typeof logger.portInUse, 'function');
});

test('Request logger sanitizes sensitive query parameters', () => {
  let loggedOutput = '';
  const originalHttp = logger.http;
  logger.http = (method, url, status, duration) => {
    loggedOutput = `${method} ${url} ${status} - ${duration}ms`;
  };

  const req = {
    method: 'GET',
    originalUrl: '/api/auth/reset?token=secret123&user=john&password=mypassword',
  };
  const listeners = {};
  const res = {
    statusCode: 200,
    on(event, handler) {
      listeners[event] = handler;
    },
  };
  let nextCalled = false;
  const next = () => { nextCalled = true; };

  requestLogger(req, res, next);
  assert.strictEqual(nextCalled, true);
  assert.strictEqual(typeof listeners.finish, 'function');

  // Trigger finish event
  listeners.finish();

  assert.ok(loggedOutput.includes('[REDACTED]'));
  assert.ok(!loggedOutput.includes('secret123'));
  assert.ok(!loggedOutput.includes('mypassword'));
  assert.ok(loggedOutput.includes('user=john'));

  // Restore logger.http
  logger.http = originalHttp;
});
