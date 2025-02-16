const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  gender: { type: String, required: true },
  dob: { type: String, required: true },
  age: {
    type: Number,
    get: function () {
      return new Date().getFullYear() - new Date(this.dob).getFullYear();
    }
  },
  height: String,
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  religion: { type: String, required: true },
  caste: { type: String },  // ✅ Adding caste since it's used in search filters
  mobile: { type: String, unique: true, required: true },
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  location: {
    city: String,
    pincode: String,
  },
  hobbies: [String],
  // status: { type: String, default: "Incomplete" },
  status: { 
    type: String, 
    enum: ["Incomplete", "Pending", "Approved", "Expired", "Canceled"], 
    default: "Pending" // New users will now be "Pending" by default
  },
  mangalik: Boolean,
  language: String,
  marital_status: { type: String, required: true },
  birth_details: {
    birth_time: String,
    birth_place: String,
  },
  physical_attributes: {
    skin_tone: String,
    body_type: String,
    physical_disability: Boolean,
    disability_reason: String,
  },
  lifestyle: {
    smoke: Boolean,
    drink: Boolean,
    veg_nonveg: String,
    nri_status: Boolean,
  },
  metadata: {
    register_date: { type: Date, default: Date.now },
    exp_date: { type: Date, default: () => new Date(+new Date() + 365 * 24 * 60 * 60 * 1000) } // 1 year expiry
  },

  profile_pictures: [{ type: String }],

  // ✅ Add References to Related Collections
  family: { type: mongoose.Schema.Types.ObjectId, ref: "Family" },
  education: { type: mongoose.Schema.Types.ObjectId, ref: "Education" },
  profession: { type: mongoose.Schema.Types.ObjectId, ref: "Profession" },
  astrology: { type: mongoose.Schema.Types.ObjectId, ref: "Astrology" },
  
  is_deleted: { type: Boolean, default: false }

});


// ✅ Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

const User = mongoose.model("User", userSchema);
module.exports = User;
