const rateLimit = require("express-rate-limit");
const { ipKeyGenerator } = require("express-rate-limit");

/**
 * Soft per-user limit on profile write routes that run content screening.
 * Keyed by authenticated user id when present; falls back to IP via helper.
 */
const moderatedWriteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req, res) => {
    const id = req.user?.id || req.user?._id;
    if (id) return `modwrite:user:${id}`;
    return `modwrite:ip:${ipKeyGenerator(req, res)}`;
  },
  message: {
    message: "Too many profile updates. Please wait a few minutes and try again.",
    code: "rate_limited",
  },
});

const authAttemptLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req, res) => `auth:ip:${ipKeyGenerator(req, res)}`,
  message: {
    message: "Too many attempts. Please wait a few minutes and try again.",
  },
});

module.exports = {
  moderatedWriteLimiter,
  authAttemptLimiter,
};
