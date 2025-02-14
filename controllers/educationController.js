const Education = require("../models/Education");

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
    const education = await Education.findOne({ user_id: req.params.userId });
    if (!education) return res.status(404).json({ message: "Education details not found" });
    res.json(education);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateEducationDetails = async (req, res) => {
  try {
    const userId = req.params.userId;

    // Find and update the education details
    const updatedEducation = await Education.findOneAndUpdate({ user_id: userId }, req.body, {
      new: true,
      runValidators: true
    });

    if (!updatedEducation) return res.status(404).json({ message: "Education details not found" });

    res.json({ message: "Education details updated successfully", education: updatedEducation });
  } catch (error) {
    console.error("Error updating education details:", error);
    res.status(500).json({ error: error.message });
  }
};


module.exports = { addEducationDetails, getEducationDetails, updateEducationDetails};
