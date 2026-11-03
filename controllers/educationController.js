const Education = require("../models/Education");
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

const addEducationDetails = async (req, res) => {
  try {
    const education = new Education({
      ...ownedProfileBody(req),
      user: req.user.id,
    });
    await education.save();
    res.status(201).json(education);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getEducationDetails = async (req, res) => {
  try {
    if (rejectUnlessProfileOwner(req, res, req.params.userId)) return;

    const education = await Education.findOne({ user: req.params.userId });
    if (!education) {
      return res.status(404).json({ message: "Education details not found" });
    }
    res.json(education);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateEducationDetails = async (req, res) => {
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
      kind: "education",
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

    const updatedEducation = await upsertRelatedProfileDoc({
      kind: "education",
      userId,
      body: req.body,
    });

    res.json({
      message: "Education details updated successfully",
      education: updatedEducation,
    });
  } catch (error) {
    console.error("Error updating education details:", error);
    const status = error.statusCode || 500;
    res.status(status).json({
      message: status === 404 ? error.message : undefined,
      error: error.message,
    });
  }
};

module.exports = {
  addEducationDetails,
  getEducationDetails,
  updateEducationDetails,
};
