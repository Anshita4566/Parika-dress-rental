const jwt = require("jsonwebtoken");
const User = require("../models/User");

// "protect" middleware = check karta hai ki request ke saath valid token hai ya nahi
const protect = async (req, res, next) => {
  let token;

  // Token normally header me aise aata hai: "Bearer eyJhbGciOi..."
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    try {
      token = req.headers.authorization.split(" ")[1];

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // decoded token se user dhoondo, password mat bhejo response me
      req.user = await User.findById(decoded.id).select("-password");

      if (!req.user) {
        return res.status(401).json({ message: "User not found, please login again" });
      }

      next(); // sab thik hai, aage badho
    } catch (error) {
      return res.status(401).json({ message: "Not authorized, invalid token" });
    }
  } else {
    return res.status(401).json({ message: "Not authorized, no token provided" });
  }
};

// "adminOnly" middleware = sirf admin role wale users ko allow karta hai
const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    return res.status(403).json({ message: "Access denied. Admins only." });
  }
};

module.exports = { protect, adminOnly };
