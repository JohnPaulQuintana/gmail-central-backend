const supabase = require("../db/supabase");
const { parseReceipt } = require("../services/receiptParser.service");

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

    const parsed = parseReceipt(text.replace(/Menu/gi, "").trim());
    console.log("================PARSED==============================")
    console.log(parsed)
    return res.status(200).json({
      success: true,
      parsed,
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