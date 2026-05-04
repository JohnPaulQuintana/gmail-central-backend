const seen = new Map(); // 🔥 safer than Set

const TTL = 1000 * 60 * 10; // 10 minutes cache

function classifyNotification(title = "", text = "", app = "") {
  const content = `${title} ${text} ${app}`.toLowerCase();

  // 🔥 JOB
  if (
    content.includes("job") ||
    content.includes("hiring") ||
    content.includes("apply") ||
    content.includes("career") ||
    content.includes("interview")
  ) {
    return "Job";
  }

  // 💰 RECEIPT / FINANCE
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

  // 🚫 SPAM
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

  // 👥 SOCIAL
  if (
    app.includes("gmail") ||
    app.includes("whatsapp") ||
    app.includes("messenger") ||
    app.includes("telegram") ||
    app.includes("messaging") ||
    app.includes("sms") ||
    app.includes("mms") ||
    app.includes("android.messaging") ||
    app.includes("com.google.android.apps.messaging")
  ) {
    return "Social";
  }

  return "Social";
}

exports.captured = async (req, res) => {
  try {
    const { package, title, text, time } = req.body;

    const key = `${package}|${title}|${text}|${time}`;
    const now = Date.now();

    // 🔥 DEDUPLICATION
    if (seen.has(key)) {
      return res.status(200).json({ skipped: true });
    }

    seen.set(key, now);

    // 🧹 CLEANUP OLD ENTRIES (prevents memory leak)
    for (let [k, t] of seen.entries()) {
      if (now - t > TTL) {
        seen.delete(k);
      }
    }

    const category = classifyNotification(title, text, package);

    const notification = {
      app: package,
      title: title || "No Title",
      preview: text || "",
      timestamp: time,
      category: category,
    };

    console.log("📥 CLASSIFIED NOTIFICATION:");
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