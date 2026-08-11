const Education = require("../models/Education");
const {
  upsertRelatedProfileDoc,
} = require("../services/relatedProfileDocs");

const addEducationDetails = async (req, res) => {
  try {
    const education = new Education({ user_id: req.user.id, ...req.body });
    await education.save();
    res.status(201).json(education);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getEducationDetails = async (req, res) => {
  try {
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
