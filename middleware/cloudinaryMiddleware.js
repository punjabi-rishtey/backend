const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");

// ✅ Configure Cloudinary Storage
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "testimonials",
    allowed_formats: ["jpg", "jpeg", "png"],
    transformation: [{ width: 500, height: 500, crop: "limit" }],
  },
});

// ✅ Initialize Multer
const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB Limit
  fileFilter: (req, file, cb) => {
    console.log("📢 Incoming file:", file);
    if (!file) {
      console.error("❌ No file received!");
      return cb(new Error("No file uploaded!"), false);
    }
    cb(null, true);
  }
});

// ✅ Log Errors
upload.single("image").handleFile = function handleFile(req, file, cb) {
  console.log("Uploading file to Cloudinary:", file.originalname);
  cb(null, file);
};

module.exports = upload;
