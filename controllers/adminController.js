const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const validator = require("validator");
const Admin = require("../models/Admin"); // Ensure you have an Admin
const User = require("../models/User");
const Profession = require("../models/Profession");
const Family = require("../models/Family");
const Education = require("../models/Education");
const Astrology = require("../models/Astrology");
const Inquiry = require("../models/inquiryModel");
const Preference = require("../models/Preference");
const Subscription = require("../models/Subscription");
const Coupon = require("../models/Coupon");
const Message = require("../models/Message");
const Review = require("../models/Review");
const Testimonial = require("../models/Testimonial");
const cloudinary = require("../config/cloudinary");
const QrCode = require("../models/QRCode");
const sendEmail = require("../utils/sendEmail");
const {
  ProfilePhotoError,
  uploadProfilePhotoFiles,
  uploadProfilePhotosForUser,
  deleteProfilePhotoForUser,
  destroyProfilePhotoAssets,
} = require("../services/profilePhotoService");

const sendProfilePhotoError = (res, error, fallbackMessage) => {
  const statusCode = error instanceof ProfilePhotoError ? error.statusCode : 500;
  const payload =
    statusCode >= 500
      ? { error: fallbackMessage, details: error.message }
      : { message: error.message };

  return res.status(statusCode).json(payload);
};

const INQUIRY_STATUSES = ["open", "replied", "closed"];

const serializeInquiry = (inquiry) => {
  const data = typeof inquiry.toObject === "function" ? inquiry.toObject() : inquiry;

  return {
    ...data,
    status: INQUIRY_STATUSES.includes(data.status) ? data.status : "open",
    replies: Array.isArray(data.replies) ? data.replies : [],
  };
};

const getAdminInfo = (req) => ({
  id: req.admin?._id || req.admin?.id,
  email: req.admin?.email,
});

const ADMIN_MANUAL_PAYMENT_PLACEHOLDER = "approved by admin";

const calculateExpiryDateFromMonths = (startDate, durationMonths) => {
  const expiresAt = new Date(startDate);
  expiresAt.setMonth(expiresAt.getMonth() + durationMonths);
  return expiresAt;
};

const deriveDurationMonthsFromDates = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    return null;
  }

  let months =
    (end.getFullYear() - start.getFullYear()) * 12 +
    (end.getMonth() - start.getMonth());

  if (months < 1) {
    return 1;
  }

  const adjustedEnd = new Date(start);
  adjustedEnd.setMonth(adjustedEnd.getMonth() + months);

  if (adjustedEnd < end) {
    months += 1;
  }

  return months;
};

const resolveSubscriptionDurationMonths = (subscription) => {
  const storedDuration = Number(subscription?.membershipDurationMonths);

  if (Number.isInteger(storedDuration) && storedDuration > 0) {
    return storedDuration;
  }

  return deriveDurationMonthsFromDates(
    subscription?.createdAt,
    subscription?.expiresAt
  );
};

const inferSubscriptionSource = (subscription) => {
  if (
    ["user_payment", "admin_manual", "legacy"].includes(subscription?.source)
  ) {
    return subscription.source;
  }

  if (subscription?.screenshotUrl === ADMIN_MANUAL_PAYMENT_PLACEHOLDER) {
    return "admin_manual";
  }

  return "legacy";
};

require("dotenv").config();

const registerAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // ✅ Check if all required fields are provided
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    // ✅ Validate email format
    if (!validator.isEmail(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    // ✅ Validate password strength
    if (
      !validator.isStrongPassword(password, {
        minLength: 8,
        minLowercase: 1,
        minUppercase: 1,
        minNumbers: 1,
        minSymbols: 1,
      })
    ) {
      return res.status(400).json({
        message:
          "Password must be at least 8 characters long, contain an uppercase letter, a number, and a special character.",
      });
    }

    // ✅ Check if the admin already exists
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res
        .status(400)
        .json({ message: "Admin already exists with this email" });
    }

    // ✅ Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // ✅ Create new admin
    const admin = new Admin({ email, password: hashedPassword });
    await admin.save();

    res.status(201).json({ message: "Admin registered successfully" });
  } catch (error) {
    console.error("Error registering admin:", error);
    res.status(500).json({ error: "Server error" });
  }
};

const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // ✅ Find admin by email
    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    // ✅ Check password
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // ✅ Generate JWT Token for Admin
    const token = jwt.sign(
      { id: admin._id, role: "admin" },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ message: "Admin login successful", token });
  } catch (error) {
    console.error("Error logging in admin:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// ✅ Get Admin Dashboard Stats
const getAdminDashboard = async (req, res) => {
  try {
    const allowedDayRanges = new Set([7, 30, 90, 365]);
    const requestedDays = Number(req.query.days);
    const days = allowedDayRanges.has(requestedDays) ? requestedDays : 30;

    const now = new Date();
    const expiringCutoff = new Date(now);
    expiringCutoff.setDate(expiringCutoff.getDate() + 7);

    const recentApprovalsCutoff = new Date(now);
    recentApprovalsCutoff.setDate(recentApprovalsCutoff.getDate() - 7);

    const signupCutoff = new Date(now);
    signupCutoff.setHours(0, 0, 0, 0);
    signupCutoff.setDate(signupCutoff.getDate() - (days - 1));

    const activeUserFilter = { is_deleted: { $ne: true } };

    const [
      users,
      totalUsers,
      approvedUsers,
      pendingUsers,
      unapprovedUsers,
      incompleteUsers,
      expiredUsers,
      canceledUsers,
      successStories,
      activeCoupons,
      inquiries,
      messages,
      reviewCount,
      couponUsageStats,
      signupRows,
    ] = await Promise.all([
      User.find(activeUserFilter)
        .select("-password")
        .populate("family")
        .populate("education")
        .populate("profession")
        .populate("astrology"),
      User.countDocuments(activeUserFilter),
      User.countDocuments({ ...activeUserFilter, status: "Approved" }),
      User.countDocuments({ ...activeUserFilter, status: "Pending" }),
      User.countDocuments({ ...activeUserFilter, status: "Unapproved" }),
      User.countDocuments({ ...activeUserFilter, status: "Incomplete" }),
      User.countDocuments({ ...activeUserFilter, status: "Expired" }),
      User.countDocuments({ ...activeUserFilter, status: "Canceled" }),
      Testimonial.countDocuments({}),
      Coupon.countDocuments({ isActive: true }),
      Inquiry.find().select("status"),
      Message.find().select("expiresAt createdAt"),
      Review.countDocuments({}),
      Subscription.aggregate([
        {
          $match: {
            couponCode: { $nin: [null, ""] },
          },
        },
        {
          $group: {
            _id: null,
            couponUsageCount: { $sum: 1 },
            totalDiscountAmount: { $sum: { $ifNull: ["$discountAmount", 0] } },
          },
        },
      ]),
      User.aggregate([
        { $match: activeUserFilter },
        {
          $project: {
            signupAt: { $toDate: "$_id" },
          },
        },
        {
          $match: {
            signupAt: { $gte: signupCutoff },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$signupAt",
                timezone: "Asia/Kolkata",
              },
            },
            signups: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    const normalizedInquiries = inquiries.map(serializeInquiry);
    const inquiryCounts = normalizedInquiries.reduce(
      (counts, inquiry) => {
        counts[inquiry.status] += 1;
        return counts;
      },
      { open: 0, replied: 0, closed: 0 }
    );

    const avgProfileCompletion =
      users.length > 0
        ? Math.round(
            users.reduce(
              (total, user) => total + user.calculateProfileCompletion(),
              0
            ) / users.length
          )
        : 0;

    const recentApprovals = users.filter((user) => {
      if (user.status !== "Approved" || !user.metadata?.register_date) {
        return false;
      }

      const approvalDate = new Date(user.metadata.register_date);
      return approvalDate >= recentApprovalsCutoff && approvalDate <= now;
    }).length;

    const expiringSubscriptions = users.filter((user) => {
      if (user.status !== "Approved" || !user.metadata?.exp_date) {
        return false;
      }

      const expiryDate = new Date(user.metadata.exp_date);
      return expiryDate >= now && expiryDate <= expiringCutoff;
    }).length;

    const activeMessages = messages.filter((message) => {
      if (!message.expiresAt) {
        return false;
      }

      return new Date(message.expiresAt) >= now;
    }).length;

    const needsReviewUsers = pendingUsers + unapprovedUsers;

    const userStatusData = [
      { name: "Approved", value: approvedUsers },
      { name: "Pending", value: pendingUsers },
      { name: "Unapproved", value: unapprovedUsers },
      { name: "Incomplete", value: incompleteUsers },
      { name: "Expired", value: expiredUsers },
      { name: "Canceled", value: canceledUsers },
    ].filter((item) => item.value > 0);

    const signupLookup = new Map(signupRows.map((row) => [row._id, row.signups]));
    const signupData = [];

    for (let offset = days - 1; offset >= 0; offset -= 1) {
      const date = new Date(now);
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - offset);

      const isoDate = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
      }).format(date);

      signupData.push({
        date: isoDate,
        label: new Intl.DateTimeFormat("en-IN", {
          month: "short",
          day: "numeric",
          timeZone: "Asia/Kolkata",
        }).format(date),
        signups: signupLookup.get(isoDate) || 0,
      });
    }

    const couponUsageCount = couponUsageStats[0]?.couponUsageCount || 0;
    const totalDiscountAmount = couponUsageStats[0]?.totalDiscountAmount || 0;

    res.json({
      totalUsers,
      approvedUsers,
      pendingUsers,
      unapprovedUsers,
      incompleteUsers,
      needsReviewUsers,
      expiredUsers,
      canceledUsers,
      activeSubscriptions: approvedUsers,
      successStories,
      avgProfileCompletion,
      recentApprovals,
      expiringSubscriptions,
      activeCoupons,
      openInquiries: inquiryCounts.open,
      repliedInquiries: inquiryCounts.replied,
      closedInquiries: inquiryCounts.closed,
      activeMessages,
      totalMessages: messages.length,
      reviewCount,
      couponUsageCount,
      totalDiscountAmount,
      userStatusData,
      signupData,
      days,
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// ✅ 1. Get users based on status
const getUsersByStatus = async (req, res) => {
  try {
    const { status } = req.params;

    if (
      ![
        "Total",
        "Approved",
        "Pending",
        "Expired",
        "Canceled",
        "Unapproved",
        "Incomplete",
      ].includes(status)
    ) {
      return res.status(400).json({ message: "Invalid status" });
    }

    let query = {};
    if (status !== "Total") {
      query.status = status;
    }

    const users = await User.find(query).select("-password");
    res.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: error.message });
  }
};

// ✅ 2. Approve a user
// const approveUser = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { expiry } = req.query;

//     // Validate and parse expiry
//     const parsedExpiry = Number(expiry);
//     if (isNaN(parsedExpiry) || parsedExpiry <= 0) {
//       return res
//         .status(400)
//         .json({ message: "Invalid expiry value. Must be a positive number." });
//     }

//     const userdetail = await User.findById(id).select("-password"); // Exclude password for security
//     if (!userdetail) {
//       return res.status(404).json({ message: "User not found" });
//     }
//     console.log("> User to approve:", userdetail.name);
//     const fullName = userdetail.name;
//     const phoneNumber = userdetail.mobile;

//     // Calculate expiresAt
//     const currentDate = new Date();
//     const expiresAt = new Date(currentDate);
//     expiresAt.setMonth(currentDate.getMonth() + parsedExpiry);

//     // Check if subscription exists
//     let subscription = await Subscription.findOne({ user: id });
//     if (!subscription) {
//       // Create subscription document
//       subscription = new Subscription({
//         user: id,
//         fullName,
//         phoneNumber,
//         screenshotUrl: "approved by admin",
//         expiresAt,
//       });
//       await subscription.save();
//     } else {
//       // Update existing subscription's expiresAt
//       subscription.expiresAt = expiresAt;
//       await subscription.save();
//     }

//     // Update user status and expiry date
//     const user = await User.findByIdAndUpdate(
//       id,
//       { status: "Approved", "metadata.exp_date": expiresAt },
//       { new: true }
//     );
//     if (!user) return res.status(404).json({ message: "User not found" });

//     res.json({ message: "User approved successfully", user });
//   } catch (error) {
//     console.error("Error approving user:", error);
//     res.status(500).json({ error: error.message });
//   }
// };

const approveUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { expiry, startDate } = req.query;

    // Validate and parse expiry
    const parsedExpiry = Number(expiry);
    if (isNaN(parsedExpiry) || parsedExpiry <= 0) {
      return res
        .status(400)
        .json({ message: "Invalid expiry value. Must be a positive number." });
    }

    // Validate startDate
    const start = new Date(startDate);
    if (isNaN(start.getTime())) {
      return res
        .status(400)
        .json({ message: "Invalid start date. Must be a valid date." });
    }

    const userdetail = await User.findById(id).select("-password");
    if (!userdetail) {
      return res.status(404).json({ message: "User not found" });
    }
    const fullName = userdetail.name;
    const phoneNumber = userdetail.mobile;

    // Calculate expiresAt based on startDate
    const expiresAt = new Date(start);
    expiresAt.setMonth(start.getMonth() + parsedExpiry);

    // Check if subscription exists
    let subscription = await Subscription.findOne({ user: id });
    if (!subscription) {
      // Create subscription document
      subscription = new Subscription({
        user: id,
        fullName,
        phoneNumber,
        screenshotUrl: ADMIN_MANUAL_PAYMENT_PLACEHOLDER,
        expiresAt,
        createdAt: start,
        membershipDurationMonths: parsedExpiry,
        source: "admin_manual",
      });
      await subscription.save();
    } else {
      const subscriptionSource = inferSubscriptionSource(subscription);

      subscription.fullName = fullName;
      subscription.phoneNumber = phoneNumber;
      subscription.createdAt = start;
      subscription.expiresAt = expiresAt;
      subscription.membershipDurationMonths = parsedExpiry;
      subscription.source = subscriptionSource;

      if (
        subscriptionSource === "admin_manual" &&
        (!subscription.screenshotUrl ||
          subscription.screenshotUrl === ADMIN_MANUAL_PAYMENT_PLACEHOLDER)
      ) {
        subscription.screenshotUrl = ADMIN_MANUAL_PAYMENT_PLACEHOLDER;
      }

      await subscription.save();
    }

    // Update user status, register_date, and expiry date
    const user = await User.findByIdAndUpdate(
      id,
      {
        status: "Approved",
        "metadata.register_date": start,
        "metadata.exp_date": expiresAt,
      },
      { new: true }
    );
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({ message: "User approved successfully", user });
  } catch (error) {
    console.error("Error approving user:", error);
    res.status(500).json({ error: error.message });
  }
};

const approveSubscriptionPayment = async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const requestedDuration = Number(req.body?.membershipDurationMonths);

    if (!subscriptionId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: "Invalid subscription ID format." });
    }

    const subscription = await Subscription.findById(subscriptionId).populate(
      "user",
      "name mobile status is_deleted metadata"
    );

    if (!subscription) {
      return res.status(404).json({ message: "Payment request not found." });
    }

    if (!subscription.user || subscription.user.is_deleted) {
      return res.status(404).json({ message: "Linked user not found." });
    }

    const durationMonths =
      Number.isInteger(requestedDuration) && requestedDuration > 0
        ? requestedDuration
        : resolveSubscriptionDurationMonths(subscription);

    if (!durationMonths) {
      return res.status(400).json({
        message:
          "Unable to determine the membership duration for this payment request.",
      });
    }

    const approvalStart = new Date();
    const expiresAt = calculateExpiryDateFromMonths(
      approvalStart,
      durationMonths
    );

    subscription.fullName = subscription.user.name || subscription.fullName;
    subscription.phoneNumber = subscription.user.mobile || subscription.phoneNumber;
    subscription.createdAt = approvalStart;
    subscription.expiresAt = expiresAt;
    subscription.membershipDurationMonths = durationMonths;
    subscription.source = inferSubscriptionSource(subscription);

    await subscription.save();

    const user = await User.findByIdAndUpdate(
      subscription.user._id,
      {
        status: "Approved",
        "metadata.register_date": approvalStart,
        "metadata.exp_date": expiresAt,
      },
      { new: true }
    );

    return res.status(200).json({
      message: "Payment approved successfully.",
      user,
      subscription,
    });
  } catch (error) {
    console.error("Error approving subscription payment:", error);
    return res.status(500).json({ message: "Unable to approve payment." });
  }
};

const moveUserToPending = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: "Invalid user ID format" });
    }

    const user = await User.findById(id).select("-password");
    if (!user || user.is_deleted) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.status === "Pending") {
      return res.status(200).json({
        message: "User is already pending review",
        user,
      });
    }

    user.status = "Pending";
    user.metadata = user.metadata || {};
    user.metadata.exp_date = null;
    await user.save();

    return res.status(200).json({
      message: "User moved to pending review",
      user,
    });
  } catch (error) {
    console.error("Error moving user to pending:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ✅ 3. Block a user
const blockUser = async (req, res) => {
  try {
    const { id } = req.params;

    const currentDate = new Date();
    const expiresAt = new Date(currentDate);

    // Update user's status and expiry date
    const user = await User.findByIdAndUpdate(
      id,
      { status: "Canceled", "metadata.exp_date": expiresAt },
      { new: true }
    );
    if (!user) return res.status(404).json({ message: "User not found" });

    // Update subscription's expiry date
    const subscription = await Subscription.findOneAndUpdate(
      { user: id },
      { expiresAt },
      { new: true }
    );

    res.json({ message: "User blocked successfully", user });
  } catch (error) {
    console.error("Error blocking user:", error);
    res.status(500).json({ error: error.message });
  }
};

const editUser = async (req, res) => {
  try {
    const { id } = req.params; // Extracting user ID from request params
    const updates = req.body; // Extracting the updated user details from request body

    delete updates.profile_pictures;
    delete updates.profile_picture;
    delete updates.profile_picture_assets;

    // Handle new optional text fields sanitization
    const sanitizeText = (v) => {
      if (v === undefined) return undefined;
      if (v === null) return "";
      if (typeof v === "string") return v.trim();
      if (typeof v === "number") return String(v);
      return { __invalid: true };
    };
    if (Object.prototype.hasOwnProperty.call(updates, "about_myself")) {
      const val = sanitizeText(updates.about_myself);
      if (val && val.__invalid)
        return res.status(400).json({ error: "about_myself must be a string" });
      if (typeof val === "string" && val.length > 300) {
        return res
          .status(400)
          .json({ error: "about_myself must be at most 300 characters" });
      }
      updates.about_myself = val;
    }
    if (Object.prototype.hasOwnProperty.call(updates, "looking_for")) {
      const val = sanitizeText(updates.looking_for);
      if (val && val.__invalid)
        return res.status(400).json({ error: "looking_for must be a string" });
      if (typeof val === "string" && val.length > 300) {
        return res
          .status(400)
          .json({ error: "looking_for must be at most 300 characters" });
      }
      updates.looking_for = val;
    }

    if (Object.prototype.hasOwnProperty.call(updates, "email")) {
      const email = sanitizeText(updates.email)?.toLowerCase();
      if (!email || !validator.isEmail(email)) {
        return res.status(400).json({ message: "Please enter a valid email." });
      }
      const existingUser = await User.findOne({ email, _id: { $ne: id } });
      if (existingUser) {
        return res.status(400).json({ message: "Email is already in use." });
      }
      updates.email = email;
    }

    if (Object.prototype.hasOwnProperty.call(updates, "mobile")) {
      const mobile = sanitizeText(updates.mobile);
      if (!/^\d{10}$/.test(mobile)) {
        return res
          .status(400)
          .json({ message: "Mobile number must be 10 digits." });
      }
      const existingUser = await User.findOne({ mobile, _id: { $ne: id } });
      if (existingUser) {
        return res
          .status(400)
          .json({ message: "Mobile number is already in use." });
      }
      updates.mobile = mobile;
    }

    // Normalize nested lifestyle updates, especially abroad_ready -> boolean|null
    if (updates && typeof updates === "object" && updates.lifestyle) {
      updates.lifestyle = { ...updates.lifestyle };
      if (
        Object.prototype.hasOwnProperty.call(
          updates.lifestyle,
          "abroadReady"
        ) &&
        !Object.prototype.hasOwnProperty.call(updates.lifestyle, "abroad_ready")
      ) {
        updates.lifestyle.abroad_ready = updates.lifestyle.abroadReady;
        delete updates.lifestyle.abroadReady;
      }
      if (
        Object.prototype.hasOwnProperty.call(updates.lifestyle, "abroad_ready")
      ) {
        const val = updates.lifestyle.abroad_ready;
        if (val === null || val === undefined || val === "") {
          updates.lifestyle.abroad_ready = null;
        } else if (typeof val === "string") {
          const lower = val.toLowerCase();
          if (["true", "1", "yes", "y"].includes(lower))
            updates.lifestyle.abroad_ready = true;
          else if (["false", "0", "no", "n"].includes(lower))
            updates.lifestyle.abroad_ready = false;
          else if (lower === "null") updates.lifestyle.abroad_ready = null;
          else updates.lifestyle.abroad_ready = null;
        } else if (typeof val !== "boolean") {
          updates.lifestyle.abroad_ready = null;
        }
      }
    }

    // Finding the user by ID and updating the provided fields
    const user = await User.findByIdAndUpdate(id, updates, {
      new: true,
    }).select("-password");

    if (!user) return res.status(404).json({ message: "User not found" }); // Handle case if user doesn't exist

    res.json({ message: "User updated successfully", user }); // Send success response
  } catch (error) {
    console.error("Error editing user:", error);
    res.status(500).json({ error: error.message }); // Handle errors
  }
};
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id)
      .select("-password") // Exclude password for security
      .populate("family")
      .populate("education")
      .populate("profession")
      .populate("astrology");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // ✅ Ensure all nested objects are not undefined
    const completeUser = {
      ...user.toObject(),
      family: user.family || {
        family_value: "",
        family_type: "",
        mother: {},
        father: {},
        siblings: {},
      },
      education: user.education || {
        education_level: "",
        college_details: { passout_year: "" },
        school_details: {},
      },
      profession: user.profession || {
        occupation: "",
        work_address: { address: "", city: "" },
      },
      astrology: user.astrology || { rashi_nakshatra: "", gotra: "" },
      location: user.location || { address: "", city: "" },
    };

    res.json(completeUser);
  } catch (error) {
    console.error("Error fetching user details:", error);
    res.status(500).json({ error: error.message });
  }
};

// ✅ Add User from Admin
const addUserFromAdmin = async (req, res) => {
  let uploadedProfileAssets = [];

  try {
    const parseJsonField = (value, fieldName) => {
      if (!value) return {};
      if (typeof value === "object") return value;
      try {
        return JSON.parse(value);
      } catch (error) {
        throw new Error(`Invalid ${fieldName} format.`);
      }
    };

    const userData = parseJsonField(req.body.userData, "userData");
    const parsedPreferences = parseJsonField(req.body.preferences, "preferences");
    const {
      name,
      email,
      password,
      mobile,
      gender,
      dob,
      religion,
      marital_status,
    } = req.body;
    const preferences = parsedPreferences;
    const sanitizeText = (v) => {
      if (v === undefined) return undefined;
      if (v === null) return "";
      if (typeof v === "string") return v.trim();
      if (typeof v === "number") return String(v);
      return { __invalid: true };
    };
    const about_myself = sanitizeText(
      req.body.about_myself ?? userData.about_myself
    );
    const looking_for = sanitizeText(
      req.body.looking_for ?? userData.looking_for
    );
    if (
      (about_myself && about_myself.__invalid) ||
      (looking_for && looking_for.__invalid)
    ) {
      return res
        .status(400)
        .json({ error: "about_myself and looking_for must be strings" });
    }
    if (typeof about_myself === "string" && about_myself.length > 300) {
      return res
        .status(400)
        .json({ error: "about_myself must be at most 300 characters" });
    }
    if (typeof looking_for === "string" && looking_for.length > 300) {
      return res
        .status(400)
        .json({ error: "looking_for must be at most 300 characters" });
    }

    // ✅ Validate required fields
    if (
      !name ||
      !email ||
      !password ||
      !mobile ||
      !gender ||
      !dob ||
      !religion ||
      !marital_status ||
      !preferences
    ) {
      return res.status(400).json({
        message: "All required fields must be provided, including preferences.",
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const normalizedMobile = String(mobile).trim();

    if (!validator.isEmail(normalizedEmail)) {
      return res.status(400).json({ message: "Please enter a valid email." });
    }

    if (!/^\d{10}$/.test(normalizedMobile)) {
      return res
        .status(400)
        .json({ message: "Mobile number must be 10 digits." });
    }

    if (String(password).length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters." });
    }

    if (
      !preferences.preference1 ||
      !preferences.preference2 ||
      !preferences.preference3
    ) {
      return res
        .status(400)
        .json({ message: "All three preferences must be selected." });
    }

    // ✅ Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email: normalizedEmail }, { mobile: normalizedMobile }],
    });
    if (existingUser) {
      return res
        .status(400)
        .json({ message: "Email or Mobile number already exists." });
    }

    // ✅ Hash password before saving
    // const hashedPassword = await bcrypt.hash(password, 10);

    if (req.files && req.files.length > 0) {
      uploadedProfileAssets = await uploadProfilePhotoFiles(req.files, "admin");
    }

    // ✅ Create new user
    const newUser = await User.create({
      name: sanitizeText(name),
      email: normalizedEmail,
      password,
      mobile: normalizedMobile,
      gender,
      dob,
      religion,
      marital_status,
      status: "Pending",
      caste: sanitizeText(req.body.caste) || undefined,
      height: sanitizeText(req.body.height) || undefined,
      mangalik: sanitizeText(req.body.mangalik) || undefined,
      language: sanitizeText(req.body.language) || undefined,
      hobbies:
        typeof req.body.hobbies === "string"
          ? req.body.hobbies
              .split(",")
              .map((hobby) => hobby.trim())
              .filter(Boolean)
          : [],
      birth_details: userData.birth_details || {},
      physical_attributes: userData.physical_attributes || {},
      lifestyle: userData.lifestyle || {},
      location: userData.location || {},
      profile_pictures: uploadedProfileAssets.map((asset) => asset.url),
      profile_picture_assets: uploadedProfileAssets,
      profile_picture: uploadedProfileAssets[0]?.url || "",
      ...(about_myself !== undefined && { about_myself }),
      ...(looking_for !== undefined && { looking_for }),
    });

    // ✅ Save Preferences
    const preferenceDoc = await Preference.create({
      user: newUser._id,
      preference1: preferences.preference1,
      preference2: preferences.preference2,
      preference3: preferences.preference3,
    });

    // ✅ Link Preferences to User
    newUser.preferences = preferenceDoc._id;
    await newUser.save();

    const family = new Family({ user: newUser._id, user_name: name });
    const education = new Education({ user: newUser._id, user_name: name });
    const profession = new Profession({ user: newUser._id, user_name: name });
    const astrology = new Astrology({ user: newUser._id, user_name: name });

    await Promise.all([
      family.save(),
      education.save(),
      profession.save(),
      astrology.save(),
    ]);

    newUser.family = family._id;
    newUser.education = education._id;
    newUser.profession = profession._id;
    newUser.astrology = astrology._id;
    await newUser.save();

    res
      .status(201)
      .json({ message: "User Added Successfully by Admin", user: newUser });
  } catch (error) {
    console.error("Error adding user from admin:", error);
    if (uploadedProfileAssets.length > 0) {
      await destroyProfilePhotoAssets(uploadedProfileAssets, {
        ignoreErrors: true,
      });
    }
    const statusCode = error.message?.startsWith("Invalid ") ? 400 : 500;
    res.status(statusCode).json({ message: error.message });
  }
};

// 📌 API to Get User Registrations Per Month (Last 6 Months)
const getUserRegistrationsPerMonth = async (req, res) => {
  try {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const usersPerMonth = await User.aggregate([
      {
        $match: { "metadata.register_date": { $gte: sixMonthsAgo } },
      },
      {
        $group: {
          _id: { $month: "$metadata.register_date" },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } }, // Sort by month
    ]);

    res.json(usersPerMonth);
  } catch (error) {
    console.error("Error fetching user registrations:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// 📌 API to Get User Status Counts
const getUserStatusCounts = async (req, res) => {
  try {
    const activeUserFilter = { is_deleted: { $ne: true } };
    const totalUsers = await User.countDocuments(activeUserFilter);
    const approvedUsers = await User.countDocuments({
      ...activeUserFilter,
      status: "Approved",
    });
    const pendingUsers = await User.countDocuments({
      ...activeUserFilter,
      status: "Pending",
    });
    const unapprovedUsers = await User.countDocuments({
      ...activeUserFilter,
      status: "Unapproved",
    });
    const incompleteUsers = await User.countDocuments({
      ...activeUserFilter,
      status: "Incomplete",
    });
    const expiredUsers = await User.countDocuments({
      ...activeUserFilter,
      status: "Expired",
    });
    const canceledUsers = await User.countDocuments({
      ...activeUserFilter,
      status: "Canceled",
    });

    res.json({
      total_users: totalUsers,
      approved_users: approvedUsers,
      pending_users: pendingUsers,
      unapproved_users: unapprovedUsers,
      incomplete_users: incompleteUsers,
      needs_review_users: pendingUsers + unapprovedUsers,
      expired_users: expiredUsers,
      canceled_users: canceledUsers,
    });
  } catch (error) {
    console.error("Error fetching user status counts:", error);
    res.status(500).json({ error: "Server error" });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const users = await User.find()
      .populate("family")
      .populate("education")
      .populate("profession")
      .populate("astrology");

    res.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// ✅ Fetch All Inquiries (Admin Side)
const getAllInquiries = async (req, res) => {
  try {
    const { status } = req.query;

    if (status && !INQUIRY_STATUSES.includes(status)) {
      return res.status(400).json({ message: "Invalid inquiry status." });
    }

    const inquiries = await Inquiry.find().sort({ createdAt: -1 });
    const normalizedInquiries = inquiries.map(serializeInquiry);
    const filteredInquiries = status
      ? normalizedInquiries.filter((inquiry) => inquiry.status === status)
      : normalizedInquiries;

    res.status(200).json(filteredInquiries);
  } catch (error) {
    res.status(500).json({ error: "Server Error: Unable to fetch inquiries." });
  }
};

const replyToInquiry = async (req, res) => {
  try {
    const { id } = req.params;
    const message = String(req.body.message || "").trim();

    if (!validator.isMongoId(id)) {
      return res.status(400).json({ message: "Invalid inquiry ID." });
    }

    if (!message) {
      return res.status(400).json({ message: "Reply message is required." });
    }

    const inquiry = await Inquiry.findById(id);
    if (!inquiry) {
      return res.status(404).json({ message: "Inquiry not found." });
    }

    const currentStatus = serializeInquiry(inquiry).status;
    if (currentStatus === "closed") {
      return res
        .status(400)
        .json({ message: "Closed inquiries cannot be replied to." });
    }

    const emailText = [
      `Hi ${inquiry.name},`,
      "",
      message,
      "",
      "Punjabi Rishtey Support",
    ].join("\n");

    await sendEmail(inquiry.email, `Re: ${inquiry.subject}`, emailText);

    const admin = getAdminInfo(req);
    inquiry.status = "replied";
    inquiry.replies = Array.isArray(inquiry.replies) ? inquiry.replies : [];
    inquiry.replies.push({
      message,
      sentAt: new Date(),
      admin,
    });

    await inquiry.save();

    res.status(200).json({
      message: "Reply sent successfully.",
      inquiry: serializeInquiry(inquiry),
    });
  } catch (error) {
    console.error("Error replying to inquiry:", error);
    res.status(500).json({
      message: "Unable to send the reply right now. Please try again later.",
    });
  }
};

const closeInquiry = async (req, res) => {
  try {
    const { id } = req.params;

    if (!validator.isMongoId(id)) {
      return res.status(400).json({ message: "Invalid inquiry ID." });
    }

    const inquiry = await Inquiry.findById(id);

    if (!inquiry) {
      return res.status(404).json({ message: "Inquiry not found." });
    }

    const currentStatus = serializeInquiry(inquiry).status;
    if (currentStatus === "closed") {
      return res.status(200).json({
        message: "Inquiry is already closed.",
        inquiry: serializeInquiry(inquiry),
      });
    }

    inquiry.status = "closed";
    inquiry.closedAt = new Date();
    inquiry.closedBy = getAdminInfo(req);

    await inquiry.save();

    res.status(200).json({
      message: "Inquiry closed successfully.",
      inquiry: serializeInquiry(inquiry),
    });
  } catch (error) {
    console.error("Error closing inquiry:", error);
    res.status(500).json({ message: "Unable to close inquiry." });
  }
};

// const getAllSubscriptions = async (req, res) => {
//   try {
//     // Fetch all subscriptions and populate the "user" field with some user info.
//     const subscriptions = await Subscription.find({})
//       .populate("user", "name email mobile") // Adjust fields as needed
//       .sort({ createdAt: -1 }); // Optional: sort newest first

//     return res.json({ success: true, subscriptions });
//   } catch (error) {
//     console.error("Error fetching subscriptions:", error);
//     return res
//       .status(500)
//       .json({ error: "Server error", details: error.message });
//   }
// };

// Get user status by ID

const getAllSubscriptions = async (req, res) => {
  try {
    const allowedStatuses = ["pending", "approved", "rejected", "expired"];
    const requestedStatus = req.query.status;

    if (requestedStatus && !allowedStatuses.includes(requestedStatus)) {
      return res.status(400).json({ message: "Invalid payment status." });
    }

    // Fetch all subscriptions and populate the "user" field with some user info
    // const subscriptions = await Subscription.find({})
    //   .populate("user", "name email mobile status")
    //   .sort({ createdAt: -1 }); // Sort newest first
    const subscriptions = await Subscription.find({ user: { $ne: null } })
      .populate("user", "name email mobile status is_deleted")
      .sort({ createdAt: -1 });

    // Map subscriptions to include payment status
    const subscriptionsWithStatus = subscriptions.map((subscription) => {
      const userStatus = subscription.user?.status;
      const source = inferSubscriptionSource(subscription);
      let paymentStatus = "pending";

      // Check if user exists and is not deleted
      if (!subscription.user || subscription.user.is_deleted) {
        paymentStatus = "rejected";
      } else if (userStatus === "Canceled") {
        paymentStatus = "rejected";
      } else if (
        userStatus === "Expired" ||
        (subscription.expiresAt && new Date(subscription.expiresAt) < new Date())
      ) {
        paymentStatus = "expired";
      } else if (userStatus === "Approved") {
        paymentStatus = "approved";
      }

      return {
        ...subscription.toObject(),
        source,
        paymentStatus,
      };
    });

    const submittedSubscriptions = subscriptionsWithStatus.filter(
      (subscription) => subscription.source !== "admin_manual"
    );

    const filteredSubscriptions = requestedStatus
      ? submittedSubscriptions.filter(
          (subscription) => subscription.paymentStatus === requestedStatus
        )
      : submittedSubscriptions;

    return res.json({ success: true, subscriptions: filteredSubscriptions });
  } catch (error) {
    console.error("Error fetching subscriptions:", error);
    return res
      .status(500)
      .json({ error: "Server error", details: error.message });
  }
};

const getUserStatus = async (req, res) => {
  try {
    const userId = req.params.id;

    // Validate user ID
    if (!userId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: "Invalid user ID format" });
    }

    // Find user and select status/deleted state
    const user = await User.findById(userId).select("status is_deleted");

    if (!user || user.is_deleted) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      status: user.status,
      message: "User status retrieved successfully",
    });
  } catch (error) {
    console.error("Error fetching user status:", error);
    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Delete user by ID (soft delete)
const deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;

    // Validate user ID
    if (!userId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: "Invalid user ID format" });
    }

    const user = await User.findById(userId).select(
      "name email status is_deleted deletion_metadata metadata"
    );
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.is_deleted) {
      return res.status(200).json({
        message: "User is already deleted",
        user,
      });
    }

    const now = new Date();
    user.is_deleted = true;
    user.deletion_metadata = {
      ...(user.deletion_metadata || {}),
      deleted_at: now,
      deleted_by: req.admin?._id,
      previous_status: user.status,
      restored_at: undefined,
      restored_by: undefined,
    };
    user.status = "Canceled";
    user.metadata = user.metadata || {};
    user.metadata.exp_date = now;
    await user.save();

    await Subscription.findOneAndUpdate(
      { user: userId },
      { expiresAt: now },
      { new: true }
    );

    return res.status(200).json({
      message: "User soft deleted successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        status: user.status,
        is_deleted: user.is_deleted,
      },
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
};

const restoreUser = async (req, res) => {
  try {
    const userId = req.params.id;

    if (!userId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: "Invalid user ID format" });
    }

    const user = await User.findById(userId).select(
      "name email status is_deleted deletion_metadata"
    );
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.is_deleted) {
      return res.status(200).json({
        message: "User is already active",
        user,
      });
    }

    const previousStatus =
      user.deletion_metadata?.previous_status &&
      user.deletion_metadata.previous_status !== "Canceled"
        ? user.deletion_metadata.previous_status
        : "Pending";

    user.is_deleted = false;
    user.status = previousStatus;
    user.deletion_metadata = {
      ...(user.deletion_metadata || {}),
      restored_at: new Date(),
      restored_by: req.admin?._id,
    };

    await user.save();

    return res.status(200).json({
      message: "User restored successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        status: user.status,
        is_deleted: user.is_deleted,
      },
    });
  } catch (error) {
    console.error("Error restoring user:", error);
    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
};

const uploadUserProfilePictures = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("+profile_picture_assets");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const result = await uploadProfilePhotosForUser(user, req.files, "admin");
    return res.json({
      message: "Profile pictures uploaded successfully",
      profile_pictures: result.profile_pictures,
      profile_picture: result.profile_picture,
    });
  } catch (error) {
    console.error("Error uploading profile pictures by admin:", error);
    return sendProfilePhotoError(res, error, "Server error uploading profile pictures");
  }
};

const deleteUserProfilePicture = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("+profile_picture_assets");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const result = await deleteProfilePhotoForUser(user, req.body.imagePath);
    return res.json({
      message: "Profile picture deleted successfully",
      profile_pictures: result.profile_pictures,
      profile_picture: result.profile_picture,
    });
  } catch (error) {
    console.error("Error deleting profile picture by admin:", error);
    return sendProfilePhotoError(res, error, "Server error deleting profile picture");
  }
};

const changeUserPasswordByAdmin = async (req, res) => {
  try {
    const { userId } = req.params; // The ID of the user whose password needs to be changed
    const newPassword = String(req.body.newPassword || ""); // The new password for the user

    // Validate userId
    if (!userId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: "Invalid user ID format." });
    }

    if (newPassword.trim().length < 6) {
      return res.status(400).json({
        message: "New password must be at least 6 characters long.",
      });
    }

    // Find the user by ID
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Hash the new password
    // const salt = await bcrypt.genSalt(10);
    // user.password = await bcrypt.hash(newPassword, salt);
    user.password = newPassword;

    // Save the updated user (this will trigger the pre-save hook for password hashing, but we've already hashed it,
    // so it's safe. Mongoose will recognize `isModified('password')` as true)
    await user.save();

    res
      .status(200)
      .json({ message: "User password changed successfully by admin." });
  } catch (error) {
    console.error("Error changing user password by admin:", error);
    res.status(500).json({ error: "Server error." });
  }
};

// QR
const uploadQR = async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();

    if (!req.file || !name) {
      return res.status(400).json({ error: "UPI ID and QR image are required." });
    }

    if (name.length > 100) {
      return res.status(400).json({ error: "UPI ID must be 100 characters or less." });
    }

    if (!req.file.mimetype?.startsWith("image/")) {
      return res.status(400).json({ error: "Please upload a valid image file." });
    }

    if (req.file.size > 5 * 1024 * 1024) {
      return res.status(400).json({ error: "QR image must be 5MB or smaller." });
    }

    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: "qrcodes" },
        (error, uploadResult) => {
          if (error) {
            reject(error);
            return;
          }

          resolve(uploadResult);
        }
      );

      uploadStream.end(req.file.buffer);
    });

    await QrCode.deleteMany({});
    const record = await QrCode.create({
      name,
      imageUrl: result.secure_url,
    });

    return res.status(201).json(record);
  } catch (err) {
    console.error("Error uploading QR code:", err);
    return res.status(500).json({ error: "Unable to upload QR code." });
  }
};

const getQR = async (req, res) => {
  const record = await QrCode.findOne().sort({ createdAt: -1 });
  if (!record) return res.status(404).json({ error: "No QR found" });
  res.json(record);
};

module.exports = {
  getQR,
  uploadQR,
  changeUserPasswordByAdmin,
  registerAdmin,
  loginAdmin,
  getAdminDashboard,
  getUsersByStatus,
  getUsersByStatus,
  approveUser,
  moveUserToPending,
  blockUser,
  editUser,
  addUserFromAdmin,
  getUserRegistrationsPerMonth,
  getUserStatusCounts,
  getAllUsers,
  getAllInquiries,
  replyToInquiry,
  closeInquiry,
  getUserById,
  getAllSubscriptions,
  approveSubscriptionPayment,
  getUserStatus,
  deleteUser,
  restoreUser,
  uploadUserProfilePictures,
  deleteUserProfilePicture,
};
