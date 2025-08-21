const express = require("express");
const router = express.Router();
const upload = require("../middleware/cloudinaryMiddleware");
const { addReview, getAllReviews, editReview, deleteReview } = require("../controllers/reviewController");

/**
 * @swagger
 * tags:
 *   name: Reviews
 *   description: API endpoints for managing reviews
 */

/**
 * @swagger
 * /api/reviews/add:
 *   post:
 *     summary: Add a new review
 *     tags: [Reviews]
 *     consumes:
 *       - multipart/form-data
 *     parameters:
 *       - in: formData
 *         name: image
 *         type: file
 *         description: Image file for the review
 *       - in: body
 *         name: review
 *         description: Review details
 *         schema:
 *           type: object
 *           properties:
 *             name:
 *               type: string
 *               example: "John Doe"
 *             message:
 *               type: string
 *               example: "Great service!"
 *     responses:
 *       201:
 *         description: Review added successfully
 *       400:
 *         description: Bad request
 */
router.post("/add", addReview);

/**
 * @swagger
 * /api/reviews/all:
 *   get:
 *     summary: Get all reviews
 *     tags: [Reviews]
 *     responses:
 *       200:
 *         description: Returns a list of reviews
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     example: "65abcd123efg456"
 *                   name:
 *                     type: string
 *                     example: "John Doe"
 *                   message:
 *                     type: string
 *                     example: "Great service!"
 */
router.get("/all", getAllReviews);

/**
 * @swagger
 * /api/reviews/edit/{id}:
 *   put:
 *     summary: Edit an existing review
 *     tags: [Reviews]
 *     consumes:
 *       - multipart/form-data
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The review ID
 *       - in: formData
 *         name: image
 *         type: file
 *         description: New image file for the review
 *       - in: body
 *         name: review
 *         description: Updated review details
 *         schema:
 *           type: object
 *           properties:
 *             name:
 *               type: string
 *               example: "Jane Doe"
 *             message:
 *               type: string
 *               example: "Amazing experience!"
 *     responses:
 *       200:
 *         description: Review updated successfully
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Review not found
 */
router.put("/edit/:id", editReview);

/**
 * @swagger
 * /api/reviews/{id}:
 *   delete:
 *     summary: Delete a review
 *     tags: [Reviews]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The review ID
 *     responses:
 *       200:
 *         description: Review deleted successfully
 *       404:
 *         description: Review not found
 */
router.delete("/:id", deleteReview);

module.exports = router;