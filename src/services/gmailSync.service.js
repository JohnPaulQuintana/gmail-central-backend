const axios = require("axios");
const supabase = require("../db/supabase");
const { getValidAccessToken } = require("../utils/auth.helper");

// ==========================
// CATEGORY ENGINE
// ==========================
const categorizeEmail = (from = "", subject = "", snippet = "") => {
  const text = `${from} ${subject} ${snippet}`.toLowerCase();

  const jobKeywords = [
    "linkedin","indeed","job","career","interview","application",
    "hired","position","recruiter","workday","greenhouse","lever","bamboohr",
  ];

  const receiptKeywords = [
    "receipt","invoice","order","payment","paid","transaction",
    "shopee","lazada","amazon","grab","billing","order confirmed",
    "order shipped","maya",
  ];

  const spamKeywords = [
    "unsubscribe","promo","promotion","discount","offer","sale",
    "marketing","newsletter","limited time","win","free","crypto",
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

// ==========================
// HELPERS
// ==========================
const getHeader = (headers, name) =>
  headers.find((h) => h.name === name)?.value || "";

// ==========================
// SAVE EMAIL
// ==========================
const saveInboxEmail = async (user_id, email) => {
  const { data: existing } = await supabase
    .from("emails")
    .select("id")
    .eq("message_id", email.message_id)
    .eq("user_id", user_id)
    .maybeSingle();

  if (existing) return;

  const { error } = await supabase.from("emails").insert([
    {
      user_id,
      message_id: email.message_id,
      thread_id: email.thread_id,

      sender: email.from,
      subject: email.subject,
      snippet: email.snippet,
      category: email.category,
      account_email: email.account_email,

      // ✅ FIXED DATE COLUMN (IMPORTANT)
      date: email.date,

      created_at: Date.now(),
    },
  ]);

  if (error) {
    console.log("[SAVE EMAIL ERROR]", error.message);
  }
};

// ==========================
// MAIN SYNC
// ==========================
const syncUserEmails = async (user_id) => {
  const start = Date.now();
  let totalSynced = 0;

  console.log("[SYNC] START", user_id);

  const { data: accounts, error: accErr } = await supabase
    .from("accounts")
    .select("*")
    .eq("user_id", user_id);

  if (accErr) throw accErr;
  if (!accounts?.length) return { user_id, synced: 0 };

  for (const acc of accounts) {
    const token = await getValidAccessToken(acc);

    const gmailRes = await axios.get(
      "https://gmail.googleapis.com/gmail/v1/users/me/messages",
      {
        headers: { Authorization: `Bearer ${token}` },
        params: { q: "is:unread" },
      }
    );

    const messages = gmailRes.data.messages || [];
    const BATCH_SIZE = 5;

    for (let i = 0; i < messages.slice(0, 20).length; i += BATCH_SIZE) {
      const batch = messages.slice(i, i + BATCH_SIZE);

      await Promise.all(
        batch.map(async (msg) => {
          try {
            const detail = await axios.get(
              `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`,
              {
                headers: { Authorization: `Bearer ${token}` },
              }
            );

            const data = detail.data;
            const headers = data.payload.headers;

            const rawDate = getHeader(headers, "Date");

            const emailData = {
              message_id: data.id,
              thread_id: data.threadId,
              from: getHeader(headers, "From"),
              subject: getHeader(headers, "Subject"),
              snippet: data.snippet,

              // ✅ SAFE TIMESTAMP (CRITICAL FIX)
              date: rawDate ? new Date(rawDate).getTime() : Date.now(),

              category: categorizeEmail(
                getHeader(headers, "From"),
                getHeader(headers, "Subject"),
                data.snippet
              ),

              account_email: acc.email,
            };

            await saveInboxEmail(user_id, emailData);
            totalSynced++;
          } catch (err) {
            console.log("[GMAIL FETCH ERROR]", err.message);
          }
        })
      );
    }
  }

  console.log("[SYNC] DONE", user_id);

  return {
    user_id,
    synced: totalSynced,
    total_time_ms: Date.now() - start,
  };
};

module.exports = { syncUserEmails };