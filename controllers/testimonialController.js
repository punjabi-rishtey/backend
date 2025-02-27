const Testimonial = require("../models/Testimonial");
const cloudinary = require("../config/cloudinary");

const addTestimonial = async (req, res) => {
    try {
      console.log("🔥 Incoming request body:", req.body);
      console.log("📸 Incoming file:", req.file);
  
      const { user_name, message } = req.body;
  
      if (!user_name || !message) {
        console.error("❌ Missing fields: user_name or message");
        return res.status(400).json({ error: "User Name and message are required" });
      }
  
      if (!req.file) {
        console.error("❌ No file uploaded!");
        return res.status(400).json({ error: "Image file is required!" });
      }
  
      let image_url = null;
      let image_public_id = null;
  
      try {
        image_url = req.file.path;
        image_public_id = req.file.filename?.split('.')[0] || null;
      } catch (cloudinaryError) {
        console.error("❌ Cloudinary Upload Error:", cloudinaryError);
        return res.status(500).json({ error: "Cloudinary upload failed!", details: cloudinaryError.message });
      }
  
      const newTestimonial = new Testimonial({
        user_name,
        message,
        image_url,
        image_public_id
      });
  
      await newTestimonial.save();
  
      res.status(201).json({ message: "Testimonial added successfully", testimonial: newTestimonial });
    } catch (error) {
      console.error("❌ Error adding testimonial:", error);
      res.status(500).json({ error: "Server error!", details: error.message });
    }
  };
  
// ✅ Get All Testimonials
const getAllTestimonials = async (req, res) => {
  try {
    const testimonials = await Testimonial.find().sort({ created_at: -1 });
    res.status(200).json(testimonials);
  } catch (error) {
    console.error("Error fetching testimonials:", error);
    res.status(500).json({ error: "Server error!" });
  }
};

// ✅ Edit Testimonial
const editTestimonial = async (req, res) => {
  try {
    const { id } = req.params;
    const { user_name, message } = req.body;

    const updatedFields = { user_name, message };

    if (req.file) {
      const image_url = req.file.path;
      const image_public_id = req.file.filename.split('.')[0];

      updatedFields.image_url = image_url;
      updatedFields.image_public_id = image_public_id;
    }

    const updatedTestimonial = await Testimonial.findByIdAndUpdate(id, updatedFields, { new: true });

    if (!updatedTestimonial) return res.status(404).json({ error: "Testimonial not found!" });

    res.status(200).json({ message: "Testimonial updated successfully", testimonial: updatedTestimonial });
  } catch (error) {
    console.error("Error updating testimonial:", error);
    res.status(500).json({ error: "Server error!" });
  }
};

// ✅ Delete Testimonial
const deleteTestimonial = async (req, res) => {
  try {
    const { id } = req.params;

    const testimonial = await Testimonial.findById(id);
    if (!testimonial) return res.status(404).json({ error: "Testimonial not found!" });

    try {
      if (testimonial.image_public_id) {
        await cloudinary.uploader.destroy(testimonial.image_public_id);
      }
    } catch (cloudinaryError) {
      console.error("Cloudinary deletion error:", cloudinaryError);
    }

    await Testimonial.findByIdAndDelete(id);
    res.status(200).json({ message: "Testimonial deleted successfully!" });
  } catch (error) {
    console.error("Error deleting testimonial:", error);
    res.status(500).json({ error: "Server error!" });
  }
};

module.exports = { addTestimonial, getAllTestimonials, editTestimonial, deleteTestimonial };
