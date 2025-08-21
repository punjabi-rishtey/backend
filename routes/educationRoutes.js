// const express = require("express");
// const { addEducationDetails, getEducationDetails, updateEducationDetails } = require("../controllers/educationController");
// const protect = require("../middleware/authMiddleware");

// const router = express.Router();

// router.post("/", protect, addEducationDetails);
// router.get("/:userId", protect, getEducationDetails);
// router.put("/:userId", protect, updateEducationDetails); 


// module.exports = router;


const express = require("express");
const { 
  addEducationDetails, 
  getEducationDetails, 
  updateEducationDetails 
} = require("../controllers/educationController");
const protect = require("../middleware/authMiddleware");

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Education
 *   description: APIs related to user education details
 */

/**
 * @swagger
 * /api/educations/:
 *   post:
 *     summary: Add education details
 *     tags: [Education]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               degree:
 *                 type: string
 *               field_of_study:
 *                 type: string
 *               university:
 *                 type: string
 *               graduation_year:
 *                 type: number
 *     responses:
 *       201:
 *         description: Education details added successfully
 *       400:
 *         description: Invalid input data
 */
router.post("/", protect, addEducationDetails);

/**
 * @swagger
 * /api/educations/{userId}:
 *   get:
 *     summary: Get education details for a user
 *     tags: [Education]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the user whose education details are to be retrieved
 *     responses:
 *       200:
 *         description: Education details retrieved successfully
 *       404:
 *         description: Education details not found
 */
router.get("/:userId", protect, getEducationDetails);

/**
 * @swagger
 * /api/educations/{userId}:
 *   put:
 *     summary: Update education details
 *     tags: [Education]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the user whose education details are to be updated
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               degree:
 *                 type: string
 *               field_of_study:
 *                 type: string
 *               university:
 *                 type: string
 *               graduation_year:
 *                 type: number
 *     responses:
 *       200:
 *         description: Education details updated successfully
 *       400:
 *         description: Invalid request data
 *       404:
 *         description: User not found
 */
router.put("/:userId", protect, updateEducationDetails);

module.exports = router;



