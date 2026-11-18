const Subscription = require("../models/Subscription");
const User = require("../models/User");
const {
  isLifetimeMembershipRecord,
  LIFETIME_DOWNGRADE_MESSAGE,
} = require("./membershipPlanPolicy");

const getLatestApprovedSubscription = async (userId) =>
  Subscription.findOne({
    user: userId,
    reviewStatus: "approved",
  }).sort({ createdAt: -1 });

const memberHasLifetimeAccess = async (userId) => {
  const user = await User.findById(userId).select("status metadata.exp_date");
  if (!user) {
    return false;
  }

  const latestApproved = await getLatestApprovedSubscription(userId);
  return userHasLifetimeAccess(user, latestApproved);
};

const userHasLifetimeAccess = (user, latestApprovedSubscription) => {
  if (!user || user.status !== "Approved") {
    return false;
  }

  if (user.metadata?.exp_date != null) {
    return false;
  }

  if (
    !latestApprovedSubscription ||
    latestApprovedSubscription.reviewStatus !== "approved"
  ) {
    return false;
  }

  return isLifetimeMembershipRecord(latestApprovedSubscription);
};

const rejectLifetimeDowngrade = (res) =>
  res.status(400).json({
    error: LIFETIME_DOWNGRADE_MESSAGE,
    message: LIFETIME_DOWNGRADE_MESSAGE,
  });

const buildOwnProfileMembershipSummary = (user, latestApprovedSubscription) => {
  const hasLifetimeAccess = userHasLifetimeAccess(user, latestApprovedSubscription);

  return {
    hasLifetimeAccess,
    isLifetime: hasLifetimeAccess,
    planName: hasLifetimeAccess ? latestApprovedSubscription?.planName || null : null,
    planPrice:
      hasLifetimeAccess && latestApprovedSubscription?.planPrice != null
        ? latestApprovedSubscription.planPrice
        : null,
    exp_date: user?.metadata?.exp_date ?? null,
  };
};

module.exports = {
  buildOwnProfileMembershipSummary,
  getLatestApprovedSubscription,
  memberHasLifetimeAccess,
  userHasLifetimeAccess,
  rejectLifetimeDowngrade,
};