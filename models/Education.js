const mongoose = require("mongoose");

const educationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // ✅ Matches User schema
  education_level: String,
  education_field: String,
  qualification_details: String,
});

const Education = mongoose.model("Education", educationSchema);
module.exports = Education;
