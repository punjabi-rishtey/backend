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

const express = require("express");
const {
  registerUser,
  loginUser,
  searchMatches,
  getUserProfile,
  updateUserProfile,
  uploadProfilePictures,
  deleteProfilePicture,
  logoutUser,
  forgotPassword,
  submitInquiry,
  resetPassword,
  getAllBasicUserDetails,
  getProfileCompletion,
  createSubscription,
  getUserSubscription,
} = require("../controllers/userController");

const protect = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");
const checkProfileCompletion = require("../middleware/checkProfileCompletion");

const router = express.Router();

// New route to fetch basic details of all users
router.get("/all-basic", getAllBasicUserDetails);

router.post("/register", registerUser);

router.post("/login", loginUser);

router.get("/search", protect, searchMatches);

router.get("/find-my-partner", protect, checkProfileCompletion, (req, res) => {
  res.json({ message: "Welcome to Find My Partner!" });
});

router.get("/profile-completion", protect, getProfileCompletion);

// A route that requires at least 70% profile completion.
// For example, accessing the "find my partner" page.

// router.post("/subscribe", protect, createSubscription);

router.post("/subscribe", protect, upload.single("image"), createSubscription);


router.get("/subscription/:id", getUserSubscription);

router.get("/:id", protect, getUserProfile);

router.put("/:id", protect, updateUserProfile);

router.post(
  "/:id/upload",
  protect,
  upload.array("profile_pictures", 10),
  uploadProfilePictures
);

router.delete("/:id/delete-picture", protect, deleteProfilePicture);

router.post("/logout", protect, logoutUser);

router.post("/forgot-password", forgotPassword);

router.post("/reset-password/:token", resetPassword);

router.post("/inquiries/submit", submitInquiry);

module.exports = router;
