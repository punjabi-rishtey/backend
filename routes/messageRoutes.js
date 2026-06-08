const express = require("express");
const router = express.Router();
const adminAuth = require("../middleware/adminAuthMiddleware");
const {
  createMessage,
  getMessages,
  deleteMessage,
  getAllMessages,
} = require("../controllers/messageController");

// Routes
router.post("/", adminAuth, createMessage); // Create a new message
router.get("/", getMessages); // Get all non-expired messages
router.delete("/:id", adminAuth, deleteMessage); // Delete a message by ID
router.get("/history", adminAuth, getAllMessages); // Get all messages including expired ones for history

module.exports = router;
