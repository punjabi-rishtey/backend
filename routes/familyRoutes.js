const express = require("express");
const { 
  addFamilyDetails, 
  getFamilyDetails,  
  updateFamilyDetails 
} = require("../controllers/familyController");
const protect = require("../middleware/authMiddleware");

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Families
 *   description: APIs related to user family details
 */

/**
 * @swagger
 * /api/families/:
 *   post:
 *     summary: Add family details
 *     tags: [Families]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               father_name:
 *                 type: string
 *               mother_name:
 *                 type: string
 *               siblings:
 *                 type: number
 *               family_type:
 *                 type: string
 *               occupation:
 *                 type: string
 *     responses:
 *       201:
 *         description: Family details added successfully
 *       400:
 *         description: Invalid input data
 */
router.post("/", protect, addFamilyDetails);

/**
 * @swagger
 * /api/families/{userId}:
 *   get:
 *     summary: Get family details for a user
 *     tags: [Families]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the user whose family details are to be retrieved
 *     responses:
 *       200:
 *         description: Family details retrieved successfully
 *       404:
 *         description: Family details not found
 */
router.get("/:userId", protect, getFamilyDetails);

/**
 * @swagger
 * /api/families/{userId}:
 *   put:
 *     summary: Update family details
 *     tags: [Families]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the user whose family details are to be updated
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               father_name:
 *                 type: string
 *               mother_name:
 *                 type: string
 *               siblings:
 *                 type: number
 *               family_type:
 *                 type: string
 *               occupation:
 *                 type: string
 *     responses:
 *       200:
 *         description: Family details updated successfully
 *       400:
 *         description: Invalid request data
 *       404:
 *         description: User not found
 */
router.put("/:userId", protect, updateFamilyDetails);

module.exports = router;
