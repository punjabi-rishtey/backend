const User = require("../models/User");
const Family = require("../models/Family");  
const Education = require("../models/Education");  
const Profession = require("../models/Profession");  
const Astrology = require("../models/Astrology");  
const Preference = require("../models/Preference");  // ✅ Added Preference Model
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const path = require("path");
const validator = require("validator");
const fs = require("fs");
const sendEmail = require("../utils/sendEmail");
const crypto = require("crypto");

const Inquiry = require("../models/inquiryModel");




// const registerUser = async (req, res) => {
//   try {
//     const user = new User(req.body);
//     await user.save();
//     res.status(201).json({ message: "User Registered Successfully" });
//   } catch (error) {
//     res.status(400).json({ error: error.message });
//   }
// };


// const registerUser = async (req, res) => {
//   try {
//     const { name, email, password, mobile, gender, dob, religion, marital_status } = req.body;

//     // ✅ Check if all required fields are provided
//     if (!name || !email || !password || !mobile || !gender || !dob || !religion || !marital_status) {
//       return res.status(400).json({ message: "All required fields must be provided." });
//     }

//     // ✅ Check if email is valid
//     if (!validator.isEmail(email)) {
//       return res.status(400).json({ message: "Invalid email format" });
//     }

    

//     // ✅ Check if password is strong
//     if (!validator.isStrongPassword(password, { minLength: 8, minNumbers: 1, minUppercase: 1, minSymbols: 1 })) {
//       return res.status(400).json({
//         message: "Password must be at least 8 characters long, include a number, an uppercase letter, and a special symbol."
//       });
//     }

//     // ✅ Ensure mobile number is exactly 10 digits
//     if (!/^\d{10}$/.test(mobile)) {
//       return res.status(400).json({ message: "Invalid mobile number. It must be 10 digits." });
//     }

//     // ✅ Check if email or mobile already exists
//     const existingUser = await User.findOne({ $or: [{ email }, { mobile }] });
//     if (existingUser) {
//       return res.status(400).json({ message: "Email or Mobile number already exists." });
//     }

//     // ✅ Save new user
//     const user = new User({ ...req.body, status: "Pending" });
//     await user.save();

//     res.status(201).json({ message: "User Registered Successfully" });
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// };



// const registerUser = async (req, res) => {
//   try {
//     const {
//       // User Fields
//       name, email, password, mobile, gender, dob, religion, marital_status,
//       height, caste, location, hobbies, mangalik, language, birth_details, 
//       physical_attributes, lifestyle,

//       // Family Fields
//       family_value, family_size, mother, father, siblings,

//       // Education Fields
//       education_level, education_field, qualification_details,

//       // Profession Fields
//       occupation, designation, working_with, working_as, income, work_address,

//       // Astrology Fields
//       rashi_nakshatra, gotra, gotra_mama
//     } = req.body;

//     // ✅ Ensure all required fields are provided
//     if (!name || !email || !password || !mobile || !gender || !dob || !religion || !marital_status ||
//         !family_value || !family_size || !mother || !father || !siblings ||
//         !education_level || !education_field || !qualification_details ||
//         !occupation || !designation || !working_with || !working_as || !income || !work_address ||
//         !rashi_nakshatra || !gotra || !gotra_mama) {
//       return res.status(400).json({ message: "All required fields must be provided." });
//     }

//     // ✅ Validate email format
//     if (!validator.isEmail(email)) {
//       return res.status(400).json({ message: "Invalid email format" });
//     }

//     // ✅ Validate password strength
//     if (!validator.isStrongPassword(password, { minLength: 8, minNumbers: 1, minUppercase: 1, minSymbols: 1 })) {
//       return res.status(400).json({
//         message: "Password must be at least 8 characters long, include a number, an uppercase letter, and a special symbol."
//       });
//     }

//     // ✅ Validate mobile number format
//     if (!/^\d{10}$/.test(mobile)) {
//       return res.status(400).json({ message: "Invalid mobile number. It must be 10 digits." });
//     }

//     // ✅ Check if email or mobile already exists
//     const existingUser = await User.findOne({ $or: [{ email }, { mobile }] });
//     if (existingUser) {
//       return res.status(400).json({ message: "Email or Mobile number already exists." });
//     }

//     // ✅ Create the user document
//     const user = new User({
//       name, email, password, mobile, gender, dob, religion, marital_status, height, caste, 
//       location, hobbies, mangalik, language, birth_details, physical_attributes, lifestyle,
//       status: "Pending"
//     });
//     await user.save();

