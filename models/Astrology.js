const mongoose = require("mongoose");

const astrologySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // ✅ Matches User schema
  rashi_nakshatra: String,
  gotra: String,
  gotra_mama: String,
});

const Astrology = mongoose.model("Astrology", astrologySchema);
module.exports = Astrology;
