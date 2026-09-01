const ContactMessage = require("../models/ContactMessage");

// @route  POST /api/contact  (public - koi bhi bhej sakta hai)
const submitMessage = async (req, res) => {
  try {
    const { name, email, phone, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ message: "Name, email and message are required" });
    }
    const newMessage = await ContactMessage.create({ name, email, phone, message });
    res.status(201).json({ message: "Message sent successfully! We'll get back to you soon.", data: newMessage });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @route  GET /api/contact  (admin only)
const getAllMessages = async (req, res) => {
  try {
    const messages = await ContactMessage.find().sort({ createdAt: -1 });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { submitMessage, getAllMessages };