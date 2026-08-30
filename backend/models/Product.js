const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Dress name is required"],
    },
    description: {
      type: String,
      required: true,
    },
    category: {
      type: String, // e.g. "Party Wear", "Wedding", "Ethnic", "Western"
      required: true,
    },
    size: {
      type: [String], // e.g. ["S","M","L","XL"]
      required: true,
    },
    color: {
      type: String,
      default: "",
    },
     gender: {
      type: String,
      enum: ["Male", "Female"],
      required: true,
    },
    imageUrl: {
      type: String,
      default: "https://via.placeholder.com/400x500?text=Dress+Image",
    },
    rentPricePerDay: {
      type: Number,
      required: true,
    },
    securityDeposit: {
      type: Number,
      default: 0,
    },
    totalQuantity: {
      // agar shop ke paas ek hi design ke 3 dresses hain to 3 rakho
      type: Number,
      default: 1,
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);
