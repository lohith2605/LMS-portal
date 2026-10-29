const multer = require('multer');
const path = require('path');

// Prohibited dangerous extensions
const DANGEROUS_EXTENSIONS = new Set([
  'exe', 'bat', 'cmd', 'sh', 'bin', 'vbs', 'msi', 'com', 'scr', 'pif'
]);

// Memory storage keeps file bytes in buffer for direct Cloudinary streaming
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname || '').toLowerCase().replace(/^\./, '');

  if (DANGEROUS_EXTENSIONS.has(ext)) {
    const error = new Error(`File extension ".${ext}" is not permitted for security reasons.`);
    error.statusCode = 400;
    return cb(error, false);
  }

  cb(null, true);
};

// 50 MB maximum hard ceiling (assignment-specific lower limits will be checked in controller)
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50 MB
    files: 10,                  // Max 10 files per submission
  },
});

const uploadSingle = (fieldName = 'file') => (req, res, next) => {
  upload.single(fieldName)(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File size exceeds maximum upload limit of 50 MB.' });
      }
      return res.status(err.statusCode || 400).json({ error: err.message });
    }
    next();
  });
};

// Profile picture image formats
const ALLOWED_AVATAR_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp']);
const ALLOWED_AVATAR_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const avatarFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname || '').toLowerCase().replace(/^\./, '');
  if (!ALLOWED_AVATAR_EXTENSIONS.has(ext) || (file.mimetype && !ALLOWED_AVATAR_MIMES.has(file.mimetype))) {
    const error = new Error('Invalid image format. Profile pictures must be JPG, JPEG, PNG, or WebP.');
    error.statusCode = 400;
    return cb(error, false);
  }
  cb(null, true);
};

const avatarUpload = multer({
  storage,
  fileFilter: avatarFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB max
    files: 1,
  },
});

const uploadAvatar = (req, res, next) => {
  avatarUpload.single('avatar')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'Image file size exceeds the 5 MB limit. Please select a smaller photo.' });
      }
      return res.status(err.statusCode || 400).json({ error: err.message });
    }
    next();
  });
};

module.exports = {
  upload,
  uploadSingle,
  uploadAvatar,
};

