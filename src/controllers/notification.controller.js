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
  const startTime = Date.now();

  try {
    console.log("\n==================== NEW REQUEST ====================");
    console.log("Time:", new Date().toISOString());
    console.log("Body size:", Array.isArray(req.body) ? req.body.length : "NOT ARRAY");
    console.log("IP:", req.ip);
    console.log("Headers:", {
      "content-type": req.headers["content-type"],
      "user-agent": req.headers["user-agent"]
    });

    const notifications = req.body;

    if (!Array.isArray(notifications)) {
      console.log("INVALID PAYLOAD:", notifications);
      return res.status(400).json({
        success: false,
        error: "Payload must be an array"
      });
    }

    console.log("RAW REQUEST BODY:", JSON.stringify(notifications, null, 2));

    const formatted = notifications.map((n, index) => {
      const mapped = {
        client_id: n.clientId,
        app: n.appPackage,
        title: n.title || "No Title",
        preview: n.text || "",
        category: classifyNotification(n.title, n.text, n.appPackage),
        timestamp: n.time
      };

      console.log(`MAPPED [${index}]:`, mapped);
      return mapped;
    });

    console.log("UPSERT START - COUNT:", formatted.length);

    const { data, error } = await supabase
      .from("notifications")
      .upsert(formatted, {
        onConflict: "client_id"
      });

    if (error) {
      console.log("SUPABASE ERROR FULL:", JSON.stringify(error, null, 2));
      return res.status(500).json({
        success: false,
        error
      });
    }

    console.log("UPSERT SUCCESS");
    console.log("Inserted batch size:", formatted.length);
    console.log("Duration:", Date.now() - startTime, "ms");
    console.log("==================== END REQUEST ====================\n");

    return res.status(200).json({
      success: true,
      inserted: formatted.length
    });

  } catch (err) {
    console.log("UNHANDLED ERROR:", err);
    return res.status(500).json({ success: false });
  }
};