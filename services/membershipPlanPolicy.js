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
  addCalendarMonths,
  normalizeAnnualMembershipDurationMonths,
  normalizeAnnualMembershipPrice,
};
