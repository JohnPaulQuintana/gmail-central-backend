function detectSource(text = "") {
  const t = text.toLowerCase();

  if (t.includes("gcash")) return "GCASH";
  if (t.includes("maya") || t.includes("paymaya")) return "MAYA";

  if (t.includes("bdo")) return "BDO";
  if (t.includes("bpi")) return "BPI";

  return "UNKNOWN";
}

module.exports = { detectSource };