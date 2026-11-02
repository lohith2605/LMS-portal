const Razorpay = require('razorpay');
const { logger } = require('../utils/logger');

let razorpayClient = null;

/**
 * Returns a singleton Razorpay client instance.
 * Credentials are read dynamically from environment variables.
 */
const getRazorpayInstance = () => {
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;

  if (!key_id || !key_secret) {
    logger.warn('Razorpay credentials (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET) are missing or incomplete in environment.');
  }

  if (!razorpayClient || razorpayClient.key_id !== key_id) {
    razorpayClient = new Razorpay({
      key_id: key_id || 'rzp_test_placeholder',
      key_secret: key_secret || 'test_secret_placeholder',
    });
  }

  return razorpayClient;
};

module.exports = {
  getRazorpayInstance,
};

