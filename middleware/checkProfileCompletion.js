const User = require("../models/User");

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

    const completion = user.calculateProfileCompletion();

    if (completion < 70) {
      return res.status(403).json({
        error: "Profile must be at least 70% complete to access this feature."
      });
    }

    next();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
};

module.exports = checkProfileCompletion;
