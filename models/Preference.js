const mongoose = require("mongoose");

const preferenceSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  preference1: { type: String },
  preference2: { type: String },
  preference3: { type: String }
});

const Preference = mongoose.model("Preference", preferenceSchema);
module.exports = Preference;
