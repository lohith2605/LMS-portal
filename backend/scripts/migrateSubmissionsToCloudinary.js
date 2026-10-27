/**
 * LearnSpace LMS — Migration Script: Migrate Base64 Submissions to Cloudinary
 *
 * Usage:
 *   Dry-run mode (safe preview, no changes):
 *     node scripts/migrateSubmissionsToCloudinary.js --dry-run
 *
 *   Live migration mode (uploads files to Cloudinary and updates records):
 *     node scripts/migrateSubmissionsToCloudinary.js --execute
 *
 * Requirements:
 *   - CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET in backend/.env
 *   - MongoDB connection configured in backend/.env
 */

require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const AssignmentSubmission = require('../models/AssignmentSubmission');
const { isCloudinaryConfigured } = require('../config/cloudinary');
const cloudinaryStorageService = require('../services/cloudinaryStorageService');
const { logger } = require('../utils/logger');

const parseArgs = () => {
  const args = process.argv.slice(2);
  const isExecute = args.includes('--execute');
  const isDryRun = args.includes('--dry-run') || !isExecute;
  return { isDryRun, isExecute };
};

const decodeBase64DataUrl = (dataUrl) => {
  if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) {
    return null;
  }
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  const mimeType = match[1];
  const buffer = Buffer.from(match[2], 'base64');
  return { mimeType, buffer };
};

const runMigration = async () => {
  const { isDryRun, isExecute } = parseArgs();

  console.log('\n============================================================');
  console.log(' LearnSpace — Base64 Submission Migration to Cloudinary');
  console.log('============================================================');
  console.log(` Mode: ${isDryRun ? 'DRY RUN (Read-Only Preview)' : 'LIVE EXECUTION'}`);
  console.log(` Timestamp: ${new Date().toISOString()}`);
  console.log('------------------------------------------------------------\n');

  if (isExecute && !isCloudinaryConfigured()) {
    console.error('ERROR: Cloudinary credentials are not configured in backend/.env.');
    console.error('Live migration requires CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.');
    process.exit(1);
  }

  await connectDB();

  try {
    // Find all submissions containing potential Base64 data in active files or history
    const allSubmissions = await AssignmentSubmission.find({
      $or: [
        { 'submittedFiles.fileUrl': { $regex: '^data:' } },
        { 'history.submittedFiles.fileUrl': { $regex: '^data:' } },
        { 'submittedFiles.storageProvider': 'base64' },
      ],
    });

    console.log(`Found ${allSubmissions.length} submission document(s) with potential Base64 attachments.\n`);

    const stats = {
      totalSubmissionsScanned: allSubmissions.length,
      activeFilesFound: 0,
      activeFilesMigrated: 0,
      activeFilesSkipped: 0,
      activeFilesFailed: 0,
      historyFilesFound: 0,
      historyFilesMigrated: 0,
      historyFilesSkipped: 0,
      historyFilesFailed: 0,
    };

    for (const submission of allSubmissions) {
      let submissionModified = false;
      const subId = submission._id.toString();
      const studentId = submission.student ? submission.student.toString() : 'unknown';
      const assignmentId = submission.assignment ? submission.assignment.toString() : 'unknown';

      // 1. Process active submittedFiles
      if (Array.isArray(submission.submittedFiles)) {
        for (const file of submission.submittedFiles) {
          if (file.fileUrl && file.fileUrl.startsWith('data:')) {
            stats.activeFilesFound++;

            // If already has Cloudinary Public ID, skip
            if (file.cloudinaryPublicId) {
              stats.activeFilesSkipped++;
              continue;
            }

            const decoded = decodeBase64DataUrl(file.fileUrl);
            if (!decoded) {
              console.warn(`[WARN] Submission ${subId} file "${file.originalName}" has invalid Base64 data URL.`);
              stats.activeFilesFailed++;
              continue;
            }

            if (isDryRun) {
              console.log(`[DRY-RUN] Would migrate active file "${file.originalName}" (${(decoded.buffer.length / 1024).toFixed(1)} KB) for submission ${subId}`);
              stats.activeFilesMigrated++;
            } else {
              try {
                console.log(`[UPLOADING] Active file "${file.originalName}" for submission ${subId}...`);
                const uploadResult = await cloudinaryStorageService.uploadAssignmentFile(decoded.buffer, {
                  originalName: file.originalName || 'legacy_attachment',
                  mimeType: decoded.mimeType,
                  assignmentId,
                  studentId,
                });

                file.cloudinaryPublicId = uploadResult.cloudinaryPublicId;
                file.resourceType = uploadResult.resourceType;
                file.deliveryType = uploadResult.deliveryType;
                file.format = uploadResult.format;
                file.fileSize = uploadResult.fileSize;
                file.mimeType = uploadResult.mimeType;
                file.checksum = uploadResult.checksum;
                file.storageProvider = 'cloudinary';
                file.legacyBackupUrl = file.fileUrl; // Safe backup
                file.fileUrl = ''; // Clear Base64 string from primary field

                submissionModified = true;
                stats.activeFilesMigrated++;
                console.log(`[MIGRATED] Successfully uploaded "${file.originalName}" -> ${uploadResult.cloudinaryPublicId}`);
              } catch (uploadErr) {
                console.error(`[ERROR] Failed to upload active file "${file.originalName}": ${uploadErr.message}`);
                stats.activeFilesFailed++;
              }
            }
          }
        }
      }

      // 2. Process historical versions
      if (Array.isArray(submission.history)) {
        for (const hist of submission.history) {
          if (Array.isArray(hist.submittedFiles)) {
            for (const file of hist.submittedFiles) {
              if (file.fileUrl && file.fileUrl.startsWith('data:')) {
                stats.historyFilesFound++;

                if (file.cloudinaryPublicId) {
                  stats.historyFilesSkipped++;
                  continue;
                }

                const decoded = decodeBase64DataUrl(file.fileUrl);
                if (!decoded) {
                  console.warn(`[WARN] History (v${hist.version}) file "${file.originalName}" has invalid Base64.`);
                  stats.historyFilesFailed++;
                  continue;
                }

                if (isDryRun) {
                  console.log(`[DRY-RUN] Would migrate history (v${hist.version}) file "${file.originalName}" (${(decoded.buffer.length / 1024).toFixed(1)} KB)`);
                  stats.historyFilesMigrated++;
                } else {
                  try {
                    console.log(`[UPLOADING] History (v${hist.version}) file "${file.originalName}"...`);
                    const uploadResult = await cloudinaryStorageService.uploadAssignmentFile(decoded.buffer, {
                      originalName: file.originalName || 'legacy_attachment',
                      mimeType: decoded.mimeType,
                      assignmentId,
                      studentId,
                    });

                    file.cloudinaryPublicId = uploadResult.cloudinaryPublicId;
                    file.resourceType = uploadResult.resourceType;
                    file.deliveryType = uploadResult.deliveryType;
                    file.format = uploadResult.format;
                    file.fileSize = uploadResult.fileSize;
                    file.mimeType = uploadResult.mimeType;
                    file.checksum = uploadResult.checksum;
                    file.storageProvider = 'cloudinary';
                    file.legacyBackupUrl = file.fileUrl;
                    file.fileUrl = '';

                    submissionModified = true;
                    stats.historyFilesMigrated++;
                  } catch (uploadErr) {
                    console.error(`[ERROR] Failed to upload history file: ${uploadErr.message}`);
                    stats.historyFilesFailed++;
                  }
                }
              }
            }
          }
        }
      }

      // Save submission if modified during live execution
      if (submissionModified && isExecute) {
        await submission.save();
        console.log(`[SAVED] Updated submission document ${subId} in database.`);
      }
    }

    console.log('\n============================================================');
    console.log(' Migration Summary Report');
    console.log('============================================================');
    console.log(` Submissions scanned:        ${stats.totalSubmissionsScanned}`);
    console.log(` Active Base64 files found:  ${stats.activeFilesFound}`);
    console.log(` Active files migrated:      ${stats.activeFilesMigrated}`);
    console.log(` Active files skipped:       ${stats.activeFilesSkipped}`);
    console.log(` Active files failed:        ${stats.activeFilesFailed}`);
    console.log(` History Base64 files found: ${stats.historyFilesFound}`);
    console.log(` History files migrated:     ${stats.historyFilesMigrated}`);
    console.log(` History files skipped:      ${stats.historyFilesSkipped}`);
    console.log(` History files failed:       ${stats.historyFilesFailed}`);
    console.log('============================================================\n');

    if (isDryRun) {
      console.log('To execute the live migration, run:');
      console.log('  node scripts/migrateSubmissionsToCloudinary.js --execute\n');
    }
  } catch (err) {
    console.error('Migration encountered an unexpected error:', err);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed.');
  }
};

runMigration();
