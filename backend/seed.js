// Ye script ek baar chalao taaki tumhare paas ek admin login ho aur kuch sample dresses ho
// Run karne ka tarika: node seed.js
require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./models/User");
const Product = require("./models/Product");

const seed = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB for seeding...");

  // Purana data clear karo (sirf pehli baar chalate waqt)
  await User.deleteMany({});
  await Product.deleteMany({});

  // Admin user banao
  await User.create({
    name: "Shop Admin",
    email: "admin@rento.com",
    password: "admin123", // login ke baad chahe to badal lena
    role: "admin",
  });

  // Sample dresses banao
  await Product.create([
    {
      name: "Emerald Silk Gown",
      description: "A flowing emerald silk gown, perfect for evening parties and receptions.",
      category: "Party Wear",
      size: ["S", "M", "L"],
      color: "Emerald Green",
      imageUrl: "https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=500",
      rentPricePerDay: 799,
      securityDeposit: 1500,
      totalQuantity: 2,
    },
    {
      name: "Royal Maroon Lehenga",
      description: "Heavily embroidered maroon lehenga, ideal for weddings and sangeet functions.",
      category: "Wedding",
      size: ["M", "L", "XL"],
      color: "Maroon",
      imageUrl: "https://images.unsplash.com/photo-1610030181087-540f829eb849?w=500",
      rentPricePerDay: 1499,
      securityDeposit: 3000,
      totalQuantity: 1,
    },
    {
      name: "Blush Pink Cocktail Dress",
      description: "A chic blush pink dress, great for cocktail parties and birthdays.",
      category: "Western",
      size: ["S", "M"],
      color: "Blush Pink",
      imageUrl: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=500",
      rentPricePerDay: 599,
      securityDeposit: 1000,
      totalQuantity: 3,
    },
  ]);

  console.log("✅ Seed data created!");
  console.log("Admin login -> email: admin@rento.com | password: admin123");
  process.exit();
};

seed();
