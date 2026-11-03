const Astrology = require("../models/Astrology");
const {
  upsertRelatedProfileDoc,
} = require("../services/relatedProfileDocs");
const {
  ownedProfileBody,
  rejectUnlessProfileOwner,
} = require("../utils/profileOwner");

const addAstrologyDetails = async (req, res) => {
  try {
    const astrology = new Astrology({
      ...ownedProfileBody(req),
      user: req.user.id,
    });
    await astrology.save();
    res.status(201).json(astrology);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getAstrologyDetails = async (req, res) => {
  try {
    if (rejectUnlessProfileOwner(req, res, req.params.userId)) return;

    const astrology = await Astrology.findOne({ user: req.params.userId });
    if (!astrology) {
      return res.status(404).json({ message: "Astrology details not found" });
    }
    res.json(astrology);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateAstrologyDetails = async (req, res) => {
  try {
    const userId = req.params.userId || req.params.id;
    if (rejectUnlessProfileOwner(req, res, userId)) return;

    const updatedAstrology = await upsertRelatedProfileDoc({
      kind: "astrology",
      userId,
      body: req.body,
    });

    res.json({
      message: "Astrology details updated successfully",
      astrology: updatedAstrology,
    });
  } catch (error) {
    console.error("Error updating astrology details:", error);
    const status = error.statusCode || 500;
    res.status(status).json({
      message: status === 404 ? error.message : undefined,
      error: error.message,
    });
  }
};

module.exports = {
  addAstrologyDetails,
  getAstrologyDetails,
  updateAstrologyDetails,
};
