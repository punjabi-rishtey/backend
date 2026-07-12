const express = require("express");
const User = require("../models/User");
const {
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
  submitInquiry,
  resetPassword,
  changePassword,
  getAllBasicUserDetails,
  getProfileCompletion,
  createSubscription,
  getUserSubscription,
  deleteAccount,
} = require("../controllers/userController");

const protect = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");
const profilePhotoUpload = require("../middleware/profilePhotoUploadMiddleware");
const checkProfileCompletion = require("../middleware/checkProfileCompletion");

const router = express.Router();

const requireApprovedMembershipAccess = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select(
      "status metadata.exp_date gender"
    );

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.status !== "Approved") {
      return res.status(403).json({
        error:
          "Your profile is not active yet. Please wait for approval to access this feature.",
      });
    }

    if (user.metadata?.exp_date && new Date() > user.metadata.exp_date) {
      return res.status(403).json({
        error: "Your subscription has expired. Please renew to access this feature.",
      });
    }

    req.membershipUser = user;
    next();
  } catch (error) {
    console.error("Error validating membership access:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

// New route to fetch basic details of active users for approved members
router.get(
  "/all-basic",
  protect,
  requireApprovedMembershipAccess,
  getAllBasicUserDetails
);

// Updated register route to handle file uploads
router.post("/register", profilePhotoUpload.array("profile_pictures", 10), registerUser);

router.post("/login", loginUser);

router.get("/search", protect, requireApprovedMembershipAccess, searchMatches);

router.get(
  "/find-my-partner",
  protect,
  requireApprovedMembershipAccess,
  checkProfileCompletion,
  async (req, res) => {
  try {
    res.json({ message: "Welcome to Find My Partner!" });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/profile-completion", protect, getProfileCompletion);

router.post("/subscribe", protect, upload.single("image"), createSubscription);

router.get("/subscription/:id", getUserSubscription);

router.put("/change-password", protect, changePassword);

router.get("/:id", protect, getUserProfile);

router.put("/:id", protect, updateUserProfile);

router.post(
  "/:id/upload",
  protect,
  profilePhotoUpload.array("profile_pictures", 10),
  uploadProfilePictures
);

router.delete("/:id/delete-picture", protect, deleteProfilePicture);

router.put("/:id/set-profile-picture", protect, setProfilePicture);

router.post("/logout", protect, logoutUser);

router.post("/forgot-password", forgotPassword);

router.post("/reset-password/:token", resetPassword);

router.post("/inquiries/submit", submitInquiry);

// Google Play Console compliant account deletion endpoint
// Requires Authorization: Bearer <token>
router.delete("/me", protect, deleteAccount);

module.exports = router;


//

// v1
// const express = require("express");
// const { registerUser, loginUser, searchMatches, getUserProfile, updateUserProfile, uploadProfilePictures,deleteProfilePicture, logoutUser, forgotPassword, resetPassword} = require("../controllers/userController");

// const protect = require("../middleware/authMiddleware");
// const upload = require("../middleware/uploadMiddleware");

// const router = express.Router();

// /**
//  * @swagger
//  * /api/users/register:
//  *   post:
//  *     summary: Register a new user
//  *     tags: [Users]
//  *     requestBody:
//  *       required: true
//  *       content:
//  *         application/json:
//  *           schema:
//  *             type: object
//  *             properties:
//  *               name:
//  *                 type: string
//  *               email:
//  *                 type: string
//  *               password:
//  *                 type: string
//  *     responses:
//  *       201:
//  *         description: User registered successfully
//  *       400:
//  *         description: Bad request
//  */
// router.post("/register", registerUser);
// // router.post("/register", registerUser);
// router.post("/login", loginUser);
// router.get("/search", protect, searchMatches);
// router.get("/:id", protect, getUserProfile);
// router.put("/:id", protect, updateUserProfile);
// router.post("/:id/upload", protect, upload.array("profile_pictures", 10), uploadProfilePictures);
// router.delete("/:id/delete-picture", protect, deleteProfilePicture);
// router.post("/logout", protect, logoutUser);

// router.post("/forgot-password", forgotPassword);
// router.post("/reset-password/:token", resetPassword);

// module.exports = router;


// v2
// const express = require("express");
// const {
//   registerUser,
//   loginUser,
//   searchMatches,
//   getUserProfile,
//   updateUserProfile,
//   uploadProfilePictures,
//   deleteProfilePicture,
//   logoutUser,
//   forgotPassword,
//   submitInquiry,
//   resetPassword,
//   getAllBasicUserDetails,
//   getProfileCompletion,
//   createSubscription,
//   getUserSubscription,
// } = require("../controllers/userController");

// const protect = require("../middleware/authMiddleware");
// const upload = require("../middleware/uploadMiddleware");
// const checkProfileCompletion = require("../middleware/checkProfileCompletion");

// const router = express.Router();

// // New route to fetch basic details of all users
// router.get("/all-basic", getAllBasicUserDetails);

// router.post("/register", registerUser);

// router.post("/login", loginUser);

// router.get("/search", protect, searchMatches);

// router.get("/find-my-partner", protect, checkProfileCompletion, (req, res) => {
//   res.json({ message: "Welcome to Find My Partner!" });
// });

// router.get("/profile-completion", protect, getProfileCompletion);

// // A route that requires at least 70% profile completion.
// // For example, accessing the "find my partner" page.

// // router.post("/subscribe", protect, createSubscription);

// router.post("/subscribe", protect, upload.single("image"), createSubscription);


// router.get("/subscription/:id", getUserSubscription);

// router.get("/:id", protect, getUserProfile);

// router.put("/:id", protect, updateUserProfile);

// router.post(
//   "/:id/upload",
//   protect,
//   upload.array("profile_pictures", 10),
//   uploadProfilePictures
// );

// router.delete("/:id/delete-picture", protect, deleteProfilePicture);

// router.post("/logout", protect, logoutUser);

// router.post("/forgot-password", forgotPassword);

// router.post("/reset-password/:token", resetPassword);

// router.post("/inquiries/submit", submitInquiry);

// module.exports = router;
