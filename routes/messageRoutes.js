const express = require("express");
const router = express.Router();
const {
  createMessage,
  getMessages,
  deleteMessage,
  getAllMessages,
} = require("../controllers/messageController");

// Routes
router.post("/", createMessage); // Create a new message
router.get("/", getMessages); // Get all non-expired messages
router.delete("/:id", deleteMessage); // Delete a message by ID
router.get("/history", getAllMessages); // Get all messages including expired ones for history

module.exports = router;
