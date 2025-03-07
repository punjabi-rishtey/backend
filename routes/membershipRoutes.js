// ✅ Membership Routes
const express = require("express");
const router = express.Router();
const { getAllMemberships, addMembership, editMembership, deleteMembership } = require("../controllers/membershipController");

router.get("/all", getAllMemberships);
router.post("/add", addMembership);
router.put("/edit/:id", editMembership);
router.delete("/delete/:id", deleteMembership);

module.exports = router;