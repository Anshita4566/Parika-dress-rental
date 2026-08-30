// const express = require("express");
// const router = express.Router();
// const { createOrder, verifyPayment } = require("../controllers/paymentController");
// const { protect } = require("../middleware/auth");

// router.post("/create-order", protect, createOrder);
// router.post("/verify", protect, verifyPayment);

// module.exports = router;
const express = require("express");
const router = express.Router();
const { createOrder, verifyPayment, refundDeposit } = require("../controllers/paymentController");
const { protect, adminOnly } = require("../middleware/auth");

router.post("/create-order", protect, createOrder);
router.post("/verify", protect, verifyPayment);
router.put("/refund-deposit/:id", protect, adminOnly, refundDeposit);

module.exports = router;