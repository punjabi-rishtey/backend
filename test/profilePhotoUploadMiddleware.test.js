const assert = require("node:assert/strict");
const http = require("node:http");
const express = require("express");
const profilePhotoUpload = require("../middleware/profilePhotoUploadMiddleware");

const postMultipart = (port, boundary, bodyBuffers) =>
  new Promise((resolve, reject) => {
    const body = Buffer.concat([
      ...bodyBuffers,
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ]);
    const request = http.request(
      {
        hostname: "127.0.0.1",
        port,
        path: "/upload",
        method: "POST",
        headers: {
          "Content-Type": `multipart/form-data; boundary=${boundary}`,
          "Content-Length": body.length,
        },
      },
      (res) => {
        let payload = "";
        res.on("data", (chunk) => {
          payload += chunk;
        });
        res.on("end", () => {
          resolve({
            statusCode: res.statusCode,
            body: payload ? JSON.parse(payload) : {},
          });
        });
      }
    );

    request.on("error", reject);
    request.write(body);
    request.end();
  });

const buildUploadPart = (boundary, fieldName, filename, contentType, data) => {
  const header = Buffer.from(
    `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="${fieldName}"; filename="${filename}"\r\n` +
      `Content-Type: ${contentType}\r\n\r\n`
  );
  const payload = Buffer.isBuffer(data) ? data : Buffer.from(String(data));
  return Buffer.concat([header, payload]);
};

const main = async () => {
  const { isAllowedProfilePhoto, PROFILE_PHOTO_MAX_BYTES } = profilePhotoUpload;

  assert.equal(isAllowedProfilePhoto("photo.heic", "image/heic"), true);
  assert.equal(isAllowedProfilePhoto("photo.heif", "image/heif"), true);
  assert.equal(isAllowedProfilePhoto("photo.jpg", "image/jpeg"), true);
  assert.equal(isAllowedProfilePhoto("photo.png", "image/png"), true);
  assert.equal(isAllowedProfilePhoto("photo.gif", "image/gif"), false);
  assert.equal(PROFILE_PHOTO_MAX_BYTES, 15 * 1024 * 1024);

  const app = express();
  const uploadMiddleware = profilePhotoUpload.handleProfilePhotoUpload(
    profilePhotoUpload.array("profile_pictures", 1)
  );

  app.post("/upload", uploadMiddleware, (req, res) => {
    res.status(200).json({ count: (req.files || []).length });
  });

  const server = app.listen(0);
  const { port } = server.address();
  const boundary = "----cursor-profile-photo-test";

  try {
    const rejectedType = await postMultipart(port, boundary, [
      buildUploadPart(boundary, "profile_pictures", "notes.txt", "text/plain", "hello"),
    ]);
    assert.equal(rejectedType.statusCode, 400);
    assert.match(rejectedType.body.message, /JPEG|HEIC/i);

    const oversized = Buffer.alloc(PROFILE_PHOTO_MAX_BYTES + 1, 1);
    const rejectedSize = await postMultipart(port, boundary, [
      buildUploadPart(boundary, "profile_pictures", "big.jpg", "image/jpeg", oversized),
    ]);
    assert.equal(rejectedSize.statusCode, 400);
    assert.match(rejectedSize.body.message, /15MB/i);
    assert.doesNotMatch(rejectedSize.body.message, /Server error/i);

    const accepted = await postMultipart(port, boundary, [
      buildUploadPart(
        boundary,
        "profile_pictures",
        "portrait.heic",
        "image/heic",
        "fake-heic-bytes"
      ),
    ]);
    assert.equal(accepted.statusCode, 200);
    assert.equal(accepted.body.count, 1);
  } finally {
    server.close();
  }

  console.log("profile photo upload middleware accepts HEIC and returns 400 multer errors");
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});