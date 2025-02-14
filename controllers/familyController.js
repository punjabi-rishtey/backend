const Family = require("../models/Family");

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
    const family = await Family.findOne({ user_id: req.params.userId });
    if (!family) return res.status(404).json({ message: "Family details not found" });
    res.json(family);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


const updateFamilyDetails = async (req, res) => {
  try {
    const userId = req.params.userId;

    // Find and update the family details
    const updatedFamily = await Family.findOneAndUpdate({ user_id: userId }, req.body, {
      new: true,
      runValidators: true
    });

    if (!updatedFamily) return res.status(404).json({ message: "Family details not found" });

    res.json({ message: "Family details updated successfully", family: updatedFamily });
  } catch (error) {
    console.error("Error updating family details:", error);
    res.status(500).json({ error: error.message });
  }
};


module.exports = { addFamilyDetails, getFamilyDetails, updateFamilyDetails };
