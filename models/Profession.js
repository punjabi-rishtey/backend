// const mongoose = require("mongoose");

// const professionSchema = new mongoose.Schema({
//   user: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // ✅ Matches User schema
//   user_name: { type: String, required: true },
//   occupation: String,
//   designation: String,
//   working_with: String,
//   income: String,
//   work_address: String,
// });

// const Profession = mongoose.model("Profession", professionSchema);
// module.exports = Profession;


const mongoose = require("mongoose");

const professionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  user_name: { type: String, required: true },
  occupation: String,
  designation: String,
  working_with: String,
  income: String,
  work_address: {
    address: { type: String, default: "" },
    city: { type: String, default: "" },
  },
});



const Profession = mongoose.model("Profession", professionSchema);
module.exports = Profession;
