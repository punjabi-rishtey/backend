const Astrology = require("../models/Astrology");

const addAstrologyDetails = async (req, res) => {
  try {
    const astrology = new Astrology({ user_id: req.user.id, ...req.body });
    await astrology.save();
    res.status(201).json(astrology);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getAstrologyDetails = async (req, res) => {
  try {
    const astrology = await Astrology.findOne({ user: req.params.userId });
    if (!astrology) return res.status(404).json({ message: "Astrology details not found" });
    res.json(astrology);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


// const updateAstrologyDetails = async (req, res) => {
//   try {
//     const userId = req.params.userId;

//     // Find and update the astrology details
//     const updatedAstrology = await Astrology.findOneAndUpdate({ user: userId }, req.body, {
//       new: true,
//       runValidators: true
//     });

//     if (!updatedAstrology) return res.status(404).json({ message: "Astrology details not found" });

//     res.json({ message: "Astrology details updated successfully", astrology: updatedAstrology });
//   } catch (error) {
//     console.error("Error updating astrology details:", error);
//     res.status(500).json({ error: error.message });
//   }
// };



const updateAstrologyDetails = async (req, res) => {
  try {
    // Accept either req.params.userId or req.params.id
    const userId = req.params.userId || req.params.id;
    
    // Find and update the astrology details
    const updatedAstrology = await Astrology.findOneAndUpdate(
      { user: userId },
      req.body,
      {
        new: true,
        runValidators: true,
        // Ensure upsert is false so we don't create a new document if not found.
        // upsert: false
      }
    );

    if (!updatedAstrology)
      return res.status(404).json({ message: "Astrology details not found" });

    res.json({
      message: "Astrology details updated successfully",
      astrology: updatedAstrology,
    });
  } catch (error) {
    console.error("Error updating astrology details:", error);
    res.status(500).json({ error: error.message });
  }
};


module.exports = { addAstrologyDetails, getAstrologyDetails , updateAstrologyDetails};
