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
    const family = await Family.findOne({ user: req.params.userId }); // ✅ Use `user`, not `user_id`
    
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






// const Family = require("../models/Family");

// // ✅ Add Family Details for a Specific User
// const addFamilyDetails = async (req, res) => {
//   try {
//     const userId = req.user?.id || req.body.user;  // ✅ Ensure user_id is passed
//     if (!userId) return res.status(400).json({ message: "User ID is required" });

//     const existingFamily = await Family.findOne({ user: userId });
//     if (existingFamily) return res.status(400).json({ message: "Family details already exist for this user" });

//     const family = new Family({ user: userId, ...req.body });
//     await family.save();
//     res.status(201).json({ message: "Family details added successfully", family });
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// };

// // ✅ Get Family Details of a Specific User
// const getFamilyDetails = async (req, res) => {
//   try {
//     const family = await Family.findOne({ user: req.params.userId }).populate("user", "name email"); // ✅ Fetch user details
//     if (!family) return res.status(404).json({ message: "Family details not found" });
//     res.json(family);
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// };

// // ✅ Update Family Details of a Specific User
// const updateFamilyDetails = async (req, res) => {
//   try {
//     const userId = req.params.userId;

//     const updatedFamily = await Family.findOneAndUpdate(
//       { user: userId }, 
//       req.body, 
//       { new: true, runValidators: true }
//     );

//     if (!updatedFamily) return res.status(404).json({ message: "Family details not found" });

//     res.json({ message: "Family details updated successfully", family: updatedFamily });
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// };

// module.exports = { addFamilyDetails, getFamilyDetails, updateFamilyDetails };
