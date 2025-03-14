// const express = require("express");
// const { addAstrologyDetails, getAstrologyDetails, updateAstrologyDetails } = require("../controllers/astrologyController");
// const protect = require("../middleware/authMiddleware");

// const router = express.Router();

// router.post("/", protect, addAstrologyDetails);
// router.get("/:userId", protect, getAstrologyDetails);
// router.put("/:userId", protect, updateAstrologyDetails); 


// module.exports = router;


const express = require("express");
const { 
  addAstrologyDetails, 
  getAstrologyDetails, 
  updateAstrologyDetails 
} = require("../controllers/astrologyController");
const protect = require("../middleware/authMiddleware");

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Astrology
 *   description: APIs related to user astrology details
 */

/**
 * @swagger
 * /api/astrologies/:
 *   post:
 *     summary: Add astrology details
 *     tags: [Astrology]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               rashi:
 *                 type: string
 *               nakshatra:
 *                 type: string
 *               gotra:
 *                 type: string
 *               mangalik:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Astrology details added successfully
 *       400:
 *         description: Invalid input data
 */
router.post("/", protect, addAstrologyDetails);

/**
 * @swagger
 * /api/astrologies/{userId}:
 *   get:
 *     summary: Get astrology details for a user
 *     tags: [Astrology]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the user whose astrology details are to be retrieved
 *     responses:
 *       200:
 *         description: Astrology details retrieved successfully
 *       404:
 *         description: Astrology details not found
 */
router.get("/:userId", protect, getAstrologyDetails);

/**
 * @swagger
 * /api/astrologies/{userId}:
 *   put:
 *     summary: Update astrology details
 *     tags: [Astrology]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the user whose astrology details are to be updated
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               rashi:
 *                 type: string
 *               nakshatra:
 *                 type: string
 *               gotra:
 *                 type: string
 *               mangalik:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Astrology details updated successfully
 *       400:
 *         description: Invalid request data
 *       404:
 *         description: User not found
 */
router.put("/:userId", protect, updateAstrologyDetails);






module.exports = router;