//     // ✅ Create related documents with `user_name`
//     const family = new Family({ user: user._id, user_name: name, family_value, family_size, mother, father, siblings });
//     const education = new Education({ user: user._id, user_name: name, education_level, education_field, qualification_details });
//     const profession = new Profession({ user: user._id, user_name: name, occupation, designation, working_with, working_as, income, work_address });
//     const astrology = new Astrology({ user: user._id, user_name: name, rashi_nakshatra, gotra, gotra_mama });

//     // ✅ Save related documents
//     await Promise.all([family.save(), education.save(), profession.save(), astrology.save()]);

//     // ✅ Update user with references
//     user.family = family._id;
//     user.education = education._id;
//     user.profession = profession._id;
//     user.astrology = astrology._id;
//     await user.save();

//     res.status(201).json({ message: "User Registered Successfully", user });
//   } catch (error) {
//     console.error("❌ Error registering user:", error);
//     res.status(500).json({ error: error.message });
//   }
// };


const registerUser = async (req, res) => {
  try {
    const { name, email, password, mobile, gender, dob, religion, marital_status, preferences } = req.body;

    if (!name || !email || !password || !mobile || !gender || !dob || !religion || !marital_status || !preferences) {
      return res.status(400).json({ message: "All required fields must be provided." });
    }

    if (!Array.isArray(preferences) || preferences.length !== 3) {
      return res.status(400).json({ message: "You must select exactly 3 preferences." });
    }

    if (!validator.isEmail(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    if (!/^\d{10}$/.test(mobile)) {
      return res.status(400).json({ message: "Invalid mobile number. It must be 10 digits." });
    }

    const existingUser = await User.findOne({ $or: [{ email }, { mobile }] });
    if (existingUser) {
      return res.status(400).json({ message: "Email or Mobile number already exists." });
    }

    // ✅ Create the user document (Remove password hashing here!)
    const user = new User({
      name, email, password, mobile, gender, dob, religion, marital_status,
      status: "Pending"
    });

    await user.save();

    // ✅ Store preferences in the Preference model
    const preference = new Preference({
      user: user._id,
      preference1: preferences[0],
      preference2: preferences[1],
      preference3: preferences[2]
    });
    await preference.save();

    const family = new Family({ user: user._id, user_name: name });
    const education = new Education({ user: user._id, user_name: name });
    const profession = new Profession({ user: user._id, user_name: name });
    const astrology = new Astrology({ user: user._id, user_name: name });

    await Promise.all([family.save(), education.save(), profession.save(), astrology.save()]);

    user.family = family._id;
    user.education = education._id;
    user.profession = profession._id;
    user.astrology = astrology._id;
    user.preferences = preference._id;
    await user.save();

    res.status(201).json({ message: "User Registered Successfully", user });
  } catch (error) {
    console.error("❌ Error registering user:", error);
    res.status(500).json({ error: error.message });
  }
};







// const loginUser = async (req, res) => {
//   try {
//     const { email, password } = req.body;
//     const user = await User.findOne({ email });
//     if (!user) return res.status(404).json({ message: "User Not Found" });

//     const isMatch = await bcrypt.compare(password, user.password);
//     if (!isMatch) return res.status(400).json({ message: "Invalid Credentials" });

//     const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
//     res.json({ token, user });
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// };


const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log("🔍 Login Attempt for Email:", email);

    // ✅ Find user by email
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User Not Found" });

    // ✅ Compare entered password with hashed password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      console.log("❌ Password does not match!");
      return res.status(400).json({ message: "Invalid Credentials" });
    }

    console.log("✅ Password Matched! Generating JWT...");

    // ✅ Generate JWT Token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
    res.json({ token, user });
  } catch (error) {
    console.error("❌ Error in login:", error);
    res.status(500).json({ error: error.message });
  }
};


