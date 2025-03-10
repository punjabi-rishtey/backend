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


require("dotenv").config();

const registerAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // ✅ Check if all required fields are provided
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    // ✅ Validate email format
    if (!validator.isEmail(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    // ✅ Validate password strength
    if (!validator.isStrongPassword(password, {
      minLength: 8,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 1,
    })) {
      return res.status(400).json({
        message: "Password must be at least 8 characters long, contain an uppercase letter, a number, and a special character.",
      });
    }

    // ✅ Check if the admin already exists
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({ message: "Admin already exists with this email" });
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
      const token = jwt.sign({ id: admin._id, role: "admin" }, process.env.JWT_SECRET, { expiresIn: "7d" });
  
      res.json({ message: "Admin login successful", token });
    } catch (error) {
      console.error("Error logging in admin:", error);
      res.status(500).json({ error: "Server error" });
    }
  };
  



// ✅ Get Admin Dashboard Stats
const getAdminDashboard = async (req, res) => {
  try {
    // Fetch count for each category
    const totalUsers = await User.countDocuments({});
    const approvedUsers = await User.countDocuments({ status: "Approved" });
    const pendingUsers = await User.countDocuments({ status: "Pending" });
    const expiredUsers = await User.countDocuments({ status: "Expired" });
    const canceledUsers = await User.countDocuments({ status: "Canceled" });

    res.json({
      totalUsers,
      approvedUsers,
      pendingUsers,
      expiredUsers,
      canceledUsers,
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

    if (!["Total", "Approved", "Pending", "Expired", "Canceled"].includes(status)) {
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
const approveUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByIdAndUpdate(id, { status: "Approved" }, { new: true });
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({ message: "User approved successfully", user });
  } catch (error) {
    console.error("Error approving user:", error);
    res.status(500).json({ error: error.message });
  }
};

// ✅ 3. Block a user
const blockUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByIdAndUpdate(id, { status: "Canceled" }, { new: true });
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({ message: "User blocked successfully", user });
  } catch (error) {
    console.error("Error blocking user:", error);
    res.status(500).json({ error: error.message });
  }
};


const editUser = async (req, res) => {
  try {
    const { id } = req.params;  // Extracting user ID from request params
    const updates = req.body;   // Extracting the updated user details from request body

    // Finding the user by ID and updating the provided fields
    const user = await User.findByIdAndUpdate(id, updates, { new: true }).select("-password");
    
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
      family: user.family || { family_value: "", family_type: "", mother: {}, father: {}, siblings: {} },
      education: user.education || { education_level: "", college_details: { passout_year: "" }, school_details: {} },
      profession: user.profession || { occupation: "", work_address: { address: "", city: "" } },
      astrology: user.astrology || { rashi_nakshatra: "", gotra: "" },
      location: user.location || { address: "", city: "" }
    };

    res.json(completeUser);
  } catch (error) {
    console.error("Error fetching user details:", error);
    res.status(500).json({ error: error.message });
  }
};


// ✅ Add User from Admin
const addUserFromAdmin = async (req, res) => {
  try {
    const { name, email, password, mobile, gender, dob, religion, marital_status, preferences } = req.body;

    // ✅ Validate required fields
    if (!name || !email || !password || !mobile || !gender || !dob || !religion || !marital_status || !preferences) {
      return res.status(400).json({ message: "All required fields must be provided, including preferences." });
    }

    if (!preferences.preference1 || !preferences.preference2 || !preferences.preference3) {
      return res.status(400).json({ message: "All three preferences must be selected." });
    }

    // ✅ Check if user already exists
    const existingUser = await User.findOne({ $or: [{ email }, { mobile }] });
    if (existingUser) {
      return res.status(400).json({ message: "Email or Mobile number already exists." });
    }

    // ✅ Hash password before saving
    const hashedPassword = await bcrypt.hash(password, 10);

    console.log("Request Body:", req.body);

    // ✅ Create new user
    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
      mobile,
      gender,
      dob,
      religion,
      marital_status,
      status: "Pending"
    });

    // ✅ Save Preferences
    const preferenceDoc = await Preference.create({
      user: newUser._id,
      preference1: preferences.preference1,
      preference2: preferences.preference2,
      preference3: preferences.preference3
    });

    // ✅ Link Preferences to User
    newUser.preferences = preferenceDoc._id;
    await newUser.save();

    res.status(201).json({ message: "User Added Successfully by Admin", user: newUser });
  } catch (error) {
    console.error("Error adding user from admin:", error);
    res.status(500).json({ error: error.message });
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
    const totalUsers = await User.countDocuments({});
    const approvedUsers = await User.countDocuments({ status: "Approved" });
    const pendingUsers = await User.countDocuments({ status: "Pending" });
    const expiredUsers = await User.countDocuments({ status: "Expired" });
    const canceledUsers = await User.countDocuments({ status: "Canceled" });

    res.json({
      total_users: totalUsers,
      approved_users: approvedUsers,
      pending_users: pendingUsers,
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
      const inquiries = await Inquiry.find().sort({ createdAt: -1 });
      res.status(200).json(inquiries);
  } catch (error) {
      res.status(500).json({ error: "Server Error: Unable to fetch inquiries." });
  }
};

module.exports = { registerAdmin, loginAdmin, getAdminDashboard, getUsersByStatus, getUsersByStatus, approveUser, blockUser, editUser, addUserFromAdmin, getUserRegistrationsPerMonth, getUserStatusCounts, getAllUsers, getAllInquiries, getUserById}
