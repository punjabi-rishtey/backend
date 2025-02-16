const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const validator = require("validator");
const Admin = require("../models/Admin"); // Ensure you have an Admin 
const User = require("../models/User");
const Inquiry = require("../models/inquiryModel");


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

// ✅ 4. Edit user details
const editUser = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const user = await User.findByIdAndUpdate(id, updates, { new: true }).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({ message: "User updated successfully", user });
  } catch (error) {
    console.error("Error editing user:", error);
    res.status(500).json({ error: error.message });
  }
};


// ✅ Get user details by ID
// const getUserById = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const user = await User.findById(id).select("-password"); // Exclude password field

//     if (!user) return res.status(404).json({ message: "User not found" });

//     res.json(user);
//   } catch (error) {
//     console.error("Error fetching user details:", error);
//     res.status(500).json({ error: error.message });
//   }
// };


const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id)
      .select("-password") // Exclude password field
      .populate({ path: "family", strictPopulate: false }) // ✅ Properly populate
      .populate({ path: "education", strictPopulate: false }) // ✅ Properly populate
      .populate({ path: "profession", strictPopulate: false }) // ✅ Properly populate
      .populate({ path: "astrology", strictPopulate: false }); // ✅ Properly populate

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (error) {
    console.error("Error fetching user details:", error);
    res.status(500).json({ error: error.message });
  }
};






const addUserFromAdmin = async (req, res) => {
  try {
    const { name, email, password, mobile, gender, dob, religion, marital_status } = req.body;

    // ✅ Check if all required fields are provided
    if (!name || !email || !password || !mobile || !gender || !dob || !religion || !marital_status) {
      return res.status(400).json({ message: "All required fields must be provided." });
    }

    // ✅ Check if email is valid
    if (!validator.isEmail(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    // ✅ Check if password is strong
    if (!validator.isStrongPassword(password, { minLength: 8, minNumbers: 1, minUppercase: 1, minSymbols: 1 })) {
      return res.status(400).json({
        message: "Password must be at least 8 characters long, include a number, an uppercase letter, and a special symbol."
      });
    }

    // ✅ Ensure mobile number is exactly 10 digits
    if (!/^\d{10}$/.test(mobile)) {
      return res.status(400).json({ message: "Invalid mobile number. It must be 10 digits." });
    }

    // ✅ Check if email or mobile already exists
    const existingUser = await User.findOne({ $or: [{ email }, { mobile }] });
    if (existingUser) {
      return res.status(400).json({ message: "Email or Mobile number already exists." });
    }

    // ✅ Hash password before saving
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // ✅ Save new user
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      mobile,
      gender,
      dob,
      religion,
      marital_status,
      status: "Pending", // Default status will be Pending
    });

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
      .populate("family_details")
      .populate("education_details")
      .populate("profession_details")
      .populate("astrology_details");

    res.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Server error" });
  }
};


// ✅ Submit Inquiry (User Side)
const submitInquiry = async (req, res) => {
  try {
      const { name, email, phone, subject, message } = req.body;

      if (!name || !email || !phone || !subject || !message) {
          return res.status(400).json({ error: "All fields are required." });
      }

      const inquiry = new Inquiry({ name, email, phone, subject, message });
      await inquiry.save();
      res.status(201).json({ message: "Inquiry submitted successfully!" });

  } catch (error) {
      res.status(500).json({ error: "Server Error: Unable to submit inquiry." });
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

module.exports = { registerAdmin, loginAdmin, getAdminDashboard, getUsersByStatus, getUsersByStatus, approveUser, blockUser, editUser, addUserFromAdmin, getUserRegistrationsPerMonth, getUserStatusCounts, getAllUsers, getAllInquiries, submitInquiry, getUserById}
