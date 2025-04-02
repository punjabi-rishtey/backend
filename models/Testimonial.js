const mongoose = require("mongoose");

const testimonialSchema = new mongoose.Schema({
  user_name: { type: String, required: true },
  message: { type: String, required: true },
  image_url: { type: String }, // Cloudinary image URL
  image_public_id: { type: String }, // Cloudinary public ID for deletion
  created_at: { type: Date, default: Date.now },

  groom_registration_date: { type: Date },
  bride_registration_date: { type: Date },
  marriage_date: { type: Date }

});

const Testimonial = mongoose.model("Testimonial", testimonialSchema);
module.exports = Testimonial;
