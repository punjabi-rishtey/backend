// ✅ Membership Controller
const Membership = require("../models/Membership");

const getAllMemberships = async (req, res) => {
  try {
    const memberships = await Membership.find().sort({ price: 1 });
    const formattedMemberships = memberships.map((membership) => ({
      _id: membership._id, // Ensure _id is included
      name: membership.name,
      price: membership.price,
      currency: "₹",
      duration: membership.duration,
      mostPopular: membership.name === "Gold",
      features: [
        {
          feature: `${membership.premiumProfilesView} Premium Profiles view`,
          available: membership.premiumProfilesView > 0,
        },
        { feature: "Free user profile can view", available: true },
      ],
    }));
    res.status(200).json(formattedMemberships);
  } catch (error) {
    console.error("Error fetching memberships:", error);
    res.status(500).json({ error: "Server error!" });
  }
};

const addMembership = async (req, res) => {
  try {
    console.log("🔥 Incoming request body:", req.body); // Debugging Log

    const { name, price, premiumProfilesView, viewContactDetails, duration } =
      req.body;

    if (!name || price === undefined || duration === undefined) {
      console.error("❌ Missing required fields");
      return res.status(400).json({ error: "Missing required fields" });
    }

    const newMembership = new Membership({
      name,
      price,
      premiumProfilesView,
      viewContactDetails,
      duration,
    });

    await newMembership.save();

    console.log("✅ Membership added:", newMembership); // Debugging Log
    res.status(201).json({
      message: "Membership plan added successfully",
      membership: newMembership,
    });
  } catch (error) {
    console.error("❌ Error adding membership:", error);
    res.status(500).json({ error: "Server error!", details: error.message });
  }
};

const editMembership = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedMembership = await Membership.findByIdAndUpdate(id, req.body, {
      new: true,
    });
    if (!updatedMembership)
      return res.status(404).json({ error: "Membership plan not found!" });
    res.status(200).json({
      message: "Membership updated successfully",
      membership: updatedMembership,
    });
  } catch (error) {
    console.error("Error updating membership:", error);
    res.status(500).json({ error: "Server error!" });
  }
};

const deleteMembership = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedMembership = await Membership.findByIdAndDelete(id);

    if (!deletedMembership) {
      return res.status(404).json({ error: "Membership not found!" });
    }

    res.status(200).json({ message: "Membership deleted successfully!" });
  } catch (error) {
    console.error("Error deleting membership:", error);
    res.status(500).json({ error: "Server error!" });
  }
};

module.exports = {
  getAllMemberships,
  addMembership,
  editMembership,
  deleteMembership,
};
