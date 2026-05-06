const supabase = require("../db/supabase");

// -------------------------
// CATEGORY SYSTEM (BANK STYLE)
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
    OTHER: "Other"
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
// SAFE DATE EXTRACTION (NO "ON" DEPENDENCY)
// -------------------------
function extractDate(text) {
    const patterns = [
        // 06-May-2026 09:15AM
        /(\d{2}-[A-Za-z]{3}-\d{4}\s\d{1,2}:\d{2}[AP]M)/,

        // 06/05/2026 09:15
        /(\d{1,2}\/\d{1,2}\/\d{4}\s\d{1,2}:\d{2})/,

        // ISO
        /(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})/
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

    const parsed = new Date(dateStr);
    if (isNaN(parsed)) return null;

    return parsed.toISOString();
}

// -------------------------
// RECEIPT PARSER
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
        transaction_time: parseToISO(rawDate)
    };
}

// -------------------------
// AI FALLBACK
// -------------------------
async function aiExtract(text) {
    return {
        amount: null,
        merchant: null,
        balance: null,
        reference: null,
        category: CATEGORIES.OTHER,
        subcategory: "Unknown",
        type: "ai_fallback"
    };
}

// -------------------------
// MAIN CONTROLLER
// -------------------------
exports.shared = async (req, res) => {
    const startTime = Date.now();

    try {
        console.log("\n==================== NEW REQUEST ====================");
        console.log("Time:", new Date().toISOString());

        const { text, source, time, userId, deviceId } = req.body;

        console.log(req.body);

        // -------------------------
        // VALIDATION
        // -------------------------
        if (!text || !userId || !deviceId) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields"
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
        // PARSE
        // -------------------------
        let parsed = parseReceipt(cleanText);
        let usedAI = false;

        // -------------------------
        // CLASSIFY
        // -------------------------
        if (parsed.merchant) {
            const normalized = normalizeMerchant(parsed.merchant);
            const classification = classifyMerchant(normalized);

            parsed.category = classification.category;
            parsed.subcategory = classification.subcategory;
        }

        // -------------------------
        // AI fallback
        // -------------------------
        if (!parsed.amount && !parsed.merchant) {
            parsed = await aiExtract(cleanText);
            usedAI = true;
        }

        const duration = Date.now() - startTime;

        console.log("Processed in", duration, "ms");
        console.log(parsed);

        return res.status(200).json({
            success: true,
            message: "Processed successfully",
            parsed,
            usedAI,
            duration
        });

    } catch (error) {
        console.error("SERVER ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};