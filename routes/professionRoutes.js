// const express = require("express");
// const { addProfessionDetails, getProfessionDetails,updateProfessionDetails} = require("../controllers/professionController");
// const protect = require("../middleware/authMiddleware");

// const router = express.Router();

// router.post("/", protect, addProfessionDetails);
// router.get("/:userId", protect, getProfessionDetails);
// router.put("/:userId", protect, updateProfessionDetails); 


// module.exports = router;


const express = require("express");
const { 
  addProfessionDetails, 
  getProfessionDetails, 
  updateProfessionDetails 
} = require("../controllers/professionController");
const protect = require("../middleware/authMiddleware");

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Professions
 *   description: APIs related to user profession details
 */

/**
 * @swagger
 * /api/professions/:
 *   post:
 *     summary: Add profession details
 *     tags: [Professions]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               occupation:
 *                 type: string
 *               company:
 *                 type: string
 *               salary:
 *                 type: number
 *               experience:
 *                 type: number
 *     responses:
 *       201:
 *         description: Profession details added successfully
 *       400:
 *         description: Invalid input data
 */
router.post("/", protect, addProfessionDetails);

/**
 * @swagger
 * /api/professions/{userId}:
 *   get:
 *     summary: Get profession details for a user
 *     tags: [Professions]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the user whose profession details are to be retrieved
 *     responses:
 *       200:
 *         description: Profession details retrieved successfully
 *       404:
 *         description: Profession details not found
 */
router.get("/:userId", protect, getProfessionDetails);

/**
 * @swagger
 * /api/professions/{userId}:
 *   put:
 *     summary: Update profession details
 *     tags: [Professions]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the user whose profession details are to be updated
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               occupation:
 *                 type: string
 *               company:
 *                 type: string
 *               salary:
 *                 type: number
 *               experience:
 *                 type: number
 *     responses:
 *       200:
 *         description: Profession details updated successfully
 *       400:
 *         description: Invalid request data
 *       404:
 *         description: User not found
 */
router.put("/:userId", protect, updateProfessionDetails);

module.exports = router;

