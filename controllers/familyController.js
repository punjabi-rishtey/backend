const Family = require("../models/Family");
const {
  upsertRelatedProfileDoc,
} = require("../services/relatedProfileDocs");

const addFamilyDetails = async (req, res) => {
  try {
    const family = new Family({ user_id: req.user.id, ...req.body });
    await family.save();
    res.status(201).json(family);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getFamilyDetails = async (req, res) => {
  try {
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
