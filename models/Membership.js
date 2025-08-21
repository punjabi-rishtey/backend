// ✅ Membership Model
const mongoose = require("mongoose");

const membershipSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  price: { type: Number, required: true },
  premiumProfilesView: { type: String, default: "Unlimited" },
  duration: { type: Number, required: true },
  created_at: { type: Date, default: Date.now },
});

const Membership = mongoose.model("Membership", membershipSchema);
module.exports = Membership;
