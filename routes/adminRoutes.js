// const express = require("express");
// const { registerAdmin, loginAdmin, getAdminDashboard, getUsersByStatus, approveUser, blockUser, editUser, addUserFromAdmin, getUserRegistrationsPerMonth, getUserStatusCounts} = require("../controllers/adminController");
// const adminAuth = require("../middleware/adminAuthMiddleware");  // ✅ Import middleware

// const router = express.Router();

// router.post("/register", registerAdmin);
// router.post("/login", loginAdmin);
// router.get("/dashboard", adminAuth, getAdminDashboard);

// router.get("/users/:status", adminAuth, getUsersByStatus);

// router.get("/users/:status", adminAuth, getUsersByStatus);  // Fetch users by status
// router.put("/users/approve/:id", adminAuth, approveUser);   // Approve user
// router.put("/users/block/:id", adminAuth, blockUser);       // Block user
// router.put("/users/edit/:id", adminAuth, editUser);         // Edit user
// router.post("/users/add", adminAuth, addUserFromAdmin);      // ✅ Add user from admin


// router.get("/dashboard/registrations", adminAuth, getUserRegistrationsPerMonth);
// router.get("/dashboard/status-counts", adminAuth, getUserStatusCounts);

// module.exports = router;



const express = require("express");
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
  getAllUsers, getAllInquiries, getUserById
} = require("../controllers/adminController");
const { updateAstrologyDetails } = require("../controllers/astrologyController");
const { updateEducationDetails } = require("../controllers/educationController");
const { updateProfessionDetails } = require("../controllers/professionController");
const { updateFamilyDetails } = require("../controllers/familyController");
const { updateUserProfile } = require("../controllers/userController"); // Adjust the path as needed


const adminAuth = require("../middleware/adminAuthMiddleware");  // ✅ Import middleware

const router = express.Router();


router.post("/register", registerAdmin);


router.post("/login", loginAdmin);


router.get("/dashboard", adminAuth, getAdminDashboard);

router.get("/users/:status", adminAuth, getUsersByStatus);


router.put("/users/approve/:id", adminAuth, approveUser);

router.put("/users/block/:id", adminAuth, blockUser);


router.put("/users/edit/:id", adminAuth, editUser);


router.post("/users/add", adminAuth, addUserFromAdmin);


router.get("/dashboard/registrations", adminAuth, getUserRegistrationsPerMonth);


router.get("/dashboard/status-counts", adminAuth, getUserStatusCounts);


router.get("/users", adminAuth, getAllUsers);



router.get("/inquiries/all", adminAuth, getAllInquiries);


router.get("/user/:id", adminAuth, getUserById);

//Edit page updatea apis:
router.put("/astrologies/:id", adminAuth, updateAstrologyDetails);
router.put("/educations/:id", adminAuth, updateEducationDetails);
router.put("/professions/:id", adminAuth, updateProfessionDetails);
router.put("/families/:id", adminAuth, updateFamilyDetails);
router.put("/user/:id/profile", adminAuth, updateUserProfile);



module.exports = router;
