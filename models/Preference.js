const mongoose = require("mongoose");

const preferenceSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  preference1: { type: String, required: true },
  preference2: { type: String, required: true },
  preference3: { type: String, required: true }
});

const Preference = mongoose.model("Preference", preferenceSchema);
module.exports = Preference;
