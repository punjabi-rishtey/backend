const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { assertDemoIsolated, demoPublicBaseUrl } = require("./demoGuard");

const DEMO_UPLOAD_DIR = path.join(__dirname, "..", "uploads", "demo");
const LOCAL_DEMO_PREFIX = "local-demo/";
const ALLOWED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png"]);

const extensionFor = (originalName) => {
  const ext = path.extname(String(originalName || "")).toLowerCase();
  return ALLOWED_EXTENSIONS.has(ext) ? ext : ".jpg";
};

const saveDemoImageBuffer = (buffer, originalName) => {
  assertDemoIsolated();
  if (!buffer || !buffer.length) {
    throw new Error("Demo image upload was empty.");
  }

  fs.mkdirSync(DEMO_UPLOAD_DIR, { recursive: true });
  const filename = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}${extensionFor(originalName)}`;
  fs.writeFileSync(path.join(DEMO_UPLOAD_DIR, filename), buffer);

  return {
    url: `${demoPublicBaseUrl()}/uploads/demo/${filename}`,
    public_id: `${LOCAL_DEMO_PREFIX}${filename}`,
  };
};

const saveDemoImageFromPath = (filePath, originalName) => {
  const buffer = fs.readFileSync(filePath);
  return saveDemoImageBuffer(buffer, originalName || path.basename(filePath));
};

const isLocalDemoPublicId = (publicId) =>
  String(publicId || "").startsWith(LOCAL_DEMO_PREFIX);

const deleteLocalDemoUpload = (publicId) => {
  if (!isLocalDemoPublicId(publicId)) return false;

  const filename = path.basename(publicId);
  const dest = path.join(DEMO_UPLOAD_DIR, filename);
  if (fs.existsSync(dest)) {
    fs.unlinkSync(dest);
  }
  return true;
};

module.exports = {
  LOCAL_DEMO_PREFIX,
  deleteLocalDemoUpload,
  isLocalDemoPublicId,
  saveDemoImageBuffer,
  saveDemoImageFromPath,
};
