const rejectUnlessProfileOwner = (req, res, userId) => {
  if (req.admin) return false;

  const requesterId = String(req.user?.id || req.user?._id || "");
  if (requesterId && requesterId === String(userId || "")) return false;

  res.status(403).json({ message: "Not authorized" });
  return true;
};

const ownedProfileBody = (req) => {
  const details = { ...(req.body || {}) };
  delete details.user;
  delete details.user_id;
  delete details._id;
  return details;
};

module.exports = {
  ownedProfileBody,
  rejectUnlessProfileOwner,
};
