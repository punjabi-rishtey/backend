// const mongoose = require("mongoose");

// const educationSchema = new mongoose.Schema({
//   user: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // ✅ Matches User schema
//   user_name: { type: String, required: true },
//   education_level: String,
//   education_field: String,
//   qualification_details: String,
// });

// const Education = mongoose.model("Education", educationSchema);
// module.exports = Education;


const mongoose = require("mongoose");

const educationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // ✅ Matches User schema
  user_name: { type: String, required: true },
  education_level: { type: String, default: ""}, // High School, Bachelor's, Master's, etc.
  education_field: { type: String, default: "" }, // Field of Study

  school_details: {
    name: { type: String, default: "" }, // School Name
    city: { type: String, default: "" }, // School City
  },

  college_details: {
    name: { type: String, default: "" }, // College Name
    city: { type: String, default: "" }, // College City
    passout_year: { type: String, default: "" }, // Year of Passing
  },
});

const Education = mongoose.model("Education", educationSchema);
module.exports = Education;
