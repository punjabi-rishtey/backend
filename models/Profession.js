const mongoose = require("mongoose");

const professionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // ✅ Matches User schema
  occupation: String,
  designation: String,
  working_with: String,
  working_as: String,
  income: String,
  work_address: String,
});

const Profession = mongoose.model("Profession", professionSchema);
module.exports = Profession;
