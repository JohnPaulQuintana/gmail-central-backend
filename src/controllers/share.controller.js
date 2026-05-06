const supabase = require("../db/supabase");
const { parseReceipt } = require("../services/receiptParser.service");

exports.shared = async (req, res) => {
  const startTime = Date.now();

  try {
    const { text, deviceId, userId } = req.body;

    // 🔥 IMPORTANT: get trusted user from auth middleware
    // const userId = req.user?.id;

    if (!text || !userId || !deviceId) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    const cleanText = text.replace(/Menu/gi, "").trim();

    const parsed = parseReceipt(cleanText);

    console.log("================PARSED==============================");
    console.log(cleanText);
    console.log(parsed);

    // 🔥 FINAL SAFETY FIX (prevents "No" bug again)
    if (parsed.reference?.toLowerCase() === "no") {
      parsed.reference = null;
    }

    // 🔥 Supabase INSERT
    const { data, error } = await supabase
      .from("transactions")
      .insert([
        {
          user_id: userId,
          device_id: deviceId,

          source: parsed.source || null,
          amount: parsed.amount ? Number(parsed.amount) : null,

          merchant: parsed.merchant || null,
          merchant_raw: parsed.merchant_raw || parsed.merchant || null,

          balance: parsed.balance ? Number(parsed.balance) : null,

          reference: parsed.reference || null,

          category: parsed.category || null,
          subcategory: parsed.subcategory || null,

          raw_text: cleanText,
          raw_date: parsed.raw_date || null,
          transaction_time: parsed.transaction_time || null,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("❌ Supabase insert error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to save transaction",
        error: error.message,
      });
    }

    return res.status(200).json({
      success: true,
      data,
      duration: Date.now() - startTime,
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

exports.getTransactions = async (req, res) => {
  try {
    const userId = req.query.userId; // or req.user.id if auth later

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "Missing userId",
      });
    }

    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", userId)
      .order("transaction_time", { ascending: false });

    if (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to fetch transactions",
        error: error.message,
      });
    }

    return res.status(200).json({
      success: true,
      count: data.length,
      data,
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};