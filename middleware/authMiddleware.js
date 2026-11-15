const jwt = require("jsonwebtoken");
const Session = require("../models/Session");
const { memberVerifyOptions } = require("../config/jwt");
const {
  SESSION_REVOKED_MESSAGE,
  SESSION_REVOKED_CODE,
} = Session;

const protect = async (req, res, next) => {
  const token = req.header("Authorization");

  if (!token) return res.status(401).json({ message: "Not authorized" });

  try {
    const decoded = jwt.verify(
      token.replace("Bearer ", ""),
      process.env.JWT_SECRET,
      memberVerifyOptions
    );

    if (decoded.sid) {
      const session = await Session.findOne({
        sid: decoded.sid,
        user: decoded.id,
      });

      if (!session) {
        return res.status(401).json({
          message: SESSION_REVOKED_MESSAGE,
          code: SESSION_REVOKED_CODE,
        });
      }

      Session.updateOne(
        { _id: session._id },
        { lastSeenAt: new Date() }
      ).catch(() => {});
    }

    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid token" });
  }
};

module.exports = protect;
