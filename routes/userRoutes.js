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
  resetPassword 
} = require("../controllers/userController");

const protect = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: API endpoints for user management
 */

/**
 * @swagger
 * /api/users/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Bad request
 */
router.post("/register", registerUser);

/**
 * @swagger
 * /api/users/login:
 *   post:
 *     summary: User login
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Unauthorized
 */
router.post("/login", loginUser);

/**
 * @swagger
 * /api/users/search:
 *   get:
 *     summary: Search for potential matches
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: gender
 *         schema:
 *           type: string
 *         description: Gender of the match
 *       - in: query
 *         name: religion
 *         schema:
 *           type: string
 *         description: Religion of the match
 *       - in: query
 *         name: marital_status
 *         schema:
 *           type: string
 *         description: Marital status of the match
 *     responses:
 *       200:
 *         description: List of matching profiles
 *       500:
 *         description: Server error
 */
router.get("/search", protect, searchMatches);

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Get user profile by ID
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *       404:
 *         description: User not found
 */
router.get("/:id", protect, getUserProfile);

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     summary: Update user profile
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               gender:
 *                 type: string
 *               dob:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       403:
 *         description: Unauthorized
 */
router.put("/:id", protect, updateUserProfile);

/**
 * @swagger
 * /api/users/{id}/upload:
 *   post:
 *     summary: Upload profile pictures
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               profile_pictures:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       200:
 *         description: Images uploaded successfully
 *       400:
 *         description: No files uploaded
 */
router.post("/:id/upload", protect, upload.array("profile_pictures", 10), uploadProfilePictures);

/**
 * @swagger
 * /api/users/{id}/delete-picture:
 *   delete:
 *     summary: Delete a profile picture
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               imagePath:
 *                 type: string
 *     responses:
 *       200:
 *         description: Image deleted successfully
 *       403:
 *         description: Unauthorized
 */
router.delete("/:id/delete-picture", protect, deleteProfilePicture);

/**
 * @swagger
 * /api/users/logout:
 *   post:
 *     summary: Logout user
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 *       403:
 *         description: Unauthorized
 */
router.post("/logout", protect, logoutUser);

/**
 * @swagger
 * /api/users/forgot-password:
 *   post:
 *     summary: Send password reset email
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password reset email sent
 *       404:
 *         description: User not found
 */
router.post("/forgot-password", forgotPassword);

/**
 * @swagger
 * /api/users/reset-password/{token}:
 *   post:
 *     summary: Reset user password
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Password reset token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password reset successful
 *       400:
 *         description: Invalid or expired token
 */
router.post("/reset-password/:token", resetPassword);




module.exports = router;