const searchMatches = async (req, res) => {
  try {
    const { gender, caste, religion, marital_status, city, minAge, maxAge } = req.query;

    let query = {};

    if (gender) query.gender = gender;
    if (caste) query.caste = caste;
    if (religion) query.religion = religion;
    if (marital_status) query.marital_status = marital_status;
    if (city) query["location.city"] = city;
    if (minAge && maxAge) query.age = { $gte: parseInt(minAge), $lte: parseInt(maxAge) };

    const matches = await User.find(query).select("-password"); // Exclude password
    res.json(matches);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};



// const getUserProfile = async (req, res) => {
//   try {
//     const user = await User.findById(req.params.id).select("-password"); // Exclude password
//     if (!user) return res.status(404).json({ message: "User Not Found" });

//     // ✅ Manually fetch related data
//     const family = await Family.findOne({ user_id: req.params.id });
//     const education = await Education.findOne({ user_id: req.params.id });
//     const profession = await Profession.findOne({ user_id: req.params.id });
//     const astrology = await Astrology.findOne({ user_id: req.params.id });

//     const profilePicUrl = user.profile_picture ? `${req.protocol}://${req.get("host")}${user.profile_picture}` : null;

//     // ✅ Ensure `profile_pictures` is always an array (avoid undefined errors)
//     const profilePicturesUrls = Array.isArray(user.profile_pictures) 
//       ? user.profile_pictures.map(pic => `${req.protocol}://${req.get("host")}${pic}`)
//       : [];

//     // ✅ Attach related data to user response
//     const userProfile = {
//       ...user.toObject(), // Convert Mongoose document to plain object
//       profile_picture: profilePicUrl,
//       profile_pictures: profilePicturesUrls, // Multiple pics
//       family_details: family || null,
//       education_details: education || null,
//       profession_details: profession || null,
//       astrology_details: astrology || null
//     };

//     res.json(userProfile);
//   } catch (error) {
//     console.error("Error fetching user profile:", error);
//     res.status(500).json({ error: error.message });
//   }
// };



const getUserProfile = async (req, res) => {
  try {
    const userId = req.params.id;

    // Fetch user details and exclude password
    const user = await User.findById(userId).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User Not Found" });
    }

    // Fetch related data using manual queries (for better control)
    const [family, education, profession, astrology] = await Promise.all([
      Family.findOne({ user: userId }) || {}, // If not found, return empty object
      Education.findOne({ user: userId }) || {},
      Profession.findOne({ user: userId }) || {},
      Astrology.findOne({ user: userId }) || {}
    ]);

    // Ensure `profile_pictures` is always an array (avoid undefined errors)
    const profilePicturesUrls = Array.isArray(user.profile_pictures)
      ? user.profile_pictures.map(pic => `${req.protocol}://${req.get("host")}${pic}`)
      : [];

    // ✅ Construct user profile response
    const userProfile = {
      ...user.toObject(), // Convert Mongoose document to plain object
      profile_pictures: profilePicturesUrls, // Multiple profile pictures
      family_details: family, // Attach family details
      education_details: education, // Attach education details
      profession_details: profession, // Attach profession details
      astrology_details: astrology // Attach astrology details
    };

    res.json(userProfile);
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({ error: error.message });
  }
};




const updateUserProfile = async (req, res) => {
  try {
    const userId = req.params.id;

    // Define allowed fields for update
    const allowedUpdates = [
      "name", "gender", "dob", "height", "religion", "mobile",
      "email", "hobbies", "status", "mangalik", "language",
      "marital_status", "birth_details", "physical_attributes",
      "lifestyle", "location"
    ];

    // Filter only allowed fields
    const updates = {};
    for (const key in req.body) {
      if (allowedUpdates.includes(key)) {
        updates[key] = req.body[key];
      }
    }

    // Prevent duplicate mobile number error
    if (updates.mobile) {
      const existingUser = await User.findOne({ mobile: updates.mobile });
      if (existingUser && existingUser._id.toString() !== userId) {
        return res.status(400).json({ error: "Mobile number already in use." });
      }
    }

    // Fetch the current user before update
    const currentUser = await User.findById(userId);
    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Perform the update in the User collection
    const updatedUser = await User.findByIdAndUpdate(userId, updates, { new: true, runValidators: true }).select("-password");

    // ✅ If name is updated, update related schemas
    if (updates.name && updates.name !== currentUser.name) {
      await Promise.all([
        Education.updateMany({ user: userId }, { user_name: updates.name }),
        Family.updateMany({ user: userId }, { user_name: updates.name }),
        Profession.updateMany({ user: userId }, { user_name: updates.name }),
        Astrology.updateMany({ user: userId }, { user_name: updates.name })
      ]);
    }

    res.json({ message: "Profile updated successfully", user: updatedUser });
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({ error: error.message });
  }
};




const uploadProfilePictures = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "No files uploaded" });
    }

    const userId = req.params.id;
    const uploadedImages = req.files.map(file => `/uploads/${file.filename}`);

    // ✅ Find user
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User Not Found" });

    // ✅ Append new images to existing images (max 10)
    user.profile_pictures = [...(user.profile_pictures || []), ...uploadedImages].slice(-10);
    await user.save();

    res.json({ message: "Profile pictures uploaded successfully", profile_pictures: user.profile_pictures });
  } catch (error) {
    console.error("Error uploading profile pictures:", error);
    res.status(500).json({ error: error.message });
  }
};

const deleteProfilePicture = async (req, res) => {
  try {
    const userId = req.params.id;
    const { imagePath } = req.body; // Get the image URL from request body

    // ✅ Ensure user is authenticated and can only delete their own images
    if (req.user.id !== userId) {
      return res.status(403).json({ message: "Not authorized to delete this image" });
    }

    // ✅ Find user in database
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // ✅ Ensure image exists in user's profile
    if (!user.profile_pictures.includes(imagePath)) {
      return res.status(400).json({ message: "Image not found in profile" });
    }

    // ✅ Remove image from MongoDB
    user.profile_pictures = user.profile_pictures.filter(pic => pic !== imagePath);
    await user.save();

    // ✅ Remove image from uploads folder
    const filePath = path.join(__dirname, "../", imagePath); // Get full path
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    res.json({ message: "Profile picture deleted successfully", profile_pictures: user.profile_pictures });
  } catch (error) {
    console.error("Error deleting profile picture:", error);
    res.status(500).json({ error: error.message });
  }
};

const logoutUser = async (req, res) => {
  try {
    // ✅ On the client side, the token should be removed from local storage/cookies
    res.json({ message: "User logged out successfully" });
  } catch (error) {
    console.error("Error logging out:", error);
    res.status(500).json({ error: "Server error during logout" });
  }
};


const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // ✅ Find user by email
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    // ✅ Generate reset token
    const resetToken = crypto.randomBytes(20).toString("hex");
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour expiry

    await user.save();

    // ✅ Send reset email
    const resetUrl = `${req.protocol}://${req.get("host")}/api/users/reset-password/${resetToken}`;
    const message = `Click the link to reset your password: ${resetUrl}`;

    await sendEmail(user.email, "Password Reset", message);

    res.json({ message: "Password reset email sent" });
  } catch (error) {
    console.error("Error in forgot password:", error);
    res.status(500).json({ error: "Server error" });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { newPassword } = req.body;

    // ✅ Find user with valid reset token
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }, // Ensure token is not expired
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    // ✅ Assign new password (let pre-save middleware handle hashing)
    user.password = newPassword;

    // ✅ Clear reset token fields
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    // ✅ Save user without triggering pre-save hook (to avoid double hashing)
    await user.save({ validateBeforeSave: false });

    return res.json({ message: "Password reset successful" }); // Ensure only one response
  } catch (error) {
    console.error("Error resetting password:", error);

    if (!res.headersSent) {
      return res.status(500).json({ error: "Server error" }); // Avoid sending response twice
    }
  }
};



// const resetPassword = async (req, res) => {
//   try {
//     const { token } = req.params;
//     const { newPassword } = req.body;

//     // ✅ Find user with valid reset token
//     const user = await User.findOne({
//       resetPasswordToken: token,
//       resetPasswordExpires: { $gt: Date.now() }, // Ensure token is not expired
//     });

//     if (!user) return res.status(400).json({ message: "Invalid or expired token" });

//     console.log("🔑 New Password Before Hashing:", newPassword);

//     // ✅ Ensure password is not already hashed (ALWAYS HASH IT)
//     if (!newPassword.startsWith("$2a$")) {
//       const salt = await bcrypt.genSalt(10);
//       user.password = await bcrypt.hash(newPassword, salt);
//     } else {
//       console.log("⚠ Skipping re-hashing since password is already hashed!");
//       user.password = newPassword; // If it’s already hashed (this should never happen)
//     }

//     console.log("✅ New Hashed Password to Save:", user.password);

//     // ✅ Clear reset token fields
//     user.resetPasswordToken = undefined;
//     user.resetPasswordExpires = undefined;

//     await user.save();

//     console.log("✅ Password updated successfully in database");
//     res.json({ message: "Password reset successful. You can now log in." });
//   } catch (error) {
//     console.error("❌ Error resetting password:", error);
//     res.status(500).json({ error: "Server error" });
//   }
// };


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

const getAllBasicUserDetails = async (req, res) => {
  try {
    // Fetch all users, selecting only the required fields
    const users = await User.find()
      .select("name age religion marital_status profile_pictures");

    if (!users || users.length === 0) {
      return res.status(404).json({ message: "No users found" });
    }

    // Format user data
    const formattedUsers = users.map(user => ({
      name: user.name,
      age: user.age,
      religion: user.religion,
      marital_status: user.marital_status,
      profile_picture: user.profile_pictures?.length > 0
        ? `${req.protocol}://${req.get("host")}${user.profile_pictures[0]}`
        : null, // Get first profile picture or return null
    }));

    res.json(formattedUsers);
  } catch (error) {
    console.error("Error fetching all user details:", error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {getAllBasicUserDetails, registerUser, loginUser, searchMatches, getUserProfile, updateUserProfile, uploadProfilePictures, deleteProfilePicture, logoutUser, forgotPassword, resetPassword, submitInquiry};
