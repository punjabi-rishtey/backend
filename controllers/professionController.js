const Profession = require("../models/Profession");
const User = require("../models/User");
const {
  upsertRelatedProfileDoc,
} = require("../services/relatedProfileDocs");
const {
  screenProfileContent,
} = require("../services/contentModeration");
const {
  ownedProfileBody,
  rejectUnlessProfileOwner,
} = require("../utils/profileOwner");

const addProfessionDetails = async (req, res) => {
  try {
    const profession = new Profession({
      ...ownedProfileBody(req),
      user: req.user.id,
    });
    await profession.save();
    res.status(201).json(profession);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getProfessionDetails = async (req, res) => {
  try {
    if (rejectUnlessProfileOwner(req, res, req.params.userId)) return;

    const profession = await Profession.findOne({ user: req.params.userId });
    if (!profession) {
      return res.status(404).json({ message: "Profession details not found" });
    }
    res.json(profession);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateProfessionDetails = async (req, res) => {
  try {
    const userId = req.params.userId || req.params.id;
    if (rejectUnlessProfileOwner(req, res, userId)) return;

    const owner = await User.findById(userId).select("status");
    if (!owner) {
      return res.status(404).json({ message: "User not found" });
    }

    const moderation = await screenProfileContent({
      userId,
      userStatus: owner.status,
      kind: "profession",
      body: req.body,
      bypass: Boolean(req.admin),
      source: req.admin ? "admin" : "member",
    });
    if (!moderation.allowed) {
      return res.status(422).json({
        code: moderation.code || "content_rejected",
        message: moderation.message || "Please revise and try again.",
        fields: moderation.fields || {},
      });
    }

    const updatedProfession = await upsertRelatedProfileDoc({
      kind: "profession",
      userId,
      body: req.body,
    });

    res.json({
      message: "Profession details updated successfully",
      profession: updatedProfession,
    });
  } catch (error) {
    console.error("Error updating profession details:", error);
    const status = error.statusCode || 500;
    res.status(status).json({
      message: status === 404 ? error.message : undefined,
      error: error.message,
    });
  }
};

module.exports = {
  addProfessionDetails,
  getProfessionDetails,
  updateProfessionDetails,
};
