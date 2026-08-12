const User = require("../models/User");
const { evaluateProfileCompletion } = require("../services/profileCompletion");

const checkProfileCompletion = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id)
      .populate("family")
      .populate("education")
      .populate("profession")
      .populate("astrology");

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const result = evaluateProfileCompletion(user);

    if (!result.readyForMatches) {
      return res.status(403).json({
        error: result.message,
        readyForMatches: false,
        missing: result.missing,
        completionPercentage: result.completionPercentage,
      });
    }

    next();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
};

module.exports = checkProfileCompletion;
