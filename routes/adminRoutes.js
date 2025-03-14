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
const adminAuth = require("../middleware/adminAuthMiddleware");  // ✅ Import middleware

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: APIs for Admin Management
 */

/**
 * @swagger
 * /api/admin/auth/register:
 *   post:
 *     summary: Register a new admin
 *     tags: [Admin]
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
 *       201:
 *         description: Admin registered successfully
 *       400:
 *         description: Bad request
 */
router.post("/register", registerAdmin);

/**
 * @swagger
 * /api/admin/auth/login:
 *   post:
 *     summary: Admin login
 *     tags: [Admin]
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
router.post("/login", loginAdmin);

/**
 * @swagger
 * /api/admin/auth/dashboard:
 *   get:
 *     summary: Get admin dashboard statistics
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Admin dashboard data retrieved successfully
 *       403:
 *         description: Unauthorized
 */
router.get("/dashboard", adminAuth, getAdminDashboard);

/**
 * @swagger
 * /api/admin/auth/users/{status}:
 *   get:
 *     summary: Get users by status
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: status
 *         required: true
 *         schema:
 *           type: string
 *         description: The status of users (approved, pending, expired, canceled)
 *     responses:
 *       200:
 *         description: Users fetched successfully
 *       403:
 *         description: Unauthorized
 */
router.get("/users/:status", adminAuth, getUsersByStatus);

/**
 * @swagger
 * /api/admin/auth/users/approve/{id}:
 *   put:
 *     summary: Approve a user
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the user to approve
 *     responses:
 *       200:
 *         description: User approved successfully
 *       403:
 *         description: Unauthorized
 */
router.put("/users/approve/:id", adminAuth, approveUser);

/**
 * @swagger
 * /api/admin/auth/users/block/{id}:
 *   put:
 *     summary: Block a user
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the user to block
 *     responses:
 *       200:
 *         description: User blocked successfully
 *       403:
 *         description: Unauthorized
 */
router.put("/users/block/:id", adminAuth, blockUser);

/**
 * @swagger
 * /api/admin/auth/users/edit/{id}:
 *   put:
 *     summary: Edit user details
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the user to edit
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
 *               status:
 *                 type: string
 *     responses:
 *       200:
 *         description: User details updated successfully
 *       403:
 *         description: Unauthorized
 */
router.put("/users/edit/:id", adminAuth, editUser);

/**
 * @swagger
 * /api/admin/auth/users/add:
 *   post:
 *     summary: Add a new user from admin panel
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
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
 *               status:
 *                 type: string
 *     responses:
 *       201:
 *         description: User added successfully
 *       400:
 *         description: Bad request
 */
router.post("/users/add", adminAuth, addUserFromAdmin);

/**
 * @swagger
 * /api/admin/auth/dashboard/registrations:
 *   get:
 *     summary: Get monthly user registrations data
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Monthly registration data retrieved successfully
 *       403:
 *         description: Unauthorized
 */
router.get("/dashboard/registrations", adminAuth, getUserRegistrationsPerMonth);

/**
 * @swagger
 * /api/admin/auth/dashboard/status-counts:
 *   get:
 *     summary: Get user status counts
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: User status counts retrieved successfully
 *       403:
 *         description: Unauthorized
 */
router.get("/dashboard/status-counts", adminAuth, getUserStatusCounts);

/**
 * @swagger
 * /api/admin/auth/users:
 *   get:
 *     summary: Get all users with full details
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully fetched all users
 *       500:
 *         description: Server error
 */

router.get("/users", adminAuth, getAllUsers);



router.get("/inquiries/all", adminAuth, getAllInquiries);


router.get("/user/:id", adminAuth, getUserById);





module.exports = router;
