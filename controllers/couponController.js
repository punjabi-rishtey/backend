// controllers/couponController.js
const Coupon = require('../models/Coupon');

const normalizeCouponInput = (body, options = {}) => {
  const updates = {};
  const allowPartial = options.partial === true;
  const toBoolean = (value) => {
    if (typeof value === "boolean") return value;
    if (typeof value === "string") {
      return value.toLowerCase() === "true";
    }
    return Boolean(value);
  };

  if (body.code !== undefined || !allowPartial) {
    const code = String(body.code || "").trim().toUpperCase();
    if (!code) {
      throw new Error("Coupon code is required.");
    }
    if (!/^[A-Z0-9_-]{3,30}$/.test(code)) {
      throw new Error(
        "Coupon code must be 3-30 characters using letters, numbers, hyphen, or underscore."
      );
    }
    updates.code = code;
  }

  if (body.discountType !== undefined || !allowPartial) {
    if (!["percentage", "flat"].includes(body.discountType)) {
      throw new Error("Discount type must be percentage or flat.");
    }
    updates.discountType = body.discountType;
  }

  if (body.discountValue !== undefined || !allowPartial) {
    const discountValue = Number(body.discountValue);
    if (!Number.isFinite(discountValue) || discountValue <= 0) {
      throw new Error("Discount value must be greater than 0.");
    }
    updates.discountValue = discountValue;
  }

  if (body.isActive !== undefined) {
    updates.isActive = toBoolean(body.isActive);
  } else if (!allowPartial) {
    updates.isActive = true;
  }

  const discountType = updates.discountType || body.discountType;
  const discountValue =
    updates.discountValue !== undefined ? updates.discountValue : body.discountValue;
  if (discountType === "percentage" && Number(discountValue) > 100) {
    throw new Error("Percentage discount cannot be more than 100%.");
  }

  return updates;
};

// CREATE
exports.createCoupon = async (req, res) => {
  try {
    const couponData = normalizeCouponInput(req.body);

    const existing = await Coupon.findOne({ code: couponData.code });
    if (existing) {
      return res.status(400).json({ message: 'Coupon code already exists.' });
    }

    const coupon = new Coupon(couponData);

    await coupon.save();
    res.status(201).json({ message: 'Coupon created successfully', coupon });
  } catch (error) {
    console.error('Error creating coupon:', error);
    res.status(400).json({ message: error.message || 'Unable to create coupon.' });
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
    const existingCoupon = await Coupon.findById(id);
    if (!existingCoupon) {
      return res.status(404).json({ message: 'Coupon not found.' });
    }

    const updates = normalizeCouponInput(
      {
        ...existingCoupon.toObject(),
        ...req.body,
      },
      { partial: true }
    );

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'No fields provided for update.' });
    }

    if (updates.code) {
      const duplicate = await Coupon.findOne({ code: updates.code, _id: { $ne: id } });
      if (duplicate) {
        return res.status(400).json({ message: 'Coupon code already exists.' });
      }
    }

    const updatedCoupon = await Coupon.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });

    if (!updatedCoupon) return res.status(404).json({ message: 'Coupon not found.' });

    res.status(200).json({ message: 'Coupon updated successfully', updatedCoupon });
  } catch (error) {
    console.error('Error updating coupon:', error);
    res.status(400).json({ message: error.message || 'Unable to update coupon.' });
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

    const coupon = await Coupon.findOne({ code: code.trim().toUpperCase(), isActive: true });
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
