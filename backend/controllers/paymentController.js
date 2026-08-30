const Razorpay = require("razorpay");
const crypto = require("crypto");
const mongoose = require("mongoose");
const Product = require("../models/Product");
const Booking = require("../models/Booking");
const calculateRentalPrice = require("../utils/calculatePrice");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

/*
  ============================================
  STEP 1: Order create karo (payment se PEHLE)
  ============================================
  Frontend jab "Pay" dabata hai, sabse pehle ye call hoti hai.
  Hum Razorpay ko batate hain "itne paise ka order banao", Razorpay
  hume ek order_id deta hai jo hum frontend ko wapas bhejte hain.
  Abhi tak koi booking database mein NAHI bani hai.
*/
const createOrder = async (req, res) => {
  try {
    const { productId, startDate, endDate } = req.body;
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start >= end) {
      return res.status(400).json({ message: "End date must be after start date" });
    }
    const today = new Date();
  today.setHours(0, 0, 0, 0);
  const minAllowedDate = new Date(today);
  minAllowedDate.setDate(minAllowedDate.getDate() + 10);

  if (start < minAllowedDate) {
    return res.status(400).json({
      message: "Bookings must be made at least 10 days in advance. Please choose a pickup date on or after " +
        minAllowedDate.toLocaleDateString("en-IN"),
    });
  }

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: "Dress not found" });

    // const totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    // const totalAmount = totalDays * product.rentPricePerDay + product.securityDeposit;
    const totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    const { totalPrice: totalAmount } = calculateRentalPrice(totalDays, product.rentPricePerDay, product.securityDeposit);

    // Razorpay paise ko "paise" (smallest unit) mein leta hai, isliye 100 se multiply
    const order = await razorpay.orders.create({
      amount: totalAmount * 100,
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    });

    res.json({
      orderId: order.id,
      amount: totalAmount,
      currency: "INR",
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/*
  ============================================
  STEP 2: Payment verify karo (payment ke BAAD)
  ============================================
  Razorpay popup mein payment successful hone ke baad, frontend
  humein 3 cheezein bhejta hai: order_id, payment_id, aur signature.
  Hum signature ko apni secret key se dobara banate hain aur match
  karte hain - isse confirm hota hai payment genuine hai, fake nahi.

  Sirf tabhi jab signature match ho, hum booking create karte hain
  (wahi transaction-based conflict-proof logic jo already thi).
*/
const verifyPayment = async (req, res) => {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    productId,
    startDate,
    endDate,
    deliveryAddress,
  } = req.body;

  // Signature verify karo
  const body = razorpay_order_id + "|" + razorpay_payment_id;
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest("hex");

  if (expectedSignature !== razorpay_signature) {
    return res.status(400).json({ message: "Payment verification failed. Signature mismatch." });
  }

  // Signature sahi hai - ab wahi conflict-proof transaction booking banao
  const start = new Date(startDate);
  const end = new Date(endDate);
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const product = await Product.findById(productId).session(session);
    if (!product) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: "Dress not found" });
    }

    const CLEANING_BUFFER_DAYS = 3;
    const bufferedStart = new Date(start);
    bufferedStart.setDate(bufferedStart.getDate() - CLEANING_BUFFER_DAYS);
    const bufferedEnd = new Date(end);
    bufferedEnd.setDate(bufferedEnd.getDate() + CLEANING_BUFFER_DAYS);

    const overlapCount = await Booking.countDocuments({
      product: productId,
      status: { $in: ["pending", "confirmed"] },
      startDate: { $lte: bufferedEnd },
      endDate: { $gte: bufferedStart },
    }).session(session);

    if (overlapCount >= product.totalQuantity) {
      await session.abortTransaction();
      session.endSession();
      return res.status(409).json({
        message: "Sorry! This dress got booked by someone else while you were paying. Refund will be initiated.",
      });
    }

    // const totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    // const totalPrice = totalDays * product.rentPricePerDay + product.securityDeposit;
    const totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    const { totalPrice } = calculateRentalPrice(totalDays, product.rentPricePerDay, product.securityDeposit);

    const bookingArr = await Booking.create(
      [
        {
          user: req.user._id,
          product: productId,
          startDate: start,
          endDate: end,
          deliveryAddress,
          totalDays,
          totalPrice,
          status: "confirmed",
          razorpayOrderId: razorpay_order_id,
          razorpayPaymentId: razorpay_payment_id,
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({ message: "Payment verified, booking confirmed!", booking: bookingArr[0] });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ message: error.message });
  }
};
/*
  ============================================
  DEPOSIT REFUND
  ============================================
  Jab dress return ho jaye, admin ye function trigger karta hai.
  Poora payment (rent + deposit) already collect ho chuka hai; yahan
  sirf DEPOSIT wale hisse ka "partial refund" Razorpay ko bolte hain.
  Razorpay khud customer ke original payment method mein paisa wapas
  bhej deta hai (kuch din lag sakte hain real life mein).
*/
const refundDeposit = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate("product");
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    if (!booking.razorpayPaymentId) {
      return res.status(400).json({ message: "No payment found for this booking" });
    }

    if (booking.refundStatus === "processed") {
      return res.status(400).json({ message: "Deposit already refunded for this booking" });
    }

    const depositAmount = booking.product.securityDeposit;

    const refund = await razorpay.payments.refund(booking.razorpayPaymentId, {
      amount: depositAmount * 100, // paise mein
      speed: "normal",
    });

    booking.status = "returned";
    booking.refundId = refund.id;
    booking.refundStatus = "processed";
    await booking.save();

    res.json({
      message: `Deposit of ₹${depositAmount} refunded successfully!`,
      refundId: refund.id,
      booking,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};



module.exports = { createOrder, verifyPayment,  refundDeposit  };