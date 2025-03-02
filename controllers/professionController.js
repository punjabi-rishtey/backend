const Profession = require("../models/Profession");

const addProfessionDetails = async (req, res) => {
  try {
    const profession = new Profession({ user_id: req.user.id, ...req.body });
    await profession.save();
    res.status(201).json(profession);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getProfessionDetails = async (req, res) => {
  try {
    const profession = await Profession.findOne({ user: req.params.userId });
    if (!profession) return res.status(404).json({ message: "Profession details not found" });
    res.json(profession);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// const updateProfessionDetails = async (req, res) => {
//   try {
//     const userId = req.params.userId;

//     // Find and update the profession details
//     const updatedProfession = await Profession.findOneAndUpdate({ user_id: userId }, req.body, {
//       new: true,
//       runValidators: true
//     });

//     if (!updatedProfession) return res.status(404).json({ message: "Profession details not found" });

//     res.json({ message: "Profession details updated successfully", profession: updatedProfession });
//   } catch (error) {
//     console.error("Error updating profession details:", error);
//     res.status(500).json({ error: error.message });
//   }
// };


const updateProfessionDetails = async (req, res) => {
  try {
    const userId = req.params.userId;

    // Find and update the profession details
    const updatedProfession = await Profession.findOneAndUpdate({ user: userId }, req.body, {
      new: true,
      runValidators: true
    });

    if (!updatedProfession) return res.status(404).json({ message: "Profession details not found" });

    res.json({ message: "Profession details updated successfully", profession: updatedProfession });
  } catch (error) {
    console.error("Error updating profession details:", error);
    res.status(500).json({ error: error.message });
  }
};


module.exports = { addProfessionDetails, getProfessionDetails, updateProfessionDetails};
