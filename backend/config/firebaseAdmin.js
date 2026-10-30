const { initializeApp, cert, getApps, getApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { logger } = require('../utils/logger');

let authInstance = null;

/**
 * Check if required Firebase Admin environment variables are set and non-empty
 */
const isFirebaseAdminConfigured = () => {
  return Boolean(
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
  );
};

/**
 * Initialize Firebase Admin SDK app if not already initialized
 */
const initFirebaseAdmin = () => {
  const existingApps = getApps();
  if (existingApps.length > 0) {
    if (!authInstance) {
      authInstance = getAuth(existingApps[0]);
    }
    return existingApps[0];
  }

  if (isFirebaseAdminConfigured()) {
    try {
      const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
      const app = initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey,
        }),
      });
      authInstance = getAuth(app);
      logger.info('Firebase Admin SDK initialized successfully.');
      return app;
    } catch (err) {
      logger.error(`Failed to initialize Firebase Admin SDK: ${err.message}`);
      return null;
    }
  } else {
    logger.warn('Firebase Admin credentials (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY) not fully configured.');
    return null;
  }
};

// Attempt initialization on startup
initFirebaseAdmin();

/**
 * Cryptographically verify Firebase ID token using Admin SDK.
 * In unit tests, firebaseAdmin.verifyFirebaseIdToken can be mocked.
 * @param {string} idToken
 * @returns {Promise<import('firebase-admin/auth').DecodedIdToken>}
 */
const verifyFirebaseIdToken = async (idToken) => {
  if (!authInstance) {
    initFirebaseAdmin();
  }

  if (!authInstance) {
    throw new Error('Firebase Admin SDK is not configured. Please check server environment variables.');
  }

  return authInstance.verifyIdToken(idToken);
};

module.exports = {
  initFirebaseAdmin,
  isFirebaseAdminConfigured,
  verifyFirebaseIdToken,
  getAuthInstance: () => authInstance,
};
