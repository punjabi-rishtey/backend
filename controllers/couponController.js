// controllers/couponController.js
const Coupon = require('../models/Coupon');

// CREATE
exports.createCoupon = async (req, res) => {
  try {
    const { code, discountType, discountValue, isActive } = req.body;

    if (!code || !discountType || discountValue == null || isActive == null) {
      return res.status(400).json({ message: 'All fields are required.' });
    }

    const existing = await Coupon.findOne({ code: code.trim() });
    if (existing) {
      return res.status(400).json({ message: 'Coupon code already exists.' });
    }

    const coupon = new Coupon({
      code: code.trim(),
      discountType,
      discountValue,
      isActive
    });

    await coupon.save();
    res.status(201).json({ message: 'Coupon created successfully', coupon });
  } catch (error) {
    console.error('Error creating coupon:', error);
    res.status(500).json({ message: 'Internal server error', error });
  }
};

// READ ALL
exports.getAllCoupons = async (req, res) => {
  try {
    const coupons = await Coupon.find();
    res.status(200).json(coupons);
  } catch (error) {
    console.error('Error fetching coupons:', error);
    res.status(500).json({ message: 'Internal server error', error });
  }
};

// READ BY ID
exports.getCouponById = async (req, res) => {
  try {
    const { id } = req.params;
    const coupon = await Coupon.findById(id);
    if (!coupon) return res.status(404).json({ message: 'Coupon not found' });
    res.status(200).json(coupon);
  } catch (error) {
    console.error('Error fetching coupon:', error);
    res.status(500).json({ message: 'Internal server error', error });
  }
};

// UPDATE
exports.updateCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    const { code, discountType, discountValue, isActive } = req.body;

    const updates = {};
    if (code !== undefined) updates.code = code;
    if (discountType !== undefined) updates.discountType = discountType;
    if (discountValue !== undefined) updates.discountValue = discountValue;
    if (isActive !== undefined) updates.isActive = isActive;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'No fields provided for update.' });
    }

    const updatedCoupon = await Coupon.findByIdAndUpdate(id, updates, { new: true });

    if (!updatedCoupon) return res.status(404).json({ message: 'Coupon not found.' });

    res.status(200).json({ message: 'Coupon updated successfully', updatedCoupon });
  } catch (error) {
    console.error('Error updating coupon:', error);
    res.status(500).json({ message: 'Internal server error', error });
  }
};

// DELETE
exports.deleteCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedCoupon = await Coupon.findByIdAndDelete(id);
    if (!deletedCoupon) return res.status(404).json({ message: 'Coupon not found' });
    res.status(200).json({ message: 'Coupon deleted successfully' });
  } catch (error) {
    console.error('Error deleting coupon:', error);
    res.status(500).json({ message: 'Internal server error', error });
  }
};

// VALIDATE
exports.validateCoupon = async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ message: 'Coupon code is required.' });

    const coupon = await Coupon.findOne({ code: code.trim(), isActive: true });
    if (!coupon) return res.status(404).json({ message: 'Coupon not found or inactive.' });

    res.status(200).json({
      message: 'Coupon applied successfully.',
      discountType: coupon.discountType,
      discountValue: coupon.discountValue
    });
  } catch (error) {
    console.error('Error validating coupon:', error);
    res.status(500).json({ message: 'Server error', error });
  }
};
