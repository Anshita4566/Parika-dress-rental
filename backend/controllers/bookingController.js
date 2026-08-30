const mongoose = require("mongoose");
const Booking = require("../models/Booking");
const Product = require("../models/Product");
const calculateRentalPrice = require("../utils/calculatePrice");

/*
  ============================================
  YE HAI PROJECT KA SABSE IMPORTANT LOGIC 🔥
  ============================================
  Do date ranges "overlap" (takrate) hain agar:
      existingBooking.startDate <= newBooking.endDate
      AND
      existingBooking.endDate  >= newBooking.startDate

  Example samjho:
  Existing booking: 5 Aug - 10 Aug
  Naya request:      8 Aug - 12 Aug
  -> 5 <= 12 (true) AND 10 >= 8 (true) => OVERLAP hai, conflict hai!

  Existing booking: 5 Aug - 10 Aug
  Naya request:     11 Aug - 15 Aug
  -> 5 <= 15 (true) AND 10 >= 11 (false) => OVERLAP NAHI, safe hai!
*/

// Helper function: kitne overlapping bookings already exist is product ke liye
// "session" param optional hai - transaction ke andar chalane ke liye pass karte hain
const CLEANING_BUFFER_DAYS = 3;

const countOverlappingBookings = async (productId, startDate, endDate, excludeBookingId = null, session = null) => {
  // Buffer add karte hain dono directions mein, taaki return ke baad
  // dry-clean/prepare karne ka time mile agli booking se pehle
  const bufferedRequestStart = new Date(startDate);
  bufferedRequestStart.setDate(bufferedRequestStart.getDate() - CLEANING_BUFFER_DAYS);

  const bufferedRequestEnd = new Date(endDate);
  bufferedRequestEnd.setDate(bufferedRequestEnd.getDate() + CLEANING_BUFFER_DAYS);

  const query = {
    product: productId,
    status: { $in: ["pending", "confirmed"] },
    startDate: { $lte: bufferedRequestEnd },
    endDate: { $gte: bufferedRequestStart },
  };

  if (excludeBookingId) {
    query._id = { $ne: excludeBookingId };
  }

  const q = Booking.countDocuments(query);
  if (session) q.session(session);
  return await q;
};

// @route  POST /api/bookings/check-availability
// Frontend isse call karega jab user calendar me date select kare (booking se PEHLE)
const checkAvailability = async (req, res) => {
  try {
    const { productId, startDate, endDate } = req.body;

    if (!productId || !startDate || !endDate) {
      return res.status(400).json({ message: "productId, startDate, endDate required" });
    }

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

    const overlapCount = await countOverlappingBookings(productId, start, end);
    const isAvailable = overlapCount < product.totalQuantity;

    res.json({
      isAvailable,
      unitsBookedInRange: overlapCount,
      totalUnits: product.totalQuantity,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/*
  ============================================
  RACE CONDITION FIX - MongoDB Transaction 🔒
  ============================================
  Problem: agar 2 users EXACT same millisecond pe request bhejein, dono ka
  "availability check" pass ho sakta hai (dono ko available dikhega) isse
  PEHLE ki koi bhi apni booking DB me save kare. Isse "double booking" ho
  jaati hai.

  Fix: hum "check overlap + create booking" dono steps ko ek hi ATOMIC
  transaction me daal dete hain. MongoDB transaction ka matlab hai:
  - Ya to dono steps SAATH me successfully complete honge
  - Ya kuch bhi galat hua to sab kuch ROLLBACK ho jayega, jaise hua hi nahi

  Isse dusra parallel request jab tak pehla transaction commit nahi hota,
  wahi overlapping data nahi dekh sakta - so dono ek doosre ko "block" kar
  dete hain properly (isse databases me "isolation" kehte hain).

  NOTE: Transactions sirf MongoDB REPLICA SET pe kaam karte hain.
  MongoDB Atlas (free tier bhi) by default replica set hoti hai, so
  ye Atlas pe seedhe kaam karega. Agar local standalone mongod use kar
  rahe ho to transactions fail honge - Atlas use karna isiliye recommend hai.
*/
// @route  POST /api/bookings   (logged-in user only)
const createBooking = async (req, res) => {
  const { productId, startDate, endDate, deliveryAddress  } = req.body;
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

  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    // session pass karke product fetch karo - isse ye read bhi transaction ka hissa ban jaata hai
    const product = await Product.findById(productId).session(session);
    if (!product) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: "Dress not found" });
    }

    // Overlap check - transaction ke andar, isolated read
    const overlapCount = await countOverlappingBookings(productId, start, end, null, session);
    if (overlapCount >= product.totalQuantity) {
      // Conflict mila - transaction ko cancel (rollback) karo
      await session.abortTransaction();
      session.endSession();
      return res.status(409).json({
        message: "Sorry! This dress is already booked for the selected dates. Please choose different dates.",
      });
    }

    // const totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    // const totalPrice = totalDays * product.rentPricePerDay + product.securityDeposit;
    const totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    const { totalPrice } = calculateRentalPrice(totalDays, product.rentPricePerDay, product.securityDeposit);

    // Booking create bhi isi transaction session ke andar
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
        },
      ],
      { session }
    );

    // Sab kuch sahi raha - ab transaction ko PERMANENT (commit) kar do
    await session.commitTransaction();
    session.endSession();

    res.status(201).json(bookingArr[0]);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ message: error.message });
  }
};

// @route  GET /api/bookings/my   (logged-in user apni bookings dekhne ke liye)
const getMyBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.user._id })
      .populate("product", "name imageUrl rentPricePerDay") // product ki details bhi laao
      .sort({ createdAt: -1 });
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @route  GET /api/bookings   (admin - sab bookings dekhne ke liye)
const getAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate("user", "name email")
      .populate("product", "name")
      .sort({ createdAt: -1 });
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @route  PUT /api/bookings/:id/cancel
const cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    // user sirf apni hi booking cancel kar sake (admin kisi ki bhi kar sake)
    if (booking.user.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized to cancel this booking" });
    }

    booking.status = "cancelled";
    await booking.save();
    res.json({ message: "Booking cancelled successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/*
  ============================================
  ADMIN ANALYTICS DASHBOARD
  ============================================
  MongoDB "aggregation pipeline" use kar rahe hain - ye SQL ke GROUP BY,
  SUM, JOIN jaisa hi hai but MongoDB ke style me, multiple stages me data
  ko transform karte hue.
*/
// @route  GET /api/bookings/analytics   (admin only)
const getAnalytics = async (req, res) => {
  try {
    // 1) Total revenue + total bookings (cancelled ko exclude karke)
    const revenueResult = await Booking.aggregate([
      { $match: { status: { $ne: "cancelled" } } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$totalPrice" },
          totalBookings: { $sum: 1 },
        },
      },
    ]);

    // 2) Status ke hisaab se count (confirmed / cancelled / returned / pending)
    const statusCounts = await Booking.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    // 3) Sabse zyada rent hone wali top 5 dresses
    const topProducts = await Booking.aggregate([
      { $match: { status: { $ne: "cancelled" } } },
      { $group: { _id: "$product", bookingCount: { $sum: 1 }, revenue: { $sum: "$totalPrice" } } },
      { $sort: { bookingCount: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "products", // Mongoose collection names lowercase + plural ban jaate hain
          localField: "_id",
          foreignField: "_id",
          as: "productInfo",
        },
      },
      { $unwind: "$productInfo" },
      {
        $project: {
          _id: 0,
          name: "$productInfo.name",
          bookingCount: 1,
          revenue: 1,
        },
      },
    ]);

    // 4) Month-wise revenue (last 6 months trend ke liye)
    const monthlyRevenue = await Booking.aggregate([
      { $match: { status: { $ne: "cancelled" } } },
      {
        $group: {
          _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
          revenue: { $sum: "$totalPrice" },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
      { $limit: 6 },
    ]);

    res.json({
      totalRevenue: revenueResult[0]?.totalRevenue || 0,
      totalBookings: revenueResult[0]?.totalBookings || 0,
      statusCounts,
      topProducts,
      monthlyRevenue,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  checkAvailability,
  createBooking,
  getMyBookings,
  getAllBookings,
  cancelBooking,
  getAnalytics,
};
