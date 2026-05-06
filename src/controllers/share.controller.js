const supabase = require("../db/supabase");
const { geminiExtract } = require("../services/gemini");

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
// CLASSIFIER
// -------------------------
function classifyMerchant(merchant = "") {
  const m = merchant.toLowerCase();

  if (
    m.includes("jollibee") ||
    m.includes("mcdonald") ||
    m.includes("kfc") ||
    m.includes("burger") ||
    m.includes("restaurant") ||
    m.includes("cafe") ||
    m.includes("coffee")
  ) {
    return { category: CATEGORIES.FOOD, subcategory: "Restaurant" };
  }

  if (m.includes("grab") || m.includes("uber")) {
    return { category: CATEGORIES.TRANSPORT, subcategory: "Ride Hailing" };
  }

  if (m.includes("shell") || m.includes("petron") || m.includes("gas")) {
    return { category: CATEGORIES.TRANSPORT, subcategory: "Gas" };
  }

  if (
    m.includes("meralco") ||
    m.includes("globe") ||
    m.includes("smart") ||
    m.includes("water") ||
    m.includes("electric")
  ) {
    return { category: CATEGORIES.BILLS, subcategory: "Utilities" };
  }

  if (m.includes("atm") || m.includes("withdraw")) {
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
  if (!dateStr) return null;

  try {
    // convert "06-May-2026 09:15AM" → ISO-safe format
    const cleaned = dateStr
      .replace(/(\d{2})-([A-Za-z]{3})-(\d{4})/, (_, d, m, y) => {
        const months = {
          Jan: "01", Feb: "02", Mar: "03", Apr: "04",
          May: "05", Jun: "06", Jul: "07", Aug: "08",
          Sep: "09", Oct: "10", Nov: "11", Dec: "12"
        };
        return `${y}-${months[m]}-${d}`;
      })
      .replace("AM", " AM")
      .replace("PM", " PM");

    const parsed = new Date(cleaned);

    if (isNaN(parsed)) return null;

    return parsed.toISOString();
  } catch {
    return null;
  }
}

// -------------------------
// REGEX PARSER (FAST LAYER)
// -------------------------
function parseReceipt(text) {
  const amount = text.match(/PHP\s?([\d,]+\.\d{2})/i);
  const merchant = text.match(/at\s(.+?)\s(?:on|to|in|from)/i);
  const balance = text.match(/Available balance:\sPHP\s?([\d,]+\.\d{2})/i);
  const reference = text.match(/Ref No:\s(\d+)/i);

  const rawDate = extractDate(text);

  return {
    amount: amount?.[1]?.replace(/,/g, "") || null,
    merchant: merchant?.[1] || null,
    balance: balance?.[1]?.replace(/,/g, "") || null,
    reference: reference?.[1] || null,
    raw_date: rawDate,
    transaction_time: parseToISO(rawDate),
    source: "regex",
  };
}

// -------------------------
// MAIN CONTROLLER
// -------------------------
exports.shared = async (req, res) => {
  const startTime = Date.now();

  try {
    console.log("\n==================== NEW REQUEST ====================");

    const { text, userId, deviceId, source, time } = req.body;

    console.log(req.body);

    // -------------------------
    // VALIDATION
    // -------------------------
    if (!text || !userId || !deviceId) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    // -------------------------
    // CLEAN TEXT
    // -------------------------
    const cleanText = text
      .replace(/Menu/gi, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    // -------------------------
    // LAYER 1: REGEX
    // -------------------------
    let regexParsed = parseReceipt(cleanText);

    // -------------------------
    // CLASSIFY (FROM REGEX)
    // -------------------------
    if (regexParsed.merchant) {
      const normalized = normalizeMerchant(regexParsed.merchant);
      const classification = classifyMerchant(normalized);

      regexParsed.category = classification.category;
      regexParsed.subcategory = classification.subcategory;
    }

    // -------------------------
    // LAYER 2: GEMINI AI
    // -------------------------
    console.log("🧠 Calling Gemini AI...");

    let geminiParsed = await geminiExtract(cleanText);

    if (!geminiParsed) {
      console.log("❌ Gemini failed");
      geminiParsed = {};
    } else {
      console.log("✅ Gemini success");
    }

    // -------------------------
    // DEBUG MERGED RESULT
    // -------------------------
    const finalParsed = {
      amount: regexParsed.amount || geminiParsed.amount,
      merchant: regexParsed.merchant || geminiParsed.merchant,
      balance: regexParsed.balance || geminiParsed.balance,
      reference: regexParsed.reference || geminiParsed.reference,
      raw_date: regexParsed.raw_date || geminiParsed.raw_date,
      transaction_time:
        regexParsed.transaction_time || geminiParsed.transaction_time,

      category: regexParsed.category || geminiParsed.category,
      subcategory: regexParsed.subcategory || geminiParsed.subcategory,
    };

    // -------------------------
    // DEBUG RESPONSE (IMPORTANT)
    // -------------------------
    const debug = {
      regex: regexParsed,
      gemini: geminiParsed,
      final: finalParsed,
      source_used: {
        regex_hit: !!regexParsed.amount || !!regexParsed.merchant,
        gemini_hit: !!geminiParsed.amount || !!geminiParsed.merchant,
      },
    };

    const duration = Date.now() - startTime;

    console.log("=========== REGEX OUTPUT ===========");
    console.log(regexParsed);

    console.log("=========== GEMINI OUTPUT ===========");
    console.log(geminiParsed);

    console.log("=========== FINAL OUTPUT ===========");
    console.log(finalParsed);

    console.log("Processed in", duration, "ms");

    // -------------------------
    // RESPONSE
    // -------------------------
    return res.status(200).json({
      success: true,
      message: "Processed successfully",
      debug,
      parsed: finalParsed,
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
