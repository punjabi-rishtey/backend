const OFFICIAL_ANNUAL_MEMBERSHIP_PRICE = 2000;
const OFFICIAL_ANNUAL_MEMBERSHIP_DURATION_MONTHS = 12;
const LEGACY_ANNUAL_DURATION_DAYS = 365;

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

module.exports = {
  OFFICIAL_ANNUAL_MEMBERSHIP_DURATION_MONTHS,
  OFFICIAL_ANNUAL_MEMBERSHIP_PRICE,
  normalizeAnnualMembershipDurationMonths,
  normalizeAnnualMembershipPrice,
};
