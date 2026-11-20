const User = require("../models/User");
const {
  EXPIRED,
  NOT_APPROVED,
} = require("../constants/accessErrorCodes");

const requireApprovedMembershipAccess = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select(
      "status metadata.exp_date gender"
    );

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.status !== "Approved") {
      return res.status(403).json({
        error:
          "Your profile is not active yet. Please wait for approval to access this feature.",
        code: NOT_APPROVED,
      });
    }

    if (user.metadata?.exp_date && new Date() > user.metadata.exp_date) {
      return res.status(403).json({
        error:
          "Your subscription has expired. Please renew to access this feature.",
        code: EXPIRED,
      });
    }

    req.membershipUser = user;
    next();
  } catch (error) {
    console.error("Error validating membership access:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

module.exports = requireApprovedMembershipAccess;