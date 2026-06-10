const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

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
    if (!file) {
      return cb(new Error("No file uploaded."), false);
    }

    if (!ALLOWED_IMAGE_TYPES.has(file.mimetype)) {
      return cb(
        new Error("Please upload a JPG, PNG, or WebP image."),
        false
      );
    }

    cb(null, true);
  }
});

module.exports = upload;
