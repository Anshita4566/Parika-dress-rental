require("dotenv").config();


const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const { notFound, errorHandler } = require("./middleware/errorHandler");

// Routes import
const authRoutes = require("./routes/authRoutes");
const productRoutes = require("./routes/productRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const paymentRoutes = require("./routes/paymentRoutes");

const app = express();

// DB se connect karo
connectDB();

// Middleware
app.use(cors()); // frontend (different port) se requests allow karne ke liye
app.use(express.json()); // JSON body parse karne ke liye (req.body use karne ke liye zaroori)

// Test route
app.get("/", (req, res) => {
  res.send("🎉 Dress Rental API is running...");
});

// Actual API routes
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/payments", paymentRoutes);

// Error handling (hamesha routes ke BAAD likhna hota hai)
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
