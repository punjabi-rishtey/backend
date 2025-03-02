const mongoose = require("mongoose");

const preferenceSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  preferences: { type: [String], required: true } // ✅ Store preference choices as an array
});

const Preference = mongoose.model("Preference", preferenceSchema);
module.exports = Preference;
