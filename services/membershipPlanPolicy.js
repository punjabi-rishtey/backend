const OFFICIAL_ANNUAL_MEMBERSHIP_PRICE = 2000;
const OFFICIAL_ANNUAL_MEMBERSHIP_DURATION_MONTHS = 12;
const LEGACY_ANNUAL_DURATION_DAYS = 365;
const LIFETIME_PLAN_NAME = "Lifetime";
const LIFETIME_PLAN_PRICE = 5000;

const LIFETIME_DOWNGRADE_MESSAGE =
  "This member already has lifetime membership. Gold and Hallmark cannot replace lifetime access.";

const parseIsLifetimeFlag = (value) =>
  value === true || value === "true" || value === 1 || value === "1";

const isLifetimeMembershipRecord = (record) => {
  if (!record) {
    return false;
  }

  if (parseIsLifetimeFlag(record.isLifetime)) {
    return true;
  }

  return (
    String(record.name || record.planName || "")
      .trim()
      .toLowerCase() === LIFETIME_PLAN_NAME.toLowerCase()
  );
};

const normalizeAnnualMembershipPrice = (price) => {
  const numericPrice = Number(price);

  if (!Number.isFinite(numericPrice) || numericPrice < 0) {
    return OFFICIAL_ANNUAL_MEMBERSHIP_PRICE;
  }

  return numericPrice;
};

const normalizeAnnualMembershipDurationMonths = (duration) => {
  const numericDuration = Number(duration);

  if (numericDuration === LEGACY_ANNUAL_DURATION_DAYS) {
    return OFFICIAL_ANNUAL_MEMBERSHIP_DURATION_MONTHS;
  }

  return numericDuration;
};

const addCalendarMonths = (startDate, months) => {
  const start = new Date(startDate);
  const expiresAt = new Date(start);
  const startDay = start.getDate();
  expiresAt.setMonth(start.getMonth() + Number(months));

  if (expiresAt.getDate() !== startDay) {
    expiresAt.setDate(0);
  }

  return expiresAt;
};

module.exports = {
  OFFICIAL_ANNUAL_MEMBERSHIP_DURATION_MONTHS,
  OFFICIAL_ANNUAL_MEMBERSHIP_PRICE,
  LIFETIME_PLAN_NAME,
  LIFETIME_PLAN_PRICE,
  LIFETIME_DOWNGRADE_MESSAGE,
  addCalendarMonths,
  isLifetimeMembershipRecord,
  normalizeAnnualMembershipDurationMonths,
  normalizeAnnualMembershipPrice,
  parseIsLifetimeFlag,
};
