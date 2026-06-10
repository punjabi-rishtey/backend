const User = require("../models/User");
const Family = require("../models/Family");
const Education = require("../models/Education");
const Profession = require("../models/Profession");
const Astrology = require("../models/Astrology");
const Preference = require("../models/Preference"); // ✅ Added Preference Model
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const path = require("path");
const validator = require("validator");
const fs = require("fs");
const sendEmail = require("../utils/sendEmail");
const crypto = require("crypto");
const cloudinary = require("../config/cloudinary");
const Inquiry = require("../models/inquiryModel");
const Subscription = require("../models/Subscription");
const Coupon = require("../models/Coupon");
const Membership = require("../models/Membership");
const {
  ProfilePhotoError,
  uploadProfilePhotoFiles,
  uploadProfilePhotosForUser,
  deleteProfilePhotoForUser,
  setPrimaryProfilePhotoForUser,
  deleteAllProfilePhotosForUser,
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

const getResetPasswordBaseUrl = () => {
  const explicitBaseUrl =
    process.env.RESET_PASSWORD_BASE_URL || process.env.USER_FRONTEND_URL;

  if (explicitBaseUrl) {
    return explicitBaseUrl.replace(/\/+$/, "");
  }

  const envFile = String(process.env.ENV_FILE || "");
  const isQaEnv = envFile.includes(".env.qa");

  return isQaEnv
    ? "http://127.0.0.1:5173"
    : "https://www.punjabi-rishtey.com";
};

const activePublicUserFilter = {
  status: "Approved",
  is_deleted: { $ne: true },
};

// Delete current user's account and associated data
const deleteAccount = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId).select("+profile_picture_assets");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await deleteAllProfilePhotosForUser(user, { ignoreErrors: true });

    // Delete related documents
    await Promise.all([
      Family.deleteMany({ user: userId }),
      Education.deleteMany({ user: userId }),
      Profession.deleteMany({ user: userId }),
      Astrology.deleteMany({ user: userId }),
      Preference.deleteMany({ user: userId }),
      Subscription.deleteMany({ user: userId }),
    ]);

    // Finally delete the user
    await User.deleteOne({ _id: userId });

    return res.status(200).json({
      message: "Account and associated data deleted successfully",
      deletedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error deleting account:", error);
    return res
      .status(500)
      .json({ error: "Server error while deleting account" });
  }
};

const registerUser = async (req, res) => {
  let uploadedProfileAssets = [];
  let userSaved = false;

  try {
    const {
      name,
      email,
      password,
      mobile,
      gender,
      dob,
      religion,
      marital_status,
      preferences,
      about_myself,
      looking_for,
      secondary_contact,
    } = req.body;

    // Validate required fields
    if (
      !name ||
      !email ||
      !password ||
      !mobile ||
      !gender ||
      !dob ||
      !religion ||
      !marital_status
    ) {
      return res
        .status(400)
        .json({ message: "All required fields must be provided." });
    }

    // Validate email format
    if (!validator.isEmail(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    // Validate mobile number
    if (!/^\d{10}$/.test(mobile)) {
      return res
        .status(400)
        .json({ message: "Invalid mobile number. It must be 10 digits." });
    }

    // Check for existing user
    const existingUser = await User.findOne({ $or: [{ email }, { mobile }] });
    if (existingUser) {
      return res
        .status(400)
        .json({ message: "Email or Mobile number already exists." });
    }

    // Handle profile pictures upload
    if (req.files && req.files.length > 0) {
      uploadedProfileAssets = await uploadProfilePhotoFiles(
        req.files,
        "registration"
      );
    }

    // Parse preferences if provided
    let preferenceData = {};
    if (preferences) {
      try {
        preferenceData = JSON.parse(preferences); // Expecting an object like { preference1, preference2, preference3 }
      } catch (parseError) {
        return res.status(400).json({ message: "Invalid preferences format" });
      }
    }

    // Validate optional textual fields
    const sanitizeOptionalText = (val, fieldName) => {
      if (val === undefined) return undefined;
      if (val === null) return ""; // store empty string for nulls
      if (typeof val === "string") return val.trim();
      if (typeof val === "number") return String(val);
      throw new Error(`${fieldName} must be a string`);
    };

    let safeAboutMyself, safeLookingFor, safeSecondaryContact;
    try {
      safeAboutMyself = sanitizeOptionalText(about_myself, "about_myself");
      safeLookingFor = sanitizeOptionalText(looking_for, "looking_for");
      safeSecondaryContact = sanitizeOptionalText(secondary_contact, "secondary_contact");
    } catch (e) {
      return res.status(400).json({ message: e.message });
    }
    // Enforce max length 300
    if (typeof safeAboutMyself === "string" && safeAboutMyself.length > 300) {
      return res
        .status(400)
        .json({ message: "about_myself must be at most 300 characters" });
    }
    if (typeof safeLookingFor === "string" && safeLookingFor.length > 300) {
      return res
        .status(400)
        .json({ message: "looking_for must be at most 300 characters" });
    }

    // Create the user document
    const user = new User({
      name,
      email,
      password, // Note: Password hashing is handled by the schema's pre-save hook
      mobile,
      gender,
      dob,
      religion,
      marital_status,
      status: "Unapproved",
      profile_pictures: uploadedProfileAssets.map((asset) => asset.url),
      profile_picture_assets: uploadedProfileAssets,
      profile_picture: uploadedProfileAssets[0]?.url || "",
      ...(safeAboutMyself !== undefined && { about_myself: safeAboutMyself }),
      ...(safeLookingFor !== undefined && { looking_for: safeLookingFor }),
      ...(safeSecondaryContact !== undefined && { secondary_contact: safeSecondaryContact }),
    });

    // Save the user first to get the user._id
    await user.save();
    userSaved = true;

    // Create related documents
    const family = new Family({ user: user._id, user_name: name });
    const education = new Education({ user: user._id, user_name: name });
    const profession = new Profession({ user: user._id, user_name: name });
    const astrology = new Astrology({ user: user._id, user_name: name });

    // Create a Preference document if preferences are provided
    let preference = null;
    if (Object.keys(preferenceData).length > 0) {
      preference = new Preference({
        user: user._id,
        ...preferenceData, // Spread the parsed preferences (e.g., preference1, preference2, preference3)
      });
      await preference.save();
      user.preferences = preference._id; // Assign the Preference document's _id
    }

    // Save related documents
    await Promise.all([
      family.save(),
      education.save(),
      profession.save(),
      astrology.save(),
    ]);

    // Update user with references to related documents
    user.family = family._id;
    user.education = education._id;
    user.profession = profession._id;
    user.astrology = astrology._id;
    await user.save();

    res.status(201).json({ message: "User Registered Successfully", user });
  } catch (error) {
    if (!userSaved && uploadedProfileAssets.length > 0) {
      await destroyProfilePhotoAssets(uploadedProfileAssets, {
        ignoreErrors: true,
      });
    }
    console.error("❌ Error registering user:", error);
    res.status(500).json({ error: error.message });
  }
};

// const registerUser = async (req, res) => {
//   try {
//     const {
//       name,
//       email,
//       password,
//       mobile,
//       gender,
//       dob,
//       religion,
//       marital_status,
//       preferences,
//     } = req.body;

//     if (
//       !name ||
//       !email ||
//       !password ||
//       !mobile ||
//       !gender ||
//       !dob ||
//       !religion ||
//       !marital_status
//     ) {
//       return res
//         .status(400)
//         .json({ message: "All required fields must be provided." });
//     }

//     if (!validator.isEmail(email)) {
//       return res.status(400).json({ message: "Invalid email format" });
//     }

//     if (!/^\d{10}$/.test(mobile)) {
//       return res
//         .status(400)
//         .json({ message: "Invalid mobile number. It must be 10 digits." });
//     }

//     const existingUser = await User.findOne({ $or: [{ email }, { mobile }] });
//     if (existingUser) {
//       return res
//         .status(400)
//         .json({ message: "Email or Mobile number already exists." });
//     }

//     // Handle profile pictures upload
//     let profilePictures = [];
//     if (req.files && req.files.length > 0) {
//       for (const file of req.files) {
//         console.log("📤 Uploading file:", file.originalname);
//         try {
//           const result = await cloudinary.uploader.upload(file.path, {
//             folder: "profile_pictures",
//             transformation: [{ width: 500, height: 500, crop: "limit" }],
//           });
//           console.log("✅ Cloudinary Upload Success:", result.secure_url);
//           profilePictures.push(result.secure_url);
//         } catch (uploadError) {
//           console.error("❌ Cloudinary Upload Error:", uploadError);
//           return res.status(500).json({
//             error: "Cloudinary upload failed!",
//             details: uploadError.message,
//           });
//         }
//       }
//     }

//     // Create the user document
//     const user = new User({
//       name,
//       email,
//       password, // Note: Password hashing should be implemented
//       mobile,
//       gender,
//       dob,
//       religion,
//       marital_status,
//       status: "Pending",
//       profile_pictures: profilePictures,
//       preferences: preferences ? JSON.parse(preferences) : [],
//     });

//     await user.save();

//     const family = new Family({ user: user._id, user_name: name });
//     const education = new Education({ user: user._id, user_name: name });
//     const profession = new Profession({ user: user._id, user_name: name });
//     const astrology = new Astrology({ user: user._id, user_name: name });

//     await Promise.all([
//       family.save(),
//       education.save(),
//       profession.save(),
//       astrology.save(),
//     ]);

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

// const registerUser = async (req, res) => {
//   try {
//     const {
//       name,
//       email,
//       password,
//       mobile,
//       gender,
//       dob,
//       religion,
//       marital_status,
//     } = req.body;

//     if (
//       !name ||
//       !email ||
//       !password ||
//       !mobile ||
//       !gender ||
//       !dob ||
//       !religion ||
//       !marital_status
//     ) {
//       return res
//         .status(400)
//         .json({ message: "All required fields must be provided." });
//     }

//     if (!validator.isEmail(email)) {
//       return res.status(400).json({ message: "Invalid email format" });
//     }

//     if (!/^\d{10}$/.test(mobile)) {
//       return res
//         .status(400)
//         .json({ message: "Invalid mobile number. It must be 10 digits." });
//     }

//     const existingUser = await User.findOne({ $or: [{ email }, { mobile }] });
//     if (existingUser) {
//       return res
//         .status(400)
//         .json({ message: "Email or Mobile number already exists." });
//     }

//     // Create the user document (Remove password hashing here!)
//     const user = new User({
//       name,
//       email,
//       password,
//       mobile,
//       gender,
//       dob,
//       religion,
//       marital_status,
//       status: "Pending",
//     });

//     await user.save();

//     const family = new Family({ user: user._id, user_name: name });
//     const education = new Education({ user: user._id, user_name: name });
//     const profession = new Profession({ user: user._id, user_name: name });
//     const astrology = new Astrology({ user: user._id, user_name: name });

//     await Promise.all([
//       family.save(),
//       education.save(),
//       profession.save(),
//       astrology.save(),
//     ]);

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

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // ✅ Find user by email
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User Not Found" });

    // ✅ Compare entered password with hashed password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Invalid Credentials" });
    }

    // ✅ Generate JWT Token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "31d",
    });
    res.json({ token, user });
  } catch (error) {
    console.error("❌ Error in login:", error);
    res.status(500).json({ error: error.message });
  }
};

const searchMatches = async (req, res) => {
  try {
    const { gender, caste, religion, marital_status, city, minAge, maxAge } =
      req.query;

    const query = { ...activePublicUserFilter };

    if (gender) query.gender = gender;
    if (caste) query.caste = caste;
    if (religion) query.religion = religion;
    if (marital_status) query.marital_status = marital_status;
    if (city) query["location.city"] = city;
    if (minAge && maxAge)
      query.age = { $gte: parseInt(minAge), $lte: parseInt(maxAge) };

    const matches = await User.find(query).select("-password"); // Exclude password
    res.json(matches);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getUserSubscription = async (req, res) => {
  const userId = req.params.id;

  try {
    const subscription = await Subscription.findOne({ user: userId });

    if (!subscription) {
      return res
        .status(404)
        .json({ message: "Subscription not found for this user." });
    }

    return res.status(200).json({ success: true, data: subscription });
  } catch (error) {
    console.error("Error fetching subscription:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

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
      Astrology.findOne({ user: userId }) || {},
    ]);

    // ✅ Fix Cloudinary image URL formatting (Remove backend URL issues)
    const formatImageUrl = (pic) =>
      pic && pic.startsWith("http") ? pic : pic ? `https://${pic.replace(/^\/\//, "")}` : "";

    const profilePicturesUrls = Array.isArray(user.profile_pictures)
      ? user.profile_pictures.map(formatImageUrl)
      : [];

    // Get user object (transform will apply fallback for profile_picture)
    const userObj = user.toObject();

    // Format the profile_picture URL
    const profilePictureUrl = userObj.profile_picture
      ? formatImageUrl(userObj.profile_picture)
      : profilePicturesUrls.length > 0
        ? profilePicturesUrls[0]
        : "";

    // ✅ Construct user profile response
    const userProfile = {
      ...userObj, // Convert Mongoose document to plain object
      profile_pictures: profilePicturesUrls, // Corrected profile picture URLs
      profile_picture: profilePictureUrl, // Formatted profile picture URL with fallback
      family_details: family, // Attach family details
      education_details: education, // Attach education details
      profession_details: profession, // Attach profession details
      astrology_details: astrology, // Attach astrology details
    };

    res.json(userProfile);
  } catch (error) {
    console.error("❌ Error fetching user profile:", error);
    res.status(500).json({ error: "Server error!", details: error.message });
  }
};

const updateUserProfile = async (req, res) => {
  try {
    // Accept either "userId" or "id" from the route parameters
    const userId = req.params.userId || req.params.id;
    const requesterUserId = req.user?.id || req.user?._id;

    if (!req.admin && !requesterUserId) {
      return res.status(401).json({ message: "Not authorized" });
    }

    if (!req.admin && requesterUserId !== userId) {
      return res
        .status(403)
        .json({ message: "Not authorized to update this profile" });
    }

    // Define allowed fields for update
    const allowedUpdates = [
      "name",
      "gender",
      "dob",
      "height",
      "religion",
      "mobile",
      "email",
      "hobbies",
      "status",
      "mangalik",
      "manglik", // Frontend compatibility
      "language",
      "marital_status",
      "birth_details",
      "physical_attributes",
      "lifestyle",
      "location",
      "caste", // <-- newly added field
      "about_myself",
      "looking_for",
      "secondary_contact",
    ];

    // Filter only allowed fields
    let updates = {};
    for (const key in req.body) {
      if (allowedUpdates.includes(key) && req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }

    if (Object.prototype.hasOwnProperty.call(updates, "status") && !req.admin) {
      return res
        .status(403)
        .json({ message: "Only admins can update user status" });
    }

    // Convert height object to a string if needed (e.g., {feet:"5", inches:"8"} => "5'8\"")
    if (typeof updates.height === "object") {
      updates.height = `${updates.height.feet}'${updates.height.inches}"`;
    }

    // Handle manglik field compatibility (support both boolean and string values)
    if (updates.manglik !== undefined) {
      if (typeof updates.manglik === "boolean") {
        // Convert legacy boolean values to strings
        updates.manglik = updates.manglik ? "manglik" : "non_manglik";
      }
      // Map frontend field name to backend field name
      updates.mangalik = updates.manglik;
      delete updates.manglik;
    }

    // Ensure nested objects update properly (if provided)
    if (updates.birth_details)
      updates.birth_details = { ...updates.birth_details };
    if (updates.lifestyle) {
      updates.lifestyle = { ...updates.lifestyle };
      // Support camelCase from frontend
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
      // Coerce abroad_ready to boolean or null if provided as string
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
          else updates.lifestyle.abroad_ready = null; // fallback for unrecognized strings
        } else if (typeof val !== "boolean") {
          updates.lifestyle.abroad_ready = null;
        }
      }
    }
    if (updates.physical_attributes)
      updates.physical_attributes = { ...updates.physical_attributes };

    // Sanitize optional text fields if provided
    const sanitizeOptionalTextUpdate = (val) => {
      if (val === null) return "";
      if (val === undefined) return undefined;
      if (typeof val === "string") return val.trim();
      if (typeof val === "number") return String(val);
      // If invalid type (object/array/boolean), reject
      return { __invalid: true };
    };
    if (Object.prototype.hasOwnProperty.call(updates, "about_myself")) {
      const v = sanitizeOptionalTextUpdate(updates.about_myself);
      if (v && v.__invalid)
        return res.status(400).json({ error: "about_myself must be a string" });
      if (typeof v === "string" && v.length > 300) {
        return res
          .status(400)
          .json({ error: "about_myself must be at most 300 characters" });
      }
      updates.about_myself = v;
    }
    if (Object.prototype.hasOwnProperty.call(updates, "looking_for")) {
      const v = sanitizeOptionalTextUpdate(updates.looking_for);
      if (v && v.__invalid)
        return res.status(400).json({ error: "looking_for must be a string" });
      if (typeof v === "string" && v.length > 300) {
        return res
          .status(400)
          .json({ error: "looking_for must be at most 300 characters" });
      }
      updates.looking_for = v;
    }
    if (Object.prototype.hasOwnProperty.call(updates, "secondary_contact")) {
      const v = sanitizeOptionalTextUpdate(updates.secondary_contact);
      if (v && v.__invalid)
        return res.status(400).json({ error: "secondary_contact must be a string" });
      updates.secondary_contact = v;
    }

    // Prevent duplicate mobile number issue
    if (updates.mobile) {
      const existingUser = await User.findOne({ mobile: updates.mobile });
      if (existingUser && existingUser._id.toString() !== userId) {
        return res.status(400).json({ error: "Mobile number already in use." });
      }
    }

    // Update user profile in MongoDB
    const updatedUser = await User.findOneAndUpdate({ _id: userId }, updates, {
      new: true,
      runValidators: true,
    }).select("-password");

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ message: "Profile updated successfully", user: updatedUser });
  } catch (error) {
    console.error("❌ Error updating profile:", error);
    res.status(500).json({ error: error.message });
  }
};

