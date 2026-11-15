const multer = require("multer");
const path = require("path");

// Local disk under uploads/ is for demo mode only; production uses in-memory buffers + Cloudinary.
const storage =
  process.env.DEMO_LOCAL_MEDIA === "true"
    ? multer.diskStorage({
        destination: function (req, file, cb) {
          cb(null, "uploads/");
        },
        filename: function (req, file, cb) {
          cb(
            null,
            `${req.params.id || "subscription"}_${Date.now()}${path.extname(file.originalname)}`
          );
        },
      })
    : multer.memoryStorage();

// ✅ File filter to allow only images
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error("Only .jpeg, .jpg, and .png files are allowed!"));
  }
};

// ✅ Initialize multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // Limit file size to 5MB
});

module.exports = upload;
