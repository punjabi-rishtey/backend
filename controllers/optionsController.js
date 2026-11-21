const { listPartnerPreferenceOptions } = require("../services/partnerPreferenceOptions");

const getPartnerPreferenceOptions = (req, res) => {
  res.json({
    options: listPartnerPreferenceOptions(),
  });
};

module.exports = {
  getPartnerPreferenceOptions,
};