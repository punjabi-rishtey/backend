// ✅ Membership Routes
const express = require("express");
const router = express.Router();
const { getAllMemberships, addMembership, editMembership, deleteMembership } = require("../controllers/membershipController");
const adminAuth = require("../middleware/adminAuthMiddleware");

router.get("/all", getAllMemberships);
router.post("/add", adminAuth, addMembership);
router.put("/edit/:id", adminAuth, editMembership);
router.delete("/delete/:id", adminAuth, deleteMembership);

module.exports = router;