const uploadProfilePictures = async (req, res) => {
  try {
    const userId = req.params.id;
    if (req.user.id !== userId) {
      return res
        .status(403)
        .json({ message: "Not authorized to upload images for this profile" });
    }

    const user = await User.findById(userId).select("+profile_picture_assets");
    if (!user) {
      return res.status(404).json({ message: "User Not Found" });
    }

    const result = await uploadProfilePhotosForUser(user, req.files, "user");

    res.json({
      message: "Profile pictures uploaded successfully",
      profile_pictures: result.profile_pictures,
      profile_picture: result.profile_picture,
    });
  } catch (error) {
    console.error("❌ Error uploading profile pictures:", error);
    sendProfilePhotoError(res, error, "Server error!");
  }
};

const deleteProfilePicture = async (req, res) => {
  try {
    const userId = req.params.id;
    const { imagePath } = req.body; // Get the image URL from request body

    // ✅ Ensure user is authenticated and can only delete their own images
    if (req.user.id !== userId) {
      return res
        .status(403)
        .json({ message: "Not authorized to delete this image" });
    }

    // ✅ Find user in database
    const user = await User.findById(userId).select("+profile_picture_assets");
    if (!user) return res.status(404).json({ message: "User not found" });

    const result = await deleteProfilePhotoForUser(user, imagePath);

    res.json({
      message: "Profile picture deleted successfully",
      profile_pictures: result.profile_pictures,
      profile_picture: result.profile_picture,
    });
  } catch (error) {
    console.error("Error deleting profile picture:", error);
    sendProfilePhotoError(res, error, "Server error deleting profile picture");
  }
};

const setProfilePicture = async (req, res) => {
  try {
    const userId = req.params.id;
    const { imageUrl } = req.body;

    // Ensure user is authenticated and can only set their own profile picture
    if (req.user.id !== userId) {
      return res
        .status(403)
        .json({ message: "Not authorized to update this profile" });
    }

    // Find user in database
    const user = await User.findById(userId).select("+profile_picture_assets");
    if (!user) return res.status(404).json({ message: "User not found" });

    const result = await setPrimaryProfilePhotoForUser(user, imageUrl);

    res.json({
      message: "Profile picture updated successfully",
      profile_picture: result.profile_picture,
      profile_pictures: result.profile_pictures,
    });
  } catch (error) {
    console.error("Error setting profile picture:", error);
    sendProfilePhotoError(res, error, "Server error setting profile picture");
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
    // In your forgotPassword controller
    const resetUrl = `${getResetPasswordBaseUrl()}/reset-password/${resetToken}`;

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

const changePassword = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res
        .status(400)
        .json({ message: "Current password and new password are required." });
    }

    if (newPassword.length < 6) {
      return res
        .status(400)
        .json({ message: "New password must be at least 6 characters long." });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({
        message: "New password must be different from the current password.",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Current password is incorrect." });
    }

    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();

    return res.json({
      message: "Password changed successfully. Please log in again.",
    });
  } catch (error) {
    console.error("Error changing password:", error);
    return res
      .status(500)
      .json({ message: "Server error while changing password." });
  }
};

// ✅ Submit Inquiry (User Side)
const submitInquiry = async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const phone = String(req.body.phone || "").trim();
    const subject = String(req.body.subject || "").trim();
    const message = String(req.body.message || "").trim();

    if (!name || !email || !phone || !subject || !message) {
      return res.status(400).json({ error: "All fields are required." });
    }

    if (!validator.isEmail(email)) {
      return res.status(400).json({ error: "Please enter a valid email." });
    }

    if (phone.replace(/\D/g, "").length < 7) {
      return res.status(400).json({ error: "Please enter a valid phone number." });
    }

    const inquiry = new Inquiry({ name, email, phone, subject, message });
    await inquiry.save();

    res.status(201).json({
      message: "Inquiry submitted successfully!",
      inquiry: {
        id: inquiry._id,
        status: inquiry.status,
      },
    });
  } catch (error) {
    res.status(500).json({ error: "Server Error: Unable to submit inquiry." });
  }
};

// const getAllBasicUserDetails = async (req, res) => {
//   try {
//     const users = await User.find()
//       .populate("preferences")
//       .populate("profession", "occupation designation")
//       .select(
//         "name dob gender height religion marital_status caste language mangalik profile_pictures preferences profession metadata.register_date"
//       ) // Added metadata.register_date
//       .lean();

//     if (!users || users.length === 0) {
//       return res.status(404).json({ message: "No users found" });
//     }

//     const formattedUsers = users.map((user) => ({
//       name: user.name,
//       age: user.dob
//         ? new Date().getFullYear() - new Date(user.dob).getFullYear()
//         : null,
//       gender: user.gender,
//       height: user.height,
//       religion: user.religion,
//       marital_status: user.marital_status,
//       caste: user.caste,
//       occupation: user.profession?.occupation || null,
//       language: user.language,
//       manglik: user.mangalik, // Note: Schema uses 'mangalik', but API uses 'manglik'
//       preferences: user.preferences || {_id:user._id} || {},
//       profile_picture:
//         user.profile_pictures?.length > 0 ? user.profile_pictures[0] : null,
//       metadata: {
//         register_date: user.metadata?.register_date || null, // Include register_date
//       },
//     }));

//     res.json(formattedUsers);
//   } catch (error) {
//     console.error("Error fetching all user details:", error);
//     res.status(500).json({ error: error.message });
//   }
// };
const getAllBasicUserDetails = async (req, res) => {
  try {
    const users = await User.find(activePublicUserFilter)
      .populate("preferences")
      .populate("profession", "occupation designation")
      .select(
        "name dob gender height religion marital_status caste language mangalik lifestyle.nri_status location.city profile_pictures profile_picture preferences profession metadata.register_date status"
      ) // Added metadata.register_date
      .lean();

    const formattedUsers = users.map((user) => ({
      name: user.name,
      user: user._id,
      age: user.dob
        ? new Date().getFullYear() - new Date(user.dob).getFullYear()
        : null,
      gender: user.gender,
      height: user.height,
      religion: user.religion,
      marital_status: user.marital_status,
      caste: user.caste,
      occupation: user.profession?.occupation || null,
      language: user.language,
      manglik: user.mangalik, // Note: Schema uses 'mangalik', but API uses 'manglik'
      nri_status: user.lifestyle?.nri_status ?? false,
      city: user.location?.city || "",
      preferences: user.preferences || { _id: user._id } || {},
      profile_picture:
        user.profile_picture || (user.profile_pictures?.length > 0 ? user.profile_pictures[0] : null),
      metadata: {
        register_date: user.metadata?.register_date || null, // Include register_date
      },
      status: user.status,
    }));

    res.status(200).json(formattedUsers);
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ message: "Server error fetching users." });
  }
};

// const getAllBasicUserDetails = async (req, res) => {
//   try {
//     // Fetch users with populated preferences
//     const users = await User.find()
//       .populate("preferences") // Populates preference details
//       .select("name dob gender height religion marital_status caste language mangalik profile_pictures preferences") // Selects required fields
//       .lean(); // Converts Mongoose docs to plain JS objects

//     if (!users || users.length === 0) {
//       return res.status(404).json({ message: "No users found" });
//     }

//     // Format user data before sending response
//     const formattedUsers = users.map(user => ({
//       name: user.name,
//       age: user.dob ? new Date().getFullYear() - new Date(user.dob).getFullYear() : null, // Calculate age from DOB
//       gender: user.gender,
//       height: user.height,
//       religion: user.religion,
//       marital_status: user.marital_status,
//       caste: user.caste,
//       occupation: user.occupation,
//       language: user.language,
//       mangalik: user.mangalik,
//       preferences: user.preferences || {}, // Ensure preferences are populated
//       profile_picture: user.profile_pictures?.length > 0
//         ? user.profile_pictures[0] // Uses Cloudinary URL directly
//         : null
//     }));

//     res.json(formattedUsers);
//   } catch (error) {
//     console.error("Error fetching all user details:", error);
//     res.status(500).json({ error: error.message });
//   }
// };

const getProfileCompletion = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate("family")
      .populate("education")
      .populate("profession")
      .populate("astrology");

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const completionPercentage = user.calculateProfileCompletion();
    return res.json({ completionPercentage });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
};

// const createSubscription = async (req, res) => {
//   try {
//     // Assuming the authenticated user's ID is available in req.user.id
//     const userId = req.user.id;
//     const { fullName, phoneNumber, screenshotUrl } = req.body;

//     // Validate required fields
//     if (!fullName || !phoneNumber || !screenshotUrl) {
//       return res.status(400).json({ error: "Missing required fields." });
//     }

//     // Create and save a new subscription document
//     const subscription = new Subscription({
//       user: userId,
//       fullName,
//       phoneNumber,
//       screenshotUrl,
//       // createdAt is set automatically, and expiresAt is set in the pre-save hook.
//     });

//     await subscription.save();
//     return res.status(201).json({ success: true, subscription });
//   } catch (error) {
//     console.error(error);
//     return res.status(500).json({ error: "Server error." });
//   }
// };

const createSubscription = async (req, res) => {
  let screenshotUrl = "";

  try {
    // 1) Get the authenticated user's ID from req.user (set by your auth middleware)
    const userId = req.user.id;

    const { fullName, phoneNumber, couponCode, membershipId } = req.body;

    // 2) Validate text fields
    const safeFullName = String(fullName || "").trim();
    const safePhoneNumber = String(phoneNumber || "").trim();

    if (!safeFullName || !safePhoneNumber || !membershipId) {
      return res
        .status(400)
        .json({ error: "Name, phone number, and membership plan are required." });
    }

    if (!/^\d{10}$/.test(safePhoneNumber)) {
      return res
        .status(400)
        .json({ error: "Phone number must be 10 digits." });
    }

    // 3) Validate that a file was uploaded (Multer sets req.file)
    if (!req.file) {
      return res.status(400).json({ error: "Payment screenshot is required." });
    }

    const membershipTier = await Membership.findById(membershipId).select(
      "duration price"
    );

    if (!membershipTier) {
      return res.status(404).json({ error: "Membership plan not found." });
    }

    // 5) Check if user provided a coupon
    let discountAmount = 0;
    let validatedCouponCode = null;

    if (couponCode) {
      const coupon = await Coupon.findOne({
        code: couponCode.trim().toUpperCase(),
        isActive: true,
      });

      if (!coupon) {
        // Coupon not found or inactive
        return res
          .status(400)
          .json({ error: "Invalid or inactive coupon code." });
      }

      const basePrice = Number(membershipTier.price) || 0;

      if (coupon.discountType === "percentage") {
        discountAmount = (basePrice * coupon.discountValue) / 100;
      } else {
        // 'flat' discount
        discountAmount = coupon.discountValue;
      }

      discountAmount = Math.min(basePrice, Math.max(0, discountAmount));
      validatedCouponCode = coupon.code;
    }

    // 4) Upload file to Cloudinary after text/coupon validation has passed.
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: "subscriptions",
      transformation: [{ width: 800, crop: "limit" }],
    });
    screenshotUrl = result.secure_url;

    const currentDate = new Date();
    const expiresAt = new Date(currentDate);
    expiresAt.setMonth(currentDate.getMonth() + membershipTier.duration);

    // 6) Create subscription document
    const subscription = new Subscription({
      user: userId,
      fullName: safeFullName,
      phoneNumber: safePhoneNumber,
      screenshotUrl,
      membershipDurationMonths: membershipTier.duration,
      source: "user_payment",
      couponCode: validatedCouponCode,
      discountAmount,
      expiresAt,
      // createdAt is automatic, expiresAt handled in pre-save hook
    });

    // 7) Save subscription
    await subscription.save();

    return res.status(201).json({
      success: true,
      subscription,
    });
  } catch (error) {
    console.error("Error creating subscription:", error);
    return res
      .status(500)
      .json({ error: "Server error", details: error.message });
  } finally {
    if (req.file?.path) {
      fs.unlink(req.file.path, (error) => {
        if (error) {
          console.error("Error deleting local subscription screenshot:", error.message);
        }
      });
    }
  }
};

module.exports = {
  createSubscription,
  getAllBasicUserDetails,
  changePassword,
  registerUser,
  loginUser,
  searchMatches,
  getUserProfile,
  updateUserProfile,
  uploadProfilePictures,
  deleteProfilePicture,
  setProfilePicture,
  logoutUser,
  forgotPassword,
  resetPassword,
  submitInquiry,
  getProfileCompletion,
  createSubscription,
  getUserSubscription,
  deleteAccount,
};

// const registerUser = async (req, res) => {
//   try {
//     const { name, email, password, mobile, gender, dob, religion, marital_status, preferences } = req.body;

//     if (!name || !email || !password || !mobile || !gender || !dob || !religion || !marital_status || !preferences) {
//       return res.status(400).json({ message: "All required fields must be provided." });
//     }

//     if (!Array.isArray(preferences) || preferences.length !== 3) {
//       return res.status(400).json({ message: "You must select exactly 3 preferences." });
//     }

//     if (!validator.isEmail(email)) {
//       return res.status(400).json({ message: "Invalid email format" });
//     }

//     if (!/^\d{10}$/.test(mobile)) {
//       return res.status(400).json({ message: "Invalid mobile number. It must be 10 digits." });
//     }

//     const existingUser = await User.findOne({ $or: [{ email }, { mobile }] });
//     if (existingUser) {
//       return res.status(400).json({ message: "Email or Mobile number already exists." });
//     }

//     // ✅ Create the user document (Remove password hashing here!)
//     const user = new User({
//       name, email, password, mobile, gender, dob, religion, marital_status,
//       status: "Pending"
//     });

//     await user.save();

//     // ✅ Store preferences in the Preference model
//     const preference = new Preference({
//       user: user._id,
//       preference1: preferences[0],
//       preference2: preferences[1],
//       preference3: preferences[2]
//     });
//     await preference.save();

//     const family = new Family({ user: user._id, user_name: name });
//     const education = new Education({ user: user._id, user_name: name });
//     const profession = new Profession({ user: user._id, user_name: name });
//     const astrology = new Astrology({ user: user._id, user_name: name });

//     await Promise.all([family.save(), education.save(), profession.save(), astrology.save()]);

//     user.family = family._id;
//     user.education = education._id;
//     user.profession = profession._id;
//     user.astrology = astrology._id;
//     user.preferences = preference._id;
//     await user.save();

//     res.status(201).json({ message: "User Registered Successfully", user });
//   } catch (error) {
//     console.error("❌ Error registering user:", error);
//     res.status(500).json({ error: error.message });
//   }
// };

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

// const updateUserProfile = async (req, res) => {
//   try {
//     const userId = req.params.id;

//     // Define allowed fields for update
//     const allowedUpdates = [
//       "name", "gender", "dob", "height", "religion", "mobile",
//       "email", "hobbies", "status", "mangalik", "language",
//       "marital_status", "birth_details", "physical_attributes",
//       "lifestyle", "location"
//     ];

//     // Filter only allowed fields
//     let updates = {};
//     for (const key in req.body) {
//       if (allowedUpdates.includes(key) && req.body[key] !== undefined) {
//         updates[key] = req.body[key];
//       }
//     }

//     // ✅ Convert height object to a string if needed
//     if (typeof updates.height === "object") {
//       updates.height = `${updates.height.feet}'${updates.height.inches}"`;
//     }

//     // ✅ Ensure birth_details, lifestyle, and physical_attributes update properly
//     if (updates.birth_details) updates.birth_details = { ...updates.birth_details };
//     if (updates.lifestyle) updates.lifestyle = { ...updates.lifestyle };
//     if (updates.physical_attributes) updates.physical_attributes = { ...updates.physical_attributes };

//     // ✅ Prevent duplicate mobile number issue
//     if (updates.mobile) {
//       const existingUser = await User.findOne({ mobile: updates.mobile });
//       if (existingUser && existingUser._id.toString() !== userId) {
//         return res.status(400).json({ error: "Mobile number already in use." });
//       }
//     }

//     // ✅ Update user profile in MongoDB
//     const updatedUser = await User.findOneAndUpdate(
//       { _id: userId },
//       updates,
//       { new: true, runValidators: true }
//     ).select("-password");

//     if (!updatedUser) {
//       return res.status(404).json({ message: "User not found" });
//     }

//     res.json({ message: "Profile updated successfully", user: updatedUser });
//   } catch (error) {
//     console.error("❌ Error updating profile:", error);
//     res.status(500).json({ error: error.message });
//   }
// };

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
