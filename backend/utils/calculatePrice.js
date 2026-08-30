// Rental pricing logic:
// Din 1-5   -> flat base price (jaise ₹1500)
// Din 6-10  -> base price × 2  (₹3000)
// Din 11-15 -> base price × 4  (₹6000)
// Har naya 5-din ka block price ko double kar deta hai

// function calculateRentalPrice(totalDays, basePrice, securityDeposit = 0) {
//   const blockIndex = Math.ceil(totalDays / 5); // 1-5 din = block 1, 6-10 = block 2, waghera
//   const multiplier = Math.pow(2, blockIndex - 1); // block 1 = ×1, block 2 = ×2, block 3 = ×4
//   const rentAmount = basePrice * multiplier;
//   const totalPrice = rentAmount + securityDeposit;
//   return { rentAmount, totalPrice, multiplier, blockIndex };
// }

// module.exports = calculateRentalPrice;
// Rental pricing logic:
// Din 1-5   -> flat base price (jaise ₹1500)
// Din 5 ke baad -> har extra din pe ₹100 add hota hai
// Example: 7 din = 1500 + (2 × 100) = ₹1700

const EXTRA_DAY_CHARGE = 100;
const FLAT_DAYS_LIMIT = 5;

function calculateRentalPrice(totalDays, basePrice, securityDeposit = 0) {
  let rentAmount;

  if (totalDays <= FLAT_DAYS_LIMIT) {
    rentAmount = basePrice;
  } else {
    const extraDays = totalDays - FLAT_DAYS_LIMIT;
    rentAmount = basePrice + extraDays * EXTRA_DAY_CHARGE;
  }

  const totalPrice = rentAmount + securityDeposit;
  return { rentAmount, totalPrice };
}

module.exports = calculateRentalPrice;