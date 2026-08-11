const mongoose = require("mongoose");

const MAX_WEB_SESSIONS = 2;

const sessionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  sid: {
    type: String,
    required: true,
    unique: true,
  },
  clientType: {
    type: String,
    enum: ["web"],
    required: true,
    default: "web",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  lastSeenAt: {
    type: Date,
    default: Date.now,
  },
});

sessionSchema.index({ user: 1, clientType: 1, createdAt: 1 });

const Session = mongoose.model("Session", sessionSchema);

module.exports = Session;
module.exports.MAX_WEB_SESSIONS = MAX_WEB_SESSIONS;
module.exports.SESSION_REVOKED_MESSAGE =
  "Session expired or signed in elsewhere";
module.exports.SESSION_REVOKED_CODE = "SESSION_REVOKED";
module.exports.SESSION_LIMIT_MESSAGE =
  "This account is already signed in on 2 devices. Log out from another device to continue.";
module.exports.SESSION_LIMIT_CODE = "SESSION_LIMIT_REACHED";
