const cloudinary = require("cloudinary").v2;
const dotenv = require("dotenv");

// Load environment variables
dotenv.config();

console.log("🔍 Cloudinary Config:");
console.log("CLOUD_NAME:", process.env.CLOUDINARY_CLOUD_NAME);
console.log("API_KEY:", process.env.CLOUDINARY_API_KEY ? "SET ✅" : "NOT SET ❌");
console.log("API_SECRET:", process.env.CLOUDINARY_API_SECRET ? "SET ✅" : "NOT SET ❌");

// ✅ Properly Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

module.exports = cloudinary;
