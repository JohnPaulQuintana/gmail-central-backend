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
  )
    return "Spam";

  if (
    content.includes("receipt") ||
    content.includes("paid") ||
    content.includes("invoice") ||
    content.includes("transaction") ||
    content.includes("payment") ||
    content.includes("order")
  )
    return "Receipt";

  if (
    content.includes("job") ||
    content.includes("hiring") ||
    content.includes("apply") ||
    content.includes("career") ||
    content.includes("interview")
  )
    return "Job";

  if (
    app.includes("whatsapp") ||
    app.includes("messenger") ||
    app.includes("telegram") ||
    app.includes("gmail") ||
    app.includes("sms") ||
    app.includes("messaging")
  )
    return "Social";

  return "Social";
}

//  save notification
exports.captured = async (req, res) => {
  const startTime = Date.now();

  try {
    console.log("\n==================== NEW REQUEST ====================");
    console.log("Time:", new Date().toISOString());

    const notifications = req.body;

    if (!Array.isArray(notifications)) {
      return res.status(400).json({
        success: false,
        error: "Payload must be an array",
      });
    }

    const formatted = notifications.map((n, index) => {
      const mapped = {
        user_id: n.userId,
        device_id: n.deviceId,

        client_id: n.clientId,
        package_name: n.appPackage,

        title: n.title || "No Title",
        text: n.text || "",

        category: classifyNotification(n.title, n.text, n.appPackage),

        timestamp: n.time,
      };

      console.log(`MAPPED [${index}]:`, mapped);
      return mapped;
    });

    console.log("UPSERT START - COUNT:", formatted.length);

    const { error } = await supabase.from("notifications").upsert(formatted, {
      onConflict: "user_id,client_id",
    });

    if (error) {
      console.log("SUPABASE ERROR:", error);
      return res.status(500).json({
        success: false,
        error,
      });
    }

    console.log("UPSERT SUCCESS");
    console.log("Duration:", Date.now() - startTime, "ms");

    return res.status(200).json({
      success: true,
      inserted: formatted.length,
    });
  } catch (err) {
    console.log("UNHANDLED ERROR:", err);
    return res.status(500).json({ success: false });
  }
};

// collect notification
exports.getNotifications = async (req, res) => {
  try {
    const { user_id, category } = req.query;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        error: "user_id is required",
      });
    }

    let query = supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user_id)
      .order("timestamp", { ascending: false });

    if (category && category !== "All") {
      query = query.eq("category", category);
    }

    const { data, error } = await query;

    if (error) {
      console.log("FETCH ERROR:", error);
      return res.status(500).json({ success: false, error });
    }

    return res.status(200).json({
      success: true,
      notifications: data,
    });
  } catch (err) {
    console.log("UNHANDLED ERROR:", err);
    return res.status(500).json({ success: false });
  }
};
