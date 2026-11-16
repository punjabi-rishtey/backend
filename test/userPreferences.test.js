const assert = require("node:assert/strict");
const express = require("express");
const http = require("node:http");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const {
  validatePartnerPreferenceBody,
  ALLOWED_VALUES,
} = require("../services/partnerPreferenceOptions");
const protect = require("../middleware/authMiddleware");
const { memberSignOptions } = require("../config/jwt");
const { updateUserPreferences } = require("../controllers/userController");
const Preference = require("../models/Preference");
const User = require("../models/User");

const MEMBER_SECRET = "test-member-jwt-secret-for-preferences";
process.env.JWT_SECRET = MEMBER_SECRET;

const userA = new mongoose.Types.ObjectId();
const userB = new mongoose.Types.ObjectId();

const validValues = ["similar_age", "graduate_plus", "traditional_family"];

function tokenFor(userId) {
  return jwt.sign({ id: userId }, MEMBER_SECRET, memberSignOptions("1h"));
}

async function runValidationTests() {
  const empty = validatePartnerPreferenceBody({});
  assert.strictEqual(empty.ok, false);

  const invalid = validatePartnerPreferenceBody({
    preference1: "not_a_real_option",
    preference2: validValues[1],
    preference3: validValues[2],
  });
  assert.strictEqual(invalid.ok, false);

  const good = validatePartnerPreferenceBody({
    preference1: `  ${validValues[0]}  `,
    preference2: validValues[1],
    preference3: validValues[2],
  });
  assert.strictEqual(good.ok, true);
  assert.strictEqual(good.preference1, validValues[0]);
  assert.ok(ALLOWED_VALUES.has(validValues[0]));
}

async function callUpdatePreferences({ userId, body, token }) {
  let status;
  let payload;
  const req = {
    params: { id: String(userId) },
    body,
    user: token ? jwt.verify(token.replace("Bearer ", ""), MEMBER_SECRET, require("../config/jwt").memberVerifyOptions) : undefined,
    admin: false,
  };
  const res = {
    status(code) {
      status = code;
      return {
        json(data) {
          payload = data;
        },
      };
    },
    json(data) {
      status = 200;
      payload = data;
    },
  };
  await updateUserPreferences(req, res);
  return { status, payload };
}

async function runControllerTests() {
  const storedDocsByUser = new Map();
  let upsertInsertCount = 0;

  const originalFind = Preference.find;
  const originalFindOneAndUpdate = Preference.findOneAndUpdate;
  const originalDeleteMany = Preference.deleteMany;
  const originalUserFindById = User.findById;

  Preference.find = (query) => ({
    exec: async () => {
      const userId = String(query?.user || "");
      const doc = storedDocsByUser.get(userId);
      return doc ? [doc] : [];
    },
  });

  Preference.findOneAndUpdate = async (filter, update) => {
    const userId = String(filter?.user || "");
    const existing = storedDocsByUser.get(userId);
    if (!existing) {
      upsertInsertCount += 1;
    }
    const doc = {
      _id: existing?._id || new mongoose.Types.ObjectId(),
      ...update,
      toObject() {
        return { ...this };
      },
    };
    storedDocsByUser.set(userId, doc);
    return doc;
  };

  Preference.deleteMany = async () => ({ deletedCount: 0 });

  User.findById = (id) => ({
    select: async () => ({ _id: id, name: "Test User" }),
  });

  User.findByIdAndUpdate = (id, update) => ({
    select: async () => ({
      _id: id,
      preferences: update.$set?.preferences,
    }),
  });

  try {
    const body = {
      preference1: validValues[0],
      preference2: validValues[1],
      preference3: validValues[2],
    };

    const forbidden = await callUpdatePreferences({
      userId: userA,
      body,
      token: tokenFor(userB),
    });
    assert.strictEqual(forbidden.status, 403);

    const invalid = await callUpdatePreferences({
      userId: userA,
      body: { preference1: "", preference2: validValues[1], preference3: validValues[2] },
      token: tokenFor(userA),
    });
    assert.strictEqual(invalid.status, 400);

    const firstSave = await callUpdatePreferences({
      userId: userA,
      body,
      token: tokenFor(userA),
    });
    assert.strictEqual(firstSave.status, 200);
    assert.strictEqual(firstSave.payload.preference1, validValues[0]);
    assert.strictEqual(upsertInsertCount, 1);

    const secondSave = await callUpdatePreferences({
      userId: userA,
      body: {
        preference1: "caste_no_bar",
        preference2: validValues[1],
        preference3: validValues[2],
      },
      token: tokenFor(userA),
    });
    assert.strictEqual(secondSave.status, 200);
    assert.strictEqual(secondSave.payload.preference1, "caste_no_bar");
    assert.strictEqual(
      upsertInsertCount,
      1,
      "second save should update, not create"
    );
  } finally {
    Preference.find = originalFind;
    Preference.findOneAndUpdate = originalFindOneAndUpdate;
    Preference.deleteMany = originalDeleteMany;
    User.findById = originalUserFindById;
    storedDocsByUser.clear();
  }
}

async function runRouteAuthSmoke() {
  const app = express();
  app.use(express.json());
  app.put("/api/users/:id/preferences", protect, updateUserPreferences);

  const { port, server } = await new Promise((resolve, reject) => {
    const s = app.listen(0, "127.0.0.1", () => {
      resolve({ port: s.address().port, server: s });
    });
    s.on("error", reject);
  });

  try {
    const response = await fetch(
      `http://127.0.0.1:${port}/api/users/${userA}/preferences`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenFor(userB)}`,
        },
        body: JSON.stringify({
          preference1: validValues[0],
          preference2: validValues[1],
          preference3: validValues[2],
        }),
      }
    );
    assert.strictEqual(response.status, 403);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

async function main() {
  await runValidationTests();
  await runControllerTests();
  await runRouteAuthSmoke();
  console.log("userPreferences tests passed ✅");
}

main().catch((error) => {
  console.error("userPreferences tests failed ❌", error);
  process.exit(1);
});