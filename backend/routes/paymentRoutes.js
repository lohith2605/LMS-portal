const express = require('express');
const router = express.Router();
const {
  createOrder,
  verifyPayment,
  getMyPayments,
} = require('../controllers/paymentController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

// All payment endpoints require authenticated student or admin session
router.use(protect);
router.use(restrictTo('student', 'admin'));

router.post('/create-order', createOrder);
router.post('/verify', verifyPayment);
router.get('/my-payments', getMyPayments);

module.exports = router;

