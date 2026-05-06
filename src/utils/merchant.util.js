function normalizeMerchant(name = "") {
  return name
    .toUpperCase()
    .replace(/[#0-9-]/g, "")
    .replace(/\b(STATION|STORE|INC|CORP|BRANCH|PHILIPPINES|PH)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

module.exports = { normalizeMerchant };