const Message = require("../models/Message.js");

// Create a new message
const createMessage = async (req, res) => {
  try {
    const { message, expiresAt } = req.body;
    if (!message || !expiresAt) {
      return res
        .status(400)
        .json({ error: "Message and expiration date are required" });
    }
    const newMessage = new Message({ message, expiresAt });
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
    const messages = await Message.find({ expiresAt: { $gte: new Date() } });
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
    const messages = await Message.find().sort({ expiresAt: -1 }); // Sort by expiration date, newest first
    res.status(200).json(messages);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

module.exports = { createMessage, getMessages, deleteMessage, getAllMessages };
