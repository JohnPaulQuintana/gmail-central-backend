const supabase = require("../db/supabase");

function classifyNotification(title = "", text = "", app = "") {
  const content = `${title} ${text} ${app}`.toLowerCase();

  if (
    content.includes("win") ||
    content.includes("lottery") ||
    content.includes("free") ||
    content.includes("claim") ||
    content.includes("urgent") ||
    content.includes("click here")
  ) {
    return "Spam";
  }

  if (
    content.includes("receipt") ||
    content.includes("paid") ||
    content.includes("invoice") ||
    content.includes("transaction") ||
    content.includes("payment") ||
    content.includes("order")
  ) {
    return "Receipt";
  }

  if (
    content.includes("job") ||
    content.includes("hiring") ||
    content.includes("apply") ||
    content.includes("career") ||
    content.includes("interview")
  ) {
    return "Job";
  }

  if (
    app.includes("whatsapp") ||
    app.includes("messenger") ||
    app.includes("telegram") ||
    app.includes("gmail") ||
    app.includes("sms") ||
    app.includes("messaging")
  ) {
    return "Social";
  }

  return "Social";
}

exports.captured = async (req, res) => {
  try {
    const { appPackage, title, text, time } = req.body;

    const category = classifyNotification(title, text, appPackage);

    const notification = {
      app: package,
      title: title || "No Title",
      preview: text || "",
      category,
      timestamp: time,
    };

    // 💾 SAVE TO SUPABASE
    const { data, error } = await supabase
      .from("notifications")
      .insert([notification]);

    if (error) {
      console.error("SUPABASE ERROR:", error);
      return res.status(500).json({ success: false, error });
    }

    console.log("💾 SAVED TO SUPABASE:");
    console.log(notification);

    return res.status(200).json({
      success: true,
      data: notification,
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false });
  }
};