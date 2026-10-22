const rateLimit = require("express-rate-limit");
const { ipKeyGenerator } = require("express-rate-limit");

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
  authAttemptLimiter,
};
