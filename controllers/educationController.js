const Education = require("../models/Education");
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
    if (!education) return res.status(404).json({ message: "Education details not found" });
    res.json(education);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};




// const updateEducationDetails = async (req, res) => {
//   try {
//     const userId = req.params.userId;

//     // Find and update the education details
//     const updatedEducation = await Education.findOneAndUpdate({ user: userId }, req.body, {
//       new: true,
//       runValidators: true
//     });

//     if (!updatedEducation) return res.status(404).json({ message: "Education details not found" });

//     res.json({ message: "Education details updated successfully", education: updatedEducation });
//   } catch (error) {
//     console.error("Error updating education details:", error);
//     res.status(500).json({ error: error.message });
//   }
// };


const updateEducationDetails = async (req, res) => {
  try {
    const userId = req.params.userId || req.params.id;
    if (rejectUnlessProfileOwner(req, res, userId)) return;

    // Find and update the education details for the given user
    const updatedEducation = await Education.findOneAndUpdate(
      { user: userId },
      ownedProfileBody(req),
      {
        new: true,
        runValidators: true,
        upsert: true // Ensure that a new document is not created if none exists
      }
    );

    if (!updatedEducation) {
      return res.status(404).json({ message: "Education details not found" });
    }

    res.json({
      message: "Education details updated successfully",
      education: updatedEducation
    });
  } catch (error) {
    console.error("Error updating education details:", error);
    res.status(500).json({ error: error.message });
  }
};





module.exports = { addEducationDetails, getEducationDetails, updateEducationDetails};
