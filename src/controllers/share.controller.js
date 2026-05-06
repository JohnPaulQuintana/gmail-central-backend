const supabase = require("../db/supabase");

// -------------------------
// CATEGORY SYSTEM
// -------------------------
const CATEGORIES = {
  FOOD: "Food & Dining",
  TRANSPORT: "Transportation",
  SHOPPING: "Shopping",
  BILLS: "Bills & Utilities",
  HEALTH: "Health & Pharmacy",
  ENTERTAINMENT: "Entertainment",
  FINANCE: "Finance",
  CASH: "Cash & ATM",
  SUBSCRIPTIONS: "Subscriptions",
  OTHER: "Other",
};

// -------------------------
// SOURCE DETECTOR (PH)
// -------------------------
function detectSource(text = "") {
  const t = text.toLowerCase();

  if (t.includes("gcash")) return "GCASH";
  if (t.includes("maya")) return "MAYA";
  if (t.includes("bdo")) return "BDO";
  if (t.includes("bpi")) return "BPI";
  if (t.includes("unionbank")) return "UNIONBANK";
  if (t.includes("metrobank")) return "METROBANK";

  return "UNKNOWN";
}

// -------------------------
// MERCHANT NORMALIZER
// -------------------------
function normalizeMerchant(name = "") {
  return name
    .toUpperCase()
    .replace(/[#0-9-]/g, "")
    .replace(/\b(STATION|STORE|INC|CORP|BRANCH|PHILIPPINES|PH)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// -------------------------
// MERCHANT MAP (PH FOCUSED)
// -------------------------
const MERCHANT_MAP = {
  JOLLIBEE: { category: CATEGORIES.FOOD, subcategory: "Fast Food" },
  MCDONALDS: { category: CATEGORIES.FOOD, subcategory: "Fast Food" },
  KFC: { category: CATEGORIES.FOOD, subcategory: "Fast Food" },
  STARBUCKS: { category: CATEGORIES.FOOD, subcategory: "Coffee" },

  SHELL: { category: CATEGORIES.TRANSPORT, subcategory: "Gas" },
  PETRON: { category: CATEGORIES.TRANSPORT, subcategory: "Gas" },
  CALTEX: { category: CATEGORIES.TRANSPORT, subcategory: "Gas" },

  GRAB: { category: CATEGORIES.TRANSPORT, subcategory: "Ride Hailing" },

  MERALCO: { category: CATEGORIES.BILLS, subcategory: "Electricity" },
  GLOBE: { category: CATEGORIES.BILLS, subcategory: "Telecom" },
  SMART: { category: CATEGORIES.BILLS, subcategory: "Telecom" },

  SHOPEE: { category: CATEGORIES.SHOPPING, subcategory: "E-commerce" },
  LAZADA: { category: CATEGORIES.SHOPPING, subcategory: "E-commerce" },
};

// -------------------------
// CLASSIFIER
// -------------------------
function classifyMerchant(merchant = "") {
  const m = merchant.toUpperCase();

  for (const key in MERCHANT_MAP) {
    if (m.includes(key)) return MERCHANT_MAP[key];
  }

  if (m.includes("ATM") || m.includes("WITHDRAW")) {
    return { category: CATEGORIES.CASH, subcategory: "ATM Withdrawal" };
  }

  return { category: CATEGORIES.OTHER, subcategory: "Unknown" };
}

// -------------------------
// DATE EXTRACTION
// -------------------------
function extractDate(text) {
  const patterns = [
    /(\d{2}-[A-Za-z]{3}-\d{4}\s\d{1,2}:\d{2}[AP]M)/,
    /(\d{1,2}\/\d{1,2}\/\d{4}\s\d{1,2}:\d{2})/,
    /(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})/,
  ];

  for (const p of patterns) {
    const match = text.match(p);
    if (match) return match[1];
  }

  return null;
}

// -------------------------
// ISO CONVERTER
// -------------------------
function parseToISO(dateStr) {
  if (!dateStr) return new Date().toISOString();

  try {
    const cleaned = dateStr
      .replace(/(\d{2})-([A-Za-z]{3})-(\d{4})/, (_, d, m, y) => {
        const months = {
          Jan: "01", Feb: "02", Mar: "03", Apr: "04",
          May: "05", Jun: "06", Jul: "07", Aug: "08",
          Sep: "09", Oct: "10", Nov: "11", Dec: "12",
        };
        return `${y}-${months[m]}-${d}`;
      })
      .replace("AM", " AM")
      .replace("PM", " PM");

    const parsed = new Date(cleaned);
    return isNaN(parsed) ? new Date().toISOString() : parsed.toISOString();
  } catch {
    return new Date().toISOString();
  }
}

// -------------------------
// UNIVERSAL PARSER
// -------------------------
function parseReceipt(text) {
  const source = detectSource(text);

  // amount (multiple formats)
  const amount =
    text.match(/PHP\s?([\d,]+\.\d{2})/i) ||
    text.match(/([\d,]+\.\d{2})\s?PHP/i) ||
    text.match(/amount[:\s]+([\d,]+\.\d{2})/i);

  // merchant (multiple patterns)
  const merchant =
    text.match(/(?:at|from|to|merchant)\s(.+?)(?:\s(?:on|ref|via|$))/i) ||
    text.match(/paid to\s(.+?)(?:\s|$)/i);

  // balance
  const balance =
    text.match(/balance[:\s]+PHP\s?([\d,]+\.\d{2})/i) ||
    text.match(/available balance[:\s]+PHP\s?([\d,]+\.\d{2})/i);

  // reference
  const reference =
    text.match(/ref(?:erence)?(?: no)?[:\s]+([A-Za-z0-9-]+)/i) ||
    text.match(/trx[:\s]+([A-Za-z0-9]+)/i);

  const rawDate = extractDate(text);

  return {
    source,
    amount: amount?.[1]?.replace(/,/g, "") || null,
    merchant: merchant?.[1] || null,
    balance: balance?.[1]?.replace(/,/g, "") || null,
    reference: reference?.[1] || null,
    raw_date: rawDate,
    transaction_time: parseToISO(rawDate),
  };
}

// -------------------------
// MAIN CONTROLLER
// -------------------------
exports.shared = async (req, res) => {
  const startTime = Date.now();

  try {
    const { text, userId, deviceId } = req.body;

    if (!text || !userId || !deviceId) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    const cleanText = text.replace(/Menu/gi, "").trim();

    let parsed = parseReceipt(cleanText);

    // classify
    if (parsed.merchant) {
      const normalized = normalizeMerchant(parsed.merchant);
      const classification = classifyMerchant(normalized);

      parsed.category = classification.category;
      parsed.subcategory = classification.subcategory;
    }

    const duration = Date.now() - startTime;

    console.log("FINAL:", parsed);

    return res.status(200).json({
      success: true,
      parsed,
      duration,
    });
  } catch (error) {
    console.error("SERVER ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};