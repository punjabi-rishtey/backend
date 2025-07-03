const express = require("express");
const multer = require("multer");

const {
  registerAdmin,
  loginAdmin,
  getAdminDashboard,
  getUsersByStatus,
  approveUser,
  blockUser,
  editUser,
  addUserFromAdmin,
  getUserRegistrationsPerMonth,
  getUserStatusCounts,
  getAllUsers,
  getAllInquiries,
  getUserById,
  getAllSubscriptions,
  getUserStatus,
  deleteUser,
  changeUserPasswordByAdmin,
  uploadQR,
  getQR,
} = require("../controllers/adminController");
const {
  updateAstrologyDetails,
} = require("../controllers/astrologyController");
const {
  updateEducationDetails,
} = require("../controllers/educationController");
const {
  updateProfessionDetails,
} = require("../controllers/professionController");
const { updateFamilyDetails } = require("../controllers/familyController");
const { updateUserProfile } = require("../controllers/userController"); // Adjust the path as needed

const adminAuth = require("../middleware/adminAuthMiddleware"); // ✅ Import middleware

const router = express.Router();

router.post("/register", registerAdmin);

router.post("/login", loginAdmin);

router.get("/dashboard", adminAuth, getAdminDashboard);

router.get("/users/:status", adminAuth, getUsersByStatus);

// router.put("/users/approve/:id", adminAuth, approveUser);
router.put("/users/approve/:id", approveUser);

router.put("/users/block/:id", adminAuth, blockUser);

router.put("/users/edit/:id", adminAuth, editUser);

router.post("/users/add", adminAuth, addUserFromAdmin);

router.get("/dashboard/registrations", adminAuth, getUserRegistrationsPerMonth);

router.get("/dashboard/status-counts", adminAuth, getUserStatusCounts);

router.get("/users", adminAuth, getAllUsers);

router.get("/inquiries/all", adminAuth, getAllInquiries);

router.get("/user/:id", adminAuth, getUserById);

router.get("/subscriptions", adminAuth, getAllSubscriptions);

//Edit page updatea apis:
router.put("/astrologies/:id", adminAuth, updateAstrologyDetails);
router.put("/educations/:id", adminAuth, updateEducationDetails);
router.put("/professions/:id", adminAuth, updateProfessionDetails);
router.put("/families/:id", adminAuth, updateFamilyDetails);
router.put("/user/:id/profile", adminAuth, updateUserProfile);

// Route to get user status by ID
router.get("/userstatus/:id/status", getUserStatus);

// Route to delete user by ID
router.delete("/deleteuser/:id", deleteUser);

// Route to change a user's password by admin
// /api/admin/auth/change-password/:userId
router.put("/change-password/:userId", changeUserPasswordByAdmin);

// QR
// Multer config (in-memory)
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post("/qr/upload", upload.single("image"), uploadQR);
router.post("/qr", getQR);

module.exports = router;
