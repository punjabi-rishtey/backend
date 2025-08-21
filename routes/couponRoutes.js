// routes/couponRoutes.js
const express = require('express');
const router = express.Router();
const couponController = require('../controllers/couponController');
const adminAuth = require('../middleware/adminAuthMiddleware');
const protect = require('../middleware/authMiddleware');

// Admin Routes
router.post('/', adminAuth, couponController.createCoupon);
router.get('/', adminAuth, couponController.getAllCoupons);
router.get('/:id', adminAuth, couponController.getCouponById);
router.put('/:id', adminAuth, couponController.updateCoupon);
router.delete('/:id', adminAuth, couponController.deleteCoupon);

// User Route - Validate Coupon
router.post('/validate', protect, couponController.validateCoupon);

module.exports = router;
