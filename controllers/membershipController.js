// ✅ Membership Controller
const Membership = require("../models/Membership");
const {
  OFFICIAL_ANNUAL_MEMBERSHIP_DURATION_MONTHS,
  normalizeAnnualMembershipDurationMonths,
  normalizeAnnualMembershipPrice,
  parseIsLifetimeFlag,
} = require("../services/membershipPlanPolicy");

const MAX_MEMBERSHIP_DESCRIPTION_LENGTH = 200;

const normalizeMembershipDescription = (raw) => {
  if (raw === undefined || raw === null) {
    return "";
  }
  const description = String(raw).trim();
  if (description.length > MAX_MEMBERSHIP_DESCRIPTION_LENGTH) {
    throw new Error(
      `Plan description must be at most ${MAX_MEMBERSHIP_DESCRIPTION_LENGTH} characters.`
    );
  }
  return description;
};

const normalizeMembershipInput = (body) => {
  const name = String(body.name || "").trim();
  const isLifetime = parseIsLifetimeFlag(body.isLifetime);
  const price = isLifetime
    ? Number(body.price)
    : normalizeAnnualMembershipPrice(body.price);
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

  let duration;
  if (isLifetime) {
    const rawDuration = body.duration;
    if (rawDuration === undefined || rawDuration === null || rawDuration === "") {
      duration = OFFICIAL_ANNUAL_MEMBERSHIP_DURATION_MONTHS;
    } else {
      const numericDuration = Number(rawDuration);
      if (!Number.isInteger(numericDuration) || numericDuration <= 0) {
        throw new Error(
          "When provided, a lifetime plan duration must be a positive month count used only for schema storage; access is controlled by isLifetime."
        );
      }
      duration = numericDuration;
    }
  } else {
    duration = normalizeAnnualMembershipDurationMonths(body.duration);
    if (!Number.isInteger(duration) || duration <= 0) {
      throw new Error("Plan duration must be a whole number of months.");
    }
  }

  const description = normalizeMembershipDescription(body.description);

  return {
    name,
    price,
    duration,
    premiumProfilesView,
    isLifetime,
    description,
  };
};

const getAllMemberships = async (req, res) => {
  try {
    const memberships = await Membership.find().sort({ price: 1 });
    const formattedMemberships = memberships.map((membership) => ({
      _id: membership._id, // Ensure _id is included
      name: membership.name,
      price: membership.isLifetime
        ? Number(membership.price)
        : normalizeAnnualMembershipPrice(membership.price),
      currency: "₹",
      duration: membership.isLifetime
        ? membership.duration
        : normalizeAnnualMembershipDurationMonths(membership.duration),
      isLifetime: Boolean(membership.isLifetime),
      description:
        membership.description === undefined || membership.description === null
          ? ""
          : String(membership.description),
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