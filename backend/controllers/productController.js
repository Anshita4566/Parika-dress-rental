const Product = require("../models/Product");

// @route  GET /api/products   (public - kisi bhi user ko dresses dikhna chahiye)
// Supports optional filters: ?category=Party+Wear&search=red
const getProducts = async (req, res) => {
  try {
   const { category, search, gender } = req.query;
    const filter = {};

    if (category) filter.category = category;
    if (gender) filter.gender = gender;
    if (search) filter.name = { $regex: search, $options: "i" }; // case-insensitive search

    const products = await Product.find(filter).sort({ createdAt: -1 });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @route  GET /api/products/:id  (single dress detail)
const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Dress not found" });
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @route  POST /api/products   (admin only)
const createProduct = async (req, res) => {
  try {
    const product = await Product.create(req.body);
    res.status(201).json(product);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @route  PUT /api/products/:id   (admin only)
const updateProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true, // updated document return karo
      runValidators: true,
    });
    if (!product) return res.status(404).json({ message: "Dress not found" });
    res.json(product);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @route  DELETE /api/products/:id   (admin only)
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ message: "Dress not found" });
    res.json({ message: "Dress removed successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getProducts, getProductById, createProduct, updateProduct, deleteProduct };
