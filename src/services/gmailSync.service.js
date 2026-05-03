const axios = require("axios");
const supabase = require("../db/supabase");
const { getValidAccessToken } = require("../utils/auth.helper");

// ==========================
// CATEGORY ENGINE
// ==========================
const categorizeEmail = (from = "", subject = "", snippet = "") => {
  const text = `${from} ${subject} ${snippet}`.toLowerCase();

  const jobKeywords = [
    "linkedin",
    "indeed",
    "job",
    "career",
    "interview",
    "application",
    "hired",
    "position",
    "recruiter",
    "workday",
    "greenhouse",
    "lever",
    "bamboohr",
  ];

  const receiptKeywords = [
    "receipt",
    "invoice",
    "order",
    "payment",
    "paid",
    "transaction",
    "shopee",
    "lazada",
    "amazon",
    "grab",
    "billing",
    "order confirmed",
    "order shipped",
    "maya",
  ];

  const spamKeywords = [
    "unsubscribe",
    "promo",
    "promotion",
    "discount",
    "offer",
    "sale",
    "marketing",
    "newsletter",
    "limited time",
    "win",
    "free",
    "crypto",
  ];

  const score = (keywords) =>
    keywords.reduce((acc, kw) => acc + (text.includes(kw) ? 1 : 0), 0);

  const jobScore = score(jobKeywords);
  const receiptScore = score(receiptKeywords);
  const spamScore = score(spamKeywords);

  if (jobScore >= 2) return "Job";
  if (receiptScore >= 2) return "Receipt";
  if (spamScore >= 2) return "Spam";

  if (jobScore === 1) return "Job";
  if (receiptScore === 1) return "Receipt";
  if (spamScore === 1) return "Spam";

  return "Others";
};

const getHeader = (headers, name) =>
  headers.find((h) => h.name === name)?.value || "";

const saveInboxEmail = async (user_id, email) => {
  const { data: existing } = await supabase
    .from("emails")
    .select("id")
    .eq("message_id", email.message_id)
    .eq("user_id", user_id)
    .maybeSingle();

  if (existing) return;

  await supabase.from("emails").insert([
    {
      user_id,
      message_id: email.message_id,
      thread_id: email.thread_id,
      sender: email.from,
      subject: email.subject,
      snippet: email.snippet,
      category: email.category,
      account_email: email.account_email,
      created_at: Date.now(),
    },
  ]);
};

// =====================
// MAIN SYNC FUNCTION
// =====================
const syncUserEmails = async (user_id) => {
  console.log("[SYNC] START", user_id);

  const { data: accounts } = await supabase
    .from("accounts")
    .select("*")
    .eq("user_id", user_id);

  for (const acc of accounts) {
    const token = await getValidAccessToken(acc);

    const gmailRes = await axios.get(
      "https://gmail.googleapis.com/gmail/v1/users/me/messages",
      {
        headers: { Authorization: `Bearer ${token}` },
        params: { q: "is:unread" },
      },
    );

    const messages = gmailRes.data.messages || [];

    await Promise.all(
      messages.slice(0, 20).map(async (msg) => {
        const detail = await axios.get(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );

        const data = detail.data;
        const headers = data.payload.headers;

        const emailData = {
          message_id: data.id,
          thread_id: data.threadId,
          from: getHeader(headers, "From"),
          subject: getHeader(headers, "Subject"),
          snippet: data.snippet,
          category: categorizeEmail(
            getHeader(headers, "From"),
            getHeader(headers, "Subject"),
            data.snippet,
          ),
          account_email: acc.email,
        };

        await saveInboxEmail(user_id, emailData);
      }),
    );
  }

  console.log("[SYNC] DONE", user_id);
};

module.exports = { syncUserEmails };
