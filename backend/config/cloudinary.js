const { v2: cloudinary } = require('cloudinary');
const { logger } = require('../utils/logger');

// Check if all required environment variable names are set and non-empty
const isCloudinaryConfigured = () => {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
};

if (isCloudinaryConfigured()) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
  logger.info('Cloudinary SDK configured with secure transmission.');
} else {
  logger.warn('Cloudinary credentials (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET) not fully configured. Cloudinary uploads will use mock/fallback in test mode.');
}

module.exports = {
  cloudinary,
  isCloudinaryConfigured,
};
