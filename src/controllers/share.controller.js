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
// RULE-BASED CLASSIFIER
// -------------------------
function classifyMerchant(merchant = "") {
    const m = merchant.toLowerCase();

    // FOOD
    if (
        m.includes("jollibee") ||
        m.includes("mcdonald") ||
        m.includes("kfc") ||
        m.includes("burger") ||
        m.includes("restaurant") ||
        m.includes("cafe") ||
        m.includes("coffee")
    ) {
        return {
            category: CATEGORIES.FOOD,
            subcategory: "Restaurant"
        };
    }

    // TRANSPORT
    if (m.includes("grab") || m.includes("uber")) {
        return {
            category: CATEGORIES.TRANSPORT,
            subcategory: "Ride Hailing"
        };
    }

    if (m.includes("shell") || m.includes("petron") || m.includes("gas")) {
        return {
            category: CATEGORIES.TRANSPORT,
            subcategory: "Gas"
        };
    }

    // BILLS
    if (
        m.includes("meralco") ||
        m.includes("globe") ||
        m.includes("smart") ||
        m.includes("water") ||
        m.includes("electric")
    ) {
        return {
            category: CATEGORIES.BILLS,
            subcategory: "Utilities"
        };
    }

    // CASH
    if (m.includes("atm") || m.includes("withdraw")) {
        return {
            category: CATEGORIES.CASH,
            subcategory: "ATM Withdrawal"
        };
    }

    return {
        category: CATEGORIES.OTHER,
        subcategory: "Unknown"
    };
}

// -------------------------
// FAST RECEIPT PARSER
// -------------------------
function parseReceipt(text) {
    const amount = text.match(/PHP\s?([\d,]+\.\d{2})/i);
    const merchant = text.match(/at\s(.+?)\son/i);
    const balance = text.match(/Available balance:\sPHP\s?([\d,]+\.\d{2})/i);
    const reference = text.match(/Ref No:\s(\d+)/i);

    return {
        amount: amount?.[1]?.replace(/,/g, "") || null,
        merchant: merchant?.[1] || null,
        balance: balance?.[1]?.replace(/,/g, "") || null,
        reference: reference?.[1] || null
    };
}

// -------------------------
// AI FALLBACK (OPTIONAL)
// -------------------------
async function aiExtract(text) {
    // plug OpenAI / Gemini later
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
        // PARSE RECEIPT
        // -------------------------
        let parsed = parseReceipt(cleanText);
        let usedAI = false;

        // -------------------------
        // MERCHANT CLASSIFICATION
        // -------------------------
        let merchantName = parsed.merchant;

        if (merchantName) {
            const normalized = normalizeMerchant(merchantName);
            const classification = classifyMerchant(normalized);

            parsed.category = classification.category;
            parsed.subcategory = classification.subcategory;
        }

        // -------------------------
        // AI FALLBACK
        // -------------------------
        if (!parsed.amount && !parsed.merchant) {
            parsed = await aiExtract(cleanText);
            usedAI = true;
        }

        // -------------------------
        // SAVE TO SUPABASE (ENABLE WHEN READY)
        // -------------------------
        /*
        const { error } = await supabase.from("shared_receipts").insert([
            {
                user_id: userId,
                device_id: deviceId,
                raw_text: text,
                clean_text: cleanText,
                amount: parsed.amount,
                merchant: parsed.merchant,
                merchant_normalized: parsed.merchant
                    ? normalizeMerchant(parsed.merchant)
                    : null,
                category: parsed.category,
                subcategory: parsed.subcategory,
                balance: parsed.balance,
                reference: parsed.reference,
                source,
                time,
                used_ai: usedAI
            }
        ]);

        if (error) {
            console.error("DB ERROR:", error);

            return res.status(500).json({
                success: false,
                message: "Database insert failed"
            });
        }
        */

        const duration = Date.now() - startTime;

        console.log("Processed in", duration, "ms");
        console.log(parsed)
        // -------------------------
        // RESPONSE
        // -------------------------
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