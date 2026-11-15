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

const MIN_RECOMMENDED_SECRET_LENGTH = 32;

const KNOWN_WEAK_SECRET_PATTERNS = [
  /^demo-only-local/i,
  /^changeme/i,
  /^your[-_]?secret/i,
  /^replace-with/i,
  /^secret$/i,
  /^test$/i,
];

const warningsForSecret = (envName, secret) => {
  const warnings = [];
  const trimmed = String(secret || "").trim();
  if (!trimmed) {
    return warnings;
  }

  if (trimmed.length < MIN_RECOMMENDED_SECRET_LENGTH) {
    warnings.push(
      `${envName} is shorter than ${MIN_RECOMMENDED_SECRET_LENGTH} characters; use a cryptographically random value in production.`
    );
  }

  if (KNOWN_WEAK_SECRET_PATTERNS.some((pattern) => pattern.test(trimmed))) {
    warnings.push(
      `${envName} matches a known weak or placeholder pattern; replace before production use.`
    );
  }

  return warnings;
};

/**
 * Non-fatal startup checks. Logs warnings only — does not exit or rotate secrets.
 */
const collectJwtSecretWarnings = (env = process.env) => {
  const warnings = [
    ...warningsForSecret("JWT_SECRET", env.JWT_SECRET),
    ...warningsForSecret("ADMIN_JWT_SECRET", env.ADMIN_JWT_SECRET),
  ];

  const memberSecret = String(env.JWT_SECRET || "").trim();
  const adminSecret = String(env.ADMIN_JWT_SECRET || "").trim();
  if (memberSecret && adminSecret && memberSecret === adminSecret) {
    warnings.push(
      "JWT_SECRET and ADMIN_JWT_SECRET must not be identical; use independent random values."
    );
  }

  return warnings;
};

const warnJwtSecretStrength = () => {
  for (const message of collectJwtSecretWarnings()) {
    console.warn(`[jwt] Warning: ${message}`);
  }
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
  collectJwtSecretWarnings,
  warnJwtSecretStrength,
  getAdminJwtSecret,
};