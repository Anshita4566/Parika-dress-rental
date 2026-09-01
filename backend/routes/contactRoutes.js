const express = require("express");
const router = express.Router();
const { submitMessage, getAllMessages } = require("../controllers/contactController");
const { protect, adminOnly } = require("../middleware/auth");

router.post("/", submitMessage);
router.get("/", protect, adminOnly, getAllMessages);

module.exports = router;