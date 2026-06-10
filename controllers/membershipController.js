// ✅ Membership Controller
const Membership = require("../models/Membership");

const normalizeMembershipInput = (body) => {
  const name = String(body.name || "").trim();
  const price = Number(body.price);
  const duration = Number(body.duration);
  const premiumProfilesView =
    body.premiumProfilesView === undefined ||
    String(body.premiumProfilesView).trim() === ""
      ? "Unlimited"
      : String(body.premiumProfilesView).trim();

  if (!name) {
    throw new Error("Plan name is required.");
  }

  if (!Number.isFinite(price) || price < 0) {
    throw new Error("Plan price must be 0 or more.");
  }

  if (!Number.isInteger(duration) || duration <= 0) {
    throw new Error("Plan duration must be a whole number of months.");
  }

  return {
    name,
    price,
    duration,
    premiumProfilesView,
  };
};

const getAllMemberships = async (req, res) => {
  try {
    const memberships = await Membership.find().sort({ price: 1 });
    const formattedMemberships = memberships.map((membership) => ({
      _id: membership._id, // Ensure _id is included
      name: membership.name,
      price: membership.price,
      currency: "₹",
      duration: membership.duration,
      premiumProfilesView: membership.premiumProfilesView,
      mostPopular: membership.name === "Gold",
      features: [
        {
          feature: `${membership.premiumProfilesView} Premium Profiles view`,
          available: String(membership.premiumProfilesView) !== "0",
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
    const membershipData = normalizeMembershipInput(req.body);
    const existing = await Membership.findOne({ name: membershipData.name });
    if (existing) {
      return res.status(400).json({ error: "Membership plan name already exists." });
    }

    const newMembership = new Membership(membershipData);

    await newMembership.save();

    res.status(201).json({
      message: "Membership plan added successfully",
      membership: newMembership,
    });
  } catch (error) {
    console.error("❌ Error adding membership:", error);
    res.status(400).json({ error: error.message || "Unable to add membership plan." });
  }
};

const editMembership = async (req, res) => {
  try {
    const { id } = req.params;
    const membershipData = normalizeMembershipInput(req.body);
    const duplicate = await Membership.findOne({
      name: membershipData.name,
      _id: { $ne: id },
    });
    if (duplicate) {
      return res.status(400).json({ error: "Membership plan name already exists." });
    }

    const updatedMembership = await Membership.findByIdAndUpdate(id, membershipData, {
      new: true,
      runValidators: true,
    });
    if (!updatedMembership)
      return res.status(404).json({ error: "Membership plan not found!" });
    res.status(200).json({
      message: "Membership updated successfully",
      membership: updatedMembership,
    });
  } catch (error) {
    console.error("Error updating membership:", error);
    res.status(400).json({ error: error.message || "Unable to update membership plan." });
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
