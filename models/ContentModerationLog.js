const mongoose = require("mongoose");

const contentModerationLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    field: { type: String, required: true },
    verdict: {
      type: String,
      enum: ["allow", "block", "flag", "shadow", "degraded"],
      required: true,
      index: true,
    },
    ruleIds: [{ type: String }],
    reasonLabel: { type: String, default: "" },
    message: { type: String, default: "" },
    snippet: { type: String, default: "" },
    modelScores: { type: mongoose.Schema.Types.Mixed, default: null },
    source: {
      type: String,
      enum: ["member", "admin", "system"],
      default: "member",
    },
  },
  { timestamps: true }
);

// Keep logs for 90 days (ops without flooding disk)
contentModerationLogSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 90 * 24 * 60 * 60 }
);

module.exports = mongoose.model(
  "ContentModerationLog",
  contentModerationLogSchema
);
