const multer = require("multer");
const path = require("path");

const PROFILE_PHOTO_MAX_BYTES = 15 * 1024 * 1024;

const ALLOWED_EXTENSIONS = new Set([
  ".jpeg",
  ".jpg",
  ".png",
  ".heic",
  ".heif",
]);

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/heic",
  "image/heif",
]);

const ALLOWED_EXTENSION_PATTERN = /\.(jpe?g|png|heic|heif)$/i;
const ALLOWED_MIME_PATTERN = /^image\/(jpe?g|png|heic|heif)$/i;

const storage = multer.memoryStorage();

const isAllowedProfilePhoto = (originalname, mimetype) => {
  const ext = path.extname(String(originalname || "")).toLowerCase();
  const mime = String(mimetype || "").toLowerCase().split(";")[0].trim();

  const extensionOk =
    ALLOWED_EXTENSIONS.has(ext) || ALLOWED_EXTENSION_PATTERN.test(ext);
  const mimetypeOk =
    ALLOWED_MIME_TYPES.has(mime) || ALLOWED_MIME_PATTERN.test(mime);

  return extensionOk && mimetypeOk;
};

const profilePhotoRejectionMessage =
  "Only JPEG, JPG, PNG, HEIC, and HEIF profile photos are allowed.";

const fileFilter = (req, file, cb) => {
  if (isAllowedProfilePhoto(file.originalname, file.mimetype)) {
    return cb(null, true);
  }

  cb(new Error(profilePhotoRejectionMessage));
};

const multerUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: PROFILE_PHOTO_MAX_BYTES },
});

const formatMulterErrorMessage = (error) => {
  if (error.code === "LIMIT_FILE_SIZE") {
    const maxMb = PROFILE_PHOTO_MAX_BYTES / (1024 * 1024);
    return `Each profile photo must be ${maxMb}MB or smaller.`;
  }

  if (error.code === "LIMIT_FILE_COUNT") {
    return error.message;
  }

  if (error.code === "LIMIT_UNEXPECTED_FILE") {
    return error.message;
  }

  return error.message || "Invalid profile photo upload.";
};

const handleProfilePhotoUpload =
  (uploadMiddleware) => (req, res, next) => {
    uploadMiddleware(req, res, (error) => {
      if (!error) {
        return next();
      }

      const message =
        error instanceof multer.MulterError
          ? formatMulterErrorMessage(error)
          : error.message || "Invalid profile photo upload.";

      return res.status(400).json({ message });
    });
  };

module.exports = multerUpload;
module.exports.handleProfilePhotoUpload = handleProfilePhotoUpload;
module.exports.isAllowedProfilePhoto = isAllowedProfilePhoto;
module.exports.PROFILE_PHOTO_MAX_BYTES = PROFILE_PHOTO_MAX_BYTES;
module.exports.profilePhotoRejectionMessage = profilePhotoRejectionMessage;