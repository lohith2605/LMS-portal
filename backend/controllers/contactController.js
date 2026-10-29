const ContactMessage = require('../models/ContactMessage');
const { logger } = require('../utils/logger');

/**
 * @desc    Submit a new contact / support inquiry
 * @route   POST /api/contact
 * @access  Public
 */
const submitContactMessage = async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
      return res.status(400).json({
        success: false,
        error: 'Please fill in all required fields (name, email, subject, and message).',
      });
    }

    const trimmedName = String(name).trim();
    const trimmedEmail = String(email).trim().toLowerCase();
    const trimmedSubject = String(subject).trim();
    const trimmedMessage = String(message).trim();

    if (trimmedName.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Name must be at least 2 characters long.',
      });
    }

    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a valid email address.',
      });
    }

    if (trimmedSubject.length < 3) {
      return res.status(400).json({
        success: false,
        error: 'Subject must be at least 3 characters long.',
      });
    }

    if (trimmedMessage.length < 10) {
      return res.status(400).json({
        success: false,
        error: 'Message must be at least 10 characters long.',
      });
    }

    const savedMessage = await ContactMessage.create({
      name: trimmedName,
      email: trimmedEmail,
      subject: trimmedSubject,
      message: trimmedMessage,
    });

    logger.info(`New contact message received from ${trimmedEmail} (ID: ${savedMessage._id})`);

    return res.status(201).json({
      success: true,
      message: 'Thank you for reaching out! Your message has been received by our support team.',
      ticketId: savedMessage._id,
    });
  } catch (error) {
    logger.error(`Failed to save contact message: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'An internal server error occurred while processing your message. Please try again later.',
    });
  }
};

module.exports = {
  submitContactMessage,
};
