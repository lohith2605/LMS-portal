const crypto = require('crypto');
const path = require('path');
const { Readable } = require('stream');
const { cloudinary, isCloudinaryConfigured } = require('../config/cloudinary');
const { logger } = require('../utils/logger');

// Allowed image formats handled as resource_type 'image'
const IMAGE_FORMATS = new Set(['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg']);

// Known file magic signatures for content integrity verification
const FILE_SIGNATURES = {
  pdf: [0x25, 0x50, 0x44, 0x46], // %PDF
  png: [0x89, 0x50, 0x4e, 0x47], // \x89PNG
  jpg: [0xff, 0xd8, 0xff],       // JPEG SOI
  jpeg: [0xff, 0xd8, 0xff],      // JPEG SOI
  zip: [0x50, 0x4b, 0x03, 0x04], // PK\x03\x04
  docx: [0x50, 0x4b, 0x03, 0x04],// DOCX (ZIP format)
};

/**
 * Validates file buffer against known magic bytes to detect obvious content/extension spoofing
 */
const validateFileSignature = (buffer, extension) => {
  if (!buffer || buffer.length === 0) {
    return { valid: false, error: 'File content is empty or zero bytes.' };
  }

  const ext = (extension || '').toLowerCase().replace(/^\./, '');
  const expectedSignature = FILE_SIGNATURES[ext];

  if (expectedSignature) {
    if (buffer.length < expectedSignature.length) {
      return { valid: false, error: `File buffer too small to be a valid .${ext} file.` };
    }
    for (let i = 0; i < expectedSignature.length; i++) {
      if (buffer[i] !== expectedSignature[i]) {
        return {
          valid: false,
          error: `File signature mismatch: File content does not match .${ext} format.`,
        };
      }
    }
  }

  return { valid: true };
};

/**
 * Determine Cloudinary resource_type ('image' or 'raw') based on extension
 */
const getResourceType = (extension) => {
  const ext = (extension || '').toLowerCase().replace(/^\./, '');
  return IMAGE_FORMATS.has(ext) ? 'image' : 'raw';
};

/**
 * Upload an assignment deliverable file buffer directly to Cloudinary using private/authenticated delivery
 */
const uploadAssignmentFile = async (bufferOrOptions, options = {}) => {
  let buffer;
  let originalName = 'file';
  let assignmentId = 'default';
  let studentId = 'default';
  let mimeType = 'application/octet-stream';

  if (Buffer.isBuffer(bufferOrOptions)) {
    buffer = bufferOrOptions;
    if (typeof options === 'object' && options !== null) {
      originalName = options.originalName || 'file';
      assignmentId = options.assignmentId || 'default';
      studentId = options.studentId || 'default';
      mimeType = options.mimeType || 'application/octet-stream';
    }
  } else if (bufferOrOptions && typeof bufferOrOptions === 'object') {
    buffer = bufferOrOptions.buffer;
    originalName = bufferOrOptions.originalName || 'file';
    assignmentId = bufferOrOptions.assignmentId || 'default';
    studentId = bufferOrOptions.studentId || 'default';
    mimeType = bufferOrOptions.mimeType || 'application/octet-stream';
  }

  if (!buffer || buffer.length === 0) {
    throw new Error('Upload payload contains empty file buffer.');
  }

  if (!isCloudinaryConfigured() && process.env.NODE_ENV !== 'test') {
    throw new Error('Cloudinary storage service is not configured on the server.');
  }

  const ext = path.extname(originalName || '').toLowerCase().replace(/^\./, '') || 'bin';
  const resourceType = getResourceType(ext);

  // Validate magic signature where available
  const sigCheck = validateFileSignature(buffer, ext);
  if (!sigCheck.valid) {
    throw new Error(sigCheck.error);
  }

  // Construct secure, non-guessable asset identifier
  const randomSuffix = crypto.randomBytes(8).toString('hex');
  const cleanStudentId = String(studentId).replace(/[^a-zA-Z0-9_-]/g, '');
  const cleanAssignmentId = String(assignmentId).replace(/[^a-zA-Z0-9_-]/g, '');
  const publicId = `learnspace/assignments/${cleanAssignmentId}/${cleanStudentId}_${Date.now()}_${randomSuffix}`;

  const uploadOptions = {
    public_id: publicId,
    resource_type: resourceType,
    type: 'authenticated', // Private authenticated delivery - files cannot be accessed anonymously
    overwrite: false,
    use_filename: false,
    unique_filename: true,
  };

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(uploadOptions, (err, result) => {
      if (err) {
        logger.error(`Cloudinary upload failed: ${err.message || 'Unknown provider error'}`);
        return reject(new Error('Failed to upload file to Cloudinary storage.'));
      }

      logger.success(`Cloudinary upload success: ${result.public_id} (${result.bytes} bytes, type: ${result.type})`);

      const checksum = crypto.createHash('sha256').update(buffer).digest('hex');

      resolve({
        originalName: (originalName || 'file').trim(),
        cloudinaryPublicId: result.public_id,
        resourceType: result.resource_type || resourceType,
        deliveryType: result.type || 'authenticated',
        format: result.format || ext,
        fileSize: result.bytes || buffer.length,
        mimeType: mimeType || 'application/octet-stream',
        checksum,
        storageProvider: 'cloudinary',
        uploadedAt: new Date(),
      });
    });

    Readable.from([buffer]).pipe(uploadStream);
  });
};

/**
 * Generate a short-lived authorized download URL for a private Cloudinary asset
 */
const generateAuthorizedDownloadUrl = ({
  cloudinaryPublicId,
  format,
  resourceType = 'raw',
  deliveryType = 'authenticated',
  originalName,
  expiresInSeconds = 3600,
}) => {
  if (!cloudinaryPublicId) {
    throw new Error('Missing Cloudinary public ID for download URL generation.');
  }

  const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const cleanExt = (format || '').replace(/^\./, '');

  try {
    // Generate signed download URL using Cloudinary SDK
    const downloadUrl = cloudinary.utils.private_download_url(cloudinaryPublicId, cleanExt, {
      resource_type: resourceType,
      type: deliveryType,
      expires_at: expiresAt,
      attachment: true,
    });

    return downloadUrl;
  } catch (err) {
    logger.error(`Failed to generate Cloudinary download URL: ${err.message}`);
    // Fallback to signed URL generator
    const signedUrl = cloudinary.url(cloudinaryPublicId, {
      resource_type: resourceType,
      type: deliveryType,
      sign_url: true,
      secure: true,
      format: cleanExt || undefined,
      flags: originalName ? `attachment:${encodeURIComponent(originalName)}` : 'attachment',
    });
    return signedUrl;
  }
};

/**
 * Safely delete an unreferenced Cloudinary asset
 */
const deleteAsset = async (publicIdOrOptions, options = {}) => {
  let cloudinaryPublicId;
  let resourceType = 'raw';
  let deliveryType = 'authenticated';

  if (typeof publicIdOrOptions === 'string') {
    cloudinaryPublicId = publicIdOrOptions;
    if (options.resourceType) resourceType = options.resourceType;
    if (options.deliveryType) deliveryType = options.deliveryType;
  } else if (publicIdOrOptions && typeof publicIdOrOptions === 'object') {
    cloudinaryPublicId = publicIdOrOptions.cloudinaryPublicId;
    resourceType = publicIdOrOptions.resourceType || 'raw';
    deliveryType = publicIdOrOptions.deliveryType || 'authenticated';
  }

  if (!cloudinaryPublicId) return { result: 'skipped' };

  if (!isCloudinaryConfigured() && process.env.NODE_ENV !== 'test') {
    logger.warn(`Skipping Cloudinary asset deletion (storage not configured): ${cloudinaryPublicId}`);
    return { result: 'skipped_not_configured' };
  }

  try {
    const res = await cloudinary.uploader.destroy(cloudinaryPublicId, {
      resource_type: resourceType,
      type: deliveryType,
      invalidate: true,
    });
    logger.info(`Cloudinary asset destroyed: ${cloudinaryPublicId} (status: ${res.result})`);
    return res;
  } catch (err) {
    logger.error(`Failed to delete Cloudinary asset ${cloudinaryPublicId}: ${err.message}`);
    return { result: 'error', error: err.message };
  }
};

module.exports = {
  uploadAssignmentFile,
  generateAuthorizedDownloadUrl,
  deleteAsset,
  validateFileSignature,
  getResourceType,
  isCloudinaryConfigured,
};
