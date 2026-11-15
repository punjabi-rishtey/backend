const assert = require("node:assert/strict");
const express = require("express");
const http = require("node:http");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const protect = require("../middleware/authMiddleware");
const adminAuth = require("../middleware/adminAuthMiddleware");
const {
  memberSignOptions,
  adminSignOptions,
  memberVerifyOptions,
  adminVerifyOptions,
} = require("../config/jwt");
const Admin = require("../models/Admin");

const MEMBER_SECRET = "test-member-jwt-secret";
const ADMIN_SECRET = "test-admin-jwt-secret";

process.env.JWT_SECRET = MEMBER_SECRET;
process.env.ADMIN_JWT_SECRET = ADMIN_SECRET;

const memberId = new mongoose.Types.ObjectId();
const adminId = new mongoose.Types.ObjectId();

const memberToken = jwt.sign(
  { id: memberId },
  MEMBER_SECRET,
  memberSignOptions("1h")
);

const adminToken = jwt.sign(
  { id: adminId, role: "admin", email: "admin@test.local" },
  ADMIN_SECRET,
  adminSignOptions("1h")
);

assert.throws(
  () =>
    jwt.verify(memberToken, ADMIN_SECRET, adminVerifyOptions),
  /invalid signature|jwt audience invalid|jwt issuer invalid/
);

assert.throws(
  () =>
    jwt.verify(adminToken, MEMBER_SECRET, memberVerifyOptions),
  /invalid signature|jwt audience invalid|jwt issuer invalid/
);

Admin.findById = async (id) =>
  String(id) === String(adminId)
    ? { _id: adminId, email: "admin@test.local", role: "admin" }
    : null;

const app = express();
app.get("/api/users/profile-completion", protect, (req, res) => {
  res.status(200).json({ ok: true });
});
app.get("/api/admin/auth/dashboard", adminAuth, (req, res) => {
  res.status(200).json({ ok: true });
});

const listen = (application) =>
  new Promise((resolve, reject) => {
    const server = application.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      resolve({ server, port });
    });
    server.on("error", reject);
  });

const requestJson = (port, method, path, authorization) =>
  new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port,
        method,
        path,
        headers: authorization ? { Authorization: authorization } : {},
      },
      (res) => {
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          const bodyText = Buffer.concat(chunks).toString("utf8");
          let body = null;
          if (bodyText) {
            try {
              body = JSON.parse(bodyText);
            } catch {
              body = bodyText;
            }
          }
          resolve({ statusCode: res.statusCode, body });
        });
      }
    );
    req.on("error", reject);
    req.end();
  });

const main = async () => {
  const { server, port } = await listen(app);

  try {
    const memberOnAdmin = await requestJson(
      port,
      "GET",
      "/api/admin/auth/dashboard",
      `Bearer ${memberToken}`
    );
    assert.equal(
      memberOnAdmin.statusCode,
      401,
      "Member token must be rejected on admin routes"
    );

    const adminOnMember = await requestJson(
      port,
      "GET",
      "/api/users/profile-completion",
      adminToken
    );
    assert.equal(
      adminOnMember.statusCode,
      401,
      "Admin token must be rejected on member-only routes"
    );

    console.log("jwtAuthSeparation tests passed ✅");
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
};

main().catch((error) => {
  console.error("jwtAuthSeparation tests failed ❌", error);
  process.exit(1);
});