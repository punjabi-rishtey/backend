const assert = require("node:assert/strict");
const { collectJwtSecretWarnings } = require("../config/jwt");

const strongMember = "a".repeat(48);
const strongAdmin = "b".repeat(48);

assert.deepEqual(
  collectJwtSecretWarnings({
    JWT_SECRET: strongMember,
    ADMIN_JWT_SECRET: strongAdmin,
  }),
  []
);

const shortWarnings = collectJwtSecretWarnings({
  JWT_SECRET: "short-member",
  ADMIN_JWT_SECRET: strongAdmin,
});
assert.ok(
  shortWarnings.some((w) => w.includes("JWT_SECRET")),
  "short JWT_SECRET should warn"
);

const placeholderWarnings = collectJwtSecretWarnings({
  JWT_SECRET: "demo-only-local-secret",
  ADMIN_JWT_SECRET: "demo-only-local-admin-secret",
});
assert.ok(
  placeholderWarnings.length >= 2,
  "demo placeholder secrets should produce warnings"
);
assert.ok(
  placeholderWarnings.every((w) =>
    /placeholder pattern|shorter than/.test(w)
  ),
  "warnings should mention weakness or length"
);

const sameSecretWarnings = collectJwtSecretWarnings({
  JWT_SECRET: strongMember,
  ADMIN_JWT_SECRET: strongMember,
});
assert.ok(
  sameSecretWarnings.some((w) => w.includes("must not be identical")),
  "identical secrets should warn"
);

console.log("jwtSecretStrength tests passed ✅");