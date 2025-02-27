const express = require("express");
const router = express.Router();
const upload = require("../middleware/cloudinaryMiddleware");
const { addTestimonial, getAllTestimonials, editTestimonial, deleteTestimonial } = require("../controllers/testimonialController");

router.post("/add", upload.single("image"), addTestimonial);
router.get("/all", getAllTestimonials);
router.put("/edit/:id", upload.single("image"), editTestimonial);
router.delete("/:id", deleteTestimonial);

module.exports = router;
