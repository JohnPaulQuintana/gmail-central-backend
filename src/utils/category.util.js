const CATEGORIES = {
  FOOD: "Food & Dining",
  TRANSPORT: "Transportation",
  SHOPPING: "Shopping",
  BILLS: "Bills & Utilities",
  CASH: "Cash & ATM",
  OTHER: "Other",
};

const MERCHANT_MAP = {
  JOLLIBEE: { category: CATEGORIES.FOOD, subcategory: "Fast Food" },
  MCDONALDS: { category: CATEGORIES.FOOD, subcategory: "Fast Food" },
  GRAB: { category: CATEGORIES.TRANSPORT, subcategory: "Ride Hailing" },
  SHELL: { category: CATEGORIES.TRANSPORT, subcategory: "Gas" },
};

function classifyMerchant(merchant = "") {
  const m = merchant.toUpperCase();

  for (const key in MERCHANT_MAP) {
    if (m.includes(key)) return MERCHANT_MAP[key];
  }

  return { category: CATEGORIES.OTHER, subcategory: "Unknown" };
}

module.exports = { classifyMerchant };