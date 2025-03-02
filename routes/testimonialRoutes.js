const express = require("express");
const router = express.Router();
const upload = require("../middleware/cloudinaryMiddleware");
const { addTestimonial, getAllTestimonials, editTestimonial, deleteTestimonial } = require("../controllers/testimonialController");

/**
 * @swagger
 * tags:
 *   name: Testimonials
 *   description: API endpoints for managing testimonials
 */

/**
 * @swagger
 * /api/testimonials/add:
 *   post:
 *     summary: Add a new testimonial
 *     tags: [Testimonials]
 *     consumes:
 *       - multipart/form-data
 *     parameters:
 *       - in: formData
 *         name: image
 *         type: file
 *         description: Image file for the testimonial
 *       - in: body
 *         name: testimonial
 *         description: Testimonial details
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
 *         description: Testimonial added successfully
 *       400:
 *         description: Bad request
 */
router.post("/add", upload.single("image"), addTestimonial);

/**
 * @swagger
 * /api/testimonials/all:
 *   get:
 *     summary: Get all testimonials
 *     tags: [Testimonials]
 *     responses:
 *       200:
 *         description: Returns a list of testimonials
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
router.get("/all", getAllTestimonials);

/**
 * @swagger
 * /api/testimonials/edit/{id}:
 *   put:
 *     summary: Edit an existing testimonial
 *     tags: [Testimonials]
 *     consumes:
 *       - multipart/form-data
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The testimonial ID
 *       - in: formData
 *         name: image
 *         type: file
 *         description: New image file for the testimonial
 *       - in: body
 *         name: testimonial
 *         description: Updated testimonial details
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
 *         description: Testimonial updated successfully
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Testimonial not found
 */
router.put("/edit/:id", upload.single("image"), editTestimonial);

/**
 * @swagger
 * /api/testimonials/{id}:
 *   delete:
 *     summary: Delete a testimonial
 *     tags: [Testimonials]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The testimonial ID
 *     responses:
 *       200:
 *         description: Testimonial deleted successfully
 *       404:
 *         description: Testimonial not found
 */
router.delete("/:id", deleteTestimonial);

module.exports = router;