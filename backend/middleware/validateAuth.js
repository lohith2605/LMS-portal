const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validate registration request body
 */
const validateRegister = (req, res, next) => {
  const { name, email, password, role } = req.body;

  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    return res.status(400).json({
      error: 'Please provide a valid full name (minimum 2 characters).',
    });
  }

  if (name.trim().length > 100) {
    return res.status(400).json({
      error: 'Name cannot exceed 100 characters.',
    });
  }

  if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
    return res.status(400).json({
      error: 'Please provide a valid email address.',
    });
  }

  if (!password || typeof password !== 'string') {
    return res.status(400).json({
      error: 'Password is required.',
    });
  }

  if (password.length < 8) {
    return res.status(400).json({
      error: 'Password must be at least 8 characters long.',
    });
  }

  if (password.length > 128) {
    return res.status(400).json({
      error: 'Password cannot exceed 128 characters.',
    });
  }

  // Must contain at least one letter and at least one digit
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    return res.status(400).json({
      error: 'Password must contain at least one letter and one number.',
    });
  }

  // Public registration cannot self-assign admin role
  if (role && role.toLowerCase() === 'admin') {
    return res.status(403).json({
      error: 'Administrator accounts cannot be created via public registration.',
    });
  }

  // Normalize input
  req.body.name = name.trim();
  req.body.email = email.trim().toLowerCase();

  next();
};

/**
 * Validate login request body
 */
const validateLogin = (req, res, next) => {
  const { email, password } = req.body;

  if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
    return res.status(400).json({
      error: 'Please provide a valid email address.',
    });
  }

  if (!password || typeof password !== 'string' || password.length === 0) {
    return res.status(400).json({
      error: 'Please provide your password.',
    });
  }

  req.body.email = email.trim().toLowerCase();
  next();
};

/**
 * Validate forgot password request
 */
const validateForgotPassword = (req, res, next) => {
  const { email } = req.body;

  if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
    return res.status(400).json({
      error: 'Please provide a valid email address.',
    });
  }

  req.body.email = email.trim().toLowerCase();
  next();
};

/**
 * Validate password reset submission
 */
const validateResetPassword = (req, res, next) => {
  const { token, newPassword } = req.body;

  if (!token || typeof token !== 'string' || token.trim().length === 0) {
    return res.status(400).json({
      error: 'Reset token is required.',
    });
  }

  if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
    return res.status(400).json({
      error: 'New password must be at least 8 characters long.',
    });
  }

  if (newPassword.length > 128) {
    return res.status(400).json({
      error: 'New password cannot exceed 128 characters.',
    });
  }

  if (!/[a-zA-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
    return res.status(400).json({
      error: 'New password must contain at least one letter and one number.',
    });
  }

  req.body.token = token.trim();
  next();
};

/**
 * Validate change password request (authenticated user)
 */
const validateChangePassword = (req, res, next) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || typeof currentPassword !== 'string') {
    return res.status(400).json({
      error: 'Current password is required.',
    });
  }

  if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
    return res.status(400).json({
      error: 'New password must be at least 8 characters long.',
    });
  }

  if (newPassword.length > 128) {
    return res.status(400).json({
      error: 'New password cannot exceed 128 characters.',
    });
  }

  if (!/[a-zA-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
    return res.status(400).json({
      error: 'New password must contain at least one letter and one number.',
    });
  }

  next();
};

module.exports = {
  validateRegister,
  validateLogin,
  validateForgotPassword,
  validateResetPassword,
  validateChangePassword,
};
