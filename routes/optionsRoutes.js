const express = require("express");
const {
  getPartnerPreferenceOptions,
} = require("../controllers/optionsController");

const router = express.Router();

router.get("/preferences", getPartnerPreferenceOptions);

module.exports = router;