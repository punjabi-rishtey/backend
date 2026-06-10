const Message = require("../models/Message.js");

// Create a new message
const createMessage = async (req, res) => {
  try {
    const safeMessage = String(req.body.message || "").trim();
    const expiresAt = new Date(req.body.expiresAt);

    if (!safeMessage || !req.body.expiresAt) {
      return res
        .status(400)
        .json({ error: "Message and expiration date are required" });
    }

    if (Number.isNaN(expiresAt.getTime())) {
      return res.status(400).json({ error: "Please provide a valid expiry date." });
    }

    if (expiresAt <= new Date()) {
      return res
        .status(400)
        .json({ error: "Expiry date must be in the future." });
    }

    const newMessage = new Message({ message: safeMessage, expiresAt });
    await newMessage.save();
    res.status(201).json(newMessage);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

// Get all messages
const getMessages = async (req, res) => {
  try {
    // Filter out expired messages
    const messages = await Message.find({ expiresAt: { $gte: new Date() } }).sort({
      expiresAt: 1,
      createdAt: -1,
    });
    res.status(200).json(messages);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

// Delete a message by ID
const deleteMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const message = await Message.findByIdAndDelete(id);
    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }
    res.status(200).json({ message: "Message deleted" });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

// Get all messages including expired ones for history
const getAllMessages = async (req, res) => {
  try {
    const messages = await Message.find().sort({ createdAt: -1, expiresAt: -1 });
    res.status(200).json(messages);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

module.exports = { createMessage, getMessages, deleteMessage, getAllMessages };
