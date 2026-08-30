const express = require("express");
const router = express.Router();
const {
  checkAvailability,
  createBooking,
  getMyBookings,
  getAllBookings,
  cancelBooking,
  getAnalytics,
} = require("../controllers/bookingController");
const { protect, adminOnly } = require("../middleware/auth");

router.post("/check-availability", checkAvailability); // public - date select karte hi check ho jaye
router.post("/", protect, createBooking); // login required
router.get("/my", protect, getMyBookings); // login required
router.get("/analytics", protect, adminOnly, getAnalytics); // admin only - must be BEFORE "/" route
router.get("/", protect, adminOnly, getAllBookings); // admin only
router.put("/:id/cancel", protect, cancelBooking); // login required

module.exports = router;
