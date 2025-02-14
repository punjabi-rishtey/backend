const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema({
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  role: { type: String, default: "admin" } // Role ensures only admins can access admin panel
});

const Admin = mongoose.model("Admin", adminSchema);
module.exports = Admin;
