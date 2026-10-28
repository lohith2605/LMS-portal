const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const { logger } = require('../utils/logger');

/**
 * Secure Admin Provisioning Script for LearnSpace
 *
 * Usage:
 *   node scripts/provisionAdmin.js <email> <password> [name]
 * OR configure via environment variables:
 *   ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=SecurePassword123 node scripts/provisionAdmin.js
 */
const provisionAdmin = async () => {
  const args = process.argv.slice(2);
  const email = (args[0] || process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = args[1] || process.env.ADMIN_PASSWORD || '';
  const name = args[2] || process.env.ADMIN_NAME || 'LearnSpace Administrator';

  if (!email || !email.includes('@')) {
    logger.error('Provisioning failed: A valid email address is required.');
    console.log('\nUsage: node scripts/provisionAdmin.js <email> <password> [name]');
    console.log('Or set ADMIN_EMAIL and ADMIN_PASSWORD in environment variables.\n');
    process.exit(1);
  }

  if (!password || password.length < 8) {
    logger.error('Provisioning failed: A password with at least 8 characters is required.');
    process.exit(1);
  }

  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    logger.error('Provisioning failed: Password must contain at least one letter and one number.');
    process.exit(1);
  }

  try {
    await connectDB();

    let user = await User.findOne({ email }).select('+password');

    if (user) {
      logger.info(`Existing account located for ${email}. Upgrading privileges to Administrator...`);
      user.name = name;
      user.role = 'admin';
      user.accountStatus = 'active';
      user.emailVerified = true;
      user.password = password; // Triggers pre-save hashing
      await user.save();
      logger.success(`Account ${email} successfully updated with Administrator role.`);
    } else {
      logger.info(`Creating new Administrator account for ${email}...`);
      user = await User.create({
        name,
        email,
        password,
        role: 'admin',
        accountStatus: 'active',
        emailVerified: true,
      });
      logger.success(`Administrator account created successfully: ${email} (ID: ${user._id})`);
    }

    await mongoose.connection.close();
    logger.info('Database connection closed cleanly.');
    process.exit(0);
  } catch (error) {
    logger.error(`Admin provisioning aborted due to error: ${error.message}`);
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
    process.exit(1);
  }
};

provisionAdmin();
