/**
 * LearnSpace LMS — Maintenance Script: Cleanup Abandoned Staged Uploads
 *
 * Usage:
 *   Dry-run mode (safe preview, no deletion):
 *     node scripts/cleanupAbandonedUploads.js --dry-run
 *     node scripts/cleanupAbandonedUploads.js --dry-run --older-than-hours 12
 *
 *   Live execution mode (deletes unreferenced Cloudinary assets and expires records):
 *     node scripts/cleanupAbandonedUploads.js --execute
 *     node scripts/cleanupAbandonedUploads.js --execute --older-than-hours 24
 *
 * Safety guarantees:
 *   - NEVER deletes assets referenced in active submissions or version history.
 *   - Only targets unconsumed uploads older than the specified threshold (default: 24h).
 *   - Performs a double-check against AssignmentSubmission collection before deletion.
 *   - Defaults to dry-run mode if --execute is omitted.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const PendingUpload = require('../models/PendingUpload');
const AssignmentSubmission = require('../models/AssignmentSubmission');
const { isCloudinaryConfigured } = require('../config/cloudinary');
const cloudinaryStorageService = require('../services/cloudinaryStorageService');

const parseArgs = () => {
  const args = process.argv.slice(2);
  const isExecute = args.includes('--execute');
  const isDryRun = args.includes('--dry-run') || !isExecute;

  let olderThanHours = 24;
  const hoursIdx = args.indexOf('--older-than-hours');
  if (hoursIdx !== -1 && args[hoursIdx + 1]) {
    const parsed = Number(args[hoursIdx + 1]);
    if (!isNaN(parsed) && parsed > 0) {
      olderThanHours = parsed;
    }
  }

  return { isDryRun, isExecute, olderThanHours };
};

const runCleanup = async () => {
  const { isDryRun, isExecute, olderThanHours } = parseArgs();

  console.log('\n============================================================');
  console.log(' LearnSpace — Abandoned Upload Cleanup Utility');
  console.log('============================================================');
  console.log(` Mode:              ${isDryRun ? 'DRY RUN (Preview Only)' : 'LIVE EXECUTION'}`);
  console.log(` Age Threshold:     Older than ${olderThanHours} hour(s)`);
  console.log(` Timestamp:         ${new Date().toISOString()}`);
  console.log('------------------------------------------------------------\n');

  if (isExecute && !isCloudinaryConfigured()) {
    console.error('ERROR: Cloudinary credentials not configured. Live cleanup requires Cloudinary access.');
    process.exit(1);
  }

  await connectDB();

  try {
    const cutoffTime = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);

    // Find pending uploads that have exceeded the age threshold
    const candidates = await PendingUpload.find({
      status: 'pending',
      createdAt: { $lt: cutoffTime },
    });

    console.log(`Found ${candidates.length} candidate pending upload(s) older than ${olderThanHours}h.\n`);

    const stats = {
      totalCandidates: candidates.length,
      unreferencedFound: 0,
      cleanedUp: 0,
      skippedReferenced: 0,
      bytesReclaimed: 0,
      failedDeletions: 0,
    };

    for (const upload of candidates) {
      const publicId = upload.cloudinaryPublicId;

      // Verify that this asset is NOT referenced in any active or historical submission
      const isReferenced = await AssignmentSubmission.exists({
        $or: [
          { 'submittedFiles.cloudinaryPublicId': publicId },
          { 'history.submittedFiles.cloudinaryPublicId': publicId },
        ],
      });

      if (isReferenced) {
        // Asset is actually referenced by a submission; safeguard it and update status
        stats.skippedReferenced++;
        console.log(`[PROTECTED] Asset "${publicId}" is referenced in a submission. Marking consumed.`);
        if (isExecute) {
          upload.status = 'consumed';
          await upload.save();
        }
        continue;
      }

      stats.unreferencedFound++;
      stats.bytesReclaimed += upload.fileSize || 0;

      if (isDryRun) {
        console.log(
          `[DRY-RUN] Would delete unreferenced asset: "${publicId}" (${((upload.fileSize || 0) / 1024).toFixed(1)} KB, uploaded: ${upload.createdAt.toISOString()})`
        );
        stats.cleanedUp++;
      } else {
        try {
          console.log(`[DELETING] Deleting unreferenced asset "${publicId}" from Cloudinary...`);
          await cloudinaryStorageService.deleteAsset(publicId, {
            resourceType: upload.resourceType || 'raw',
            deliveryType: upload.deliveryType || 'authenticated',
          });

          upload.status = 'expired';
          await upload.save();

          stats.cleanedUp++;
          console.log(`[DELETED] Successfully removed asset "${publicId}".`);
        } catch (delErr) {
          console.error(`[ERROR] Failed to delete asset "${publicId}": ${delErr.message}`);
          stats.failedDeletions++;
        }
      }
    }

    console.log('\n============================================================');
    console.log(' Cleanup Summary Report');
    console.log('============================================================');
    console.log(` Total candidates scanned:    ${stats.totalCandidates}`);
    console.log(` Unreferenced assets found:   ${stats.unreferencedFound}`);
    console.log(` Assets cleaned up:           ${stats.cleanedUp} (${isDryRun ? 'simulated' : 'executed'})`);
    console.log(` Referenced assets protected: ${stats.skippedReferenced}`);
    console.log(` Failed deletions:            ${stats.failedDeletions}`);
    console.log(` Estimated storage reclaimed: ${(stats.bytesReclaimed / (1024 * 1024)).toFixed(2)} MB`);
    console.log('============================================================\n');

    if (isDryRun) {
      console.log('To execute the live cleanup, run:');
      console.log('  node scripts/cleanupAbandonedUploads.js --execute\n');
    }
  } catch (err) {
    console.error('Cleanup encountered an error:', err);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed.');
  }
};

if (require.main === module) {
  runCleanup();
}

module.exports = {
  runCleanup,
  parseArgs,
};

