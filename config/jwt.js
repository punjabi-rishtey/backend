const { isDemoModeRequested } = require("./demoGuard");

const MEMBER_JWT_ISSUER = "pr-user";
const MEMBER_JWT_AUDIENCE = "pr-user";
const ADMIN_JWT_ISSUER = "pr-admin";
const ADMIN_JWT_AUDIENCE = "pr-admin";

const memberSignOptions = (expiresIn) => ({
  expiresIn,
  issuer: MEMBER_JWT_ISSUER,
  audience: MEMBER_JWT_AUDIENCE,
});

const adminSignOptions = (expiresIn) => ({
  expiresIn,
  issuer: ADMIN_JWT_ISSUER,
  audience: ADMIN_JWT_AUDIENCE,
});

const memberVerifyOptions = {
  issuer: MEMBER_JWT_ISSUER,
  audience: MEMBER_JWT_AUDIENCE,
};

const adminVerifyOptions = {
  issuer: ADMIN_JWT_ISSUER,
  audience: ADMIN_JWT_AUDIENCE,
};

const assertJwtSecretsConfigured = () => {
  if (!String(process.env.JWT_SECRET || "").trim()) {
    throw new Error("JWT_SECRET is required.");
  }

  if (isDemoModeRequested()) {
    return;
  }

  if (!String(process.env.ADMIN_JWT_SECRET || "").trim()) {
    throw new Error(
      "ADMIN_JWT_SECRET is required when not running in demo mode. Set ADMIN_JWT_SECRET in the environment before starting the server."
    );
  }
};

const getAdminJwtSecret = () => {
  const secret = String(process.env.ADMIN_JWT_SECRET || "").trim();
  if (!secret) {
    throw new Error(
      "ADMIN_JWT_SECRET is not configured. Admin authentication is unavailable."
    );
  }
  return secret;
};

module.exports = {
  MEMBER_JWT_ISSUER,
  MEMBER_JWT_AUDIENCE,
  ADMIN_JWT_ISSUER,
  ADMIN_JWT_AUDIENCE,
  memberSignOptions,
  adminSignOptions,
  memberVerifyOptions,
  adminVerifyOptions,
  assertJwtSecretsConfigured,
  getAdminJwtSecret,
};