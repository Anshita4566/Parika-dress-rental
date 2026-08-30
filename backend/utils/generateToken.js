// Login hone ke baad user ko ek "token" (jaise ek digital pass) diya jata hai.
// Ye token har request ke saath bhejna padta hai taaki server jaan sake "ye user login hai"
const jwt = require("jsonwebtoken");

const generateToken = (userId, role) => {
  return jwt.sign({ id: userId, role }, process.env.JWT_SECRET, {
    expiresIn: "7d", // 7 din baad token expire ho jayega, dubara login karna hoga
  });
};

module.exports = generateToken;
