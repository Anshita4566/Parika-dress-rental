const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    deliveryAddress: {
      type: String,
      required: true,
    },
    totalDays: {
      type: Number,
      required: true,
    },
    totalPrice: {
      type: Number,
      required: true,
    },
    razorpayOrderId: {
      type: String,
    },
    razorpayPaymentId: {
      type: String,
    },
     refundId: {
      type: String,
    },
    refundStatus: {
      type: String,
      enum: ["not_applicable", "pending", "processed"],
      default: "not_applicable",
    },
    status: {
      // booking ki current state
      type: String,
      enum: ["pending", "confirmed", "cancelled", "returned"],
      default: "confirmed",
    },
  },
  { timestamps: true }
);

// IMPORTANT INDEX for fast overlap-checking queries
bookingSchema.index({ product: 1, startDate: 1, endDate: 1 });

module.exports = mongoose.model("Booking", bookingSchema);
