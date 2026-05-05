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
  ) return "Spam";

  if (
    content.includes("receipt") ||
    content.includes("paid") ||
    content.includes("invoice") ||
    content.includes("transaction") ||
    content.includes("payment") ||
    content.includes("order")
  ) return "Receipt";

  if (
    content.includes("job") ||
    content.includes("hiring") ||
    content.includes("apply") ||
    content.includes("career") ||
    content.includes("interview")
  ) return "Job";

  if (
    app.includes("whatsapp") ||
    app.includes("messenger") ||
    app.includes("telegram") ||
    app.includes("gmail") ||
    app.includes("sms") ||
    app.includes("messaging")
  ) return "Social";

  return "Social";
}

exports.captured = async (req, res) => {
  try {
    const notifications = req.body;

    if (!Array.isArray(notifications)) {
      return res.status(400).json({
        success: false,
        error: "Payload must be an array"
      });
    }

    const formatted = notifications.map(n => ({
      client_id: n.clientId,
      app: n.appPackage,
      title: n.title || "No Title",
      preview: n.text || "",
      category: classifyNotification(n.title, n.text, n.appPackage),
      timestamp: n.time
    }));

    const { data, error } = await supabase
      .from("notifications")
      .upsert(formatted, {
        onConflict: "client_id"
      });

    if (error) {
      console.error("SUPABASE ERROR:", error);
      return res.status(500).json({ success: false, error });
    }

    return res.status(200).json({
      success: true,
      inserted: formatted.length
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false });
  }
};