// ✅ Membership Model
const mongoose = require("mongoose");

const membershipSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  price: { type: Number, required: true },
  premiumProfilesView: { type: Number, required: true },
  viewContactDetails: { type: Boolean, default: false },
  sendInterest: { type: Boolean, default: false },
  startChat: { type: Boolean, default: false },
  created_at: { type: Date, default: Date.now },
});

const Membership = mongoose.model("Membership", membershipSchema);
module.exports = Membership;
