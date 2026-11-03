const Family = require("../models/Family");
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

const addFamilyDetails = async (req, res) => {
  try {
    const family = new Family({ ...ownedProfileBody(req), user: req.user.id });
    await family.save();
    res.status(201).json(family);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getFamilyDetails = async (req, res) => {
  try {
    if (rejectUnlessProfileOwner(req, res, req.params.userId)) return;

    const family = await Family.findOne({ user: req.params.userId });

    if (!family) {
      return res.status(404).json({ message: "Family details not found" });
    }

    res.json(family);
  } catch (error) {
    console.error("Error fetching family details:", error);
    res.status(500).json({ error: error.message });
  }
};

const updateFamilyDetails = async (req, res) => {
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
      kind: "family",
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

    const updatedFamily = await upsertRelatedProfileDoc({
      kind: "family",
      userId,
      body: req.body,
    });

    res.json({
      message: "Family details updated successfully",
      family: updatedFamily,
    });
  } catch (error) {
    console.error("Error updating family details:", error);
    const status = error.statusCode || 500;
    res.status(status).json({
      message: status === 404 ? error.message : undefined,
      error: error.message,
    });
  }
};

module.exports = { addFamilyDetails, getFamilyDetails, updateFamilyDetails };
