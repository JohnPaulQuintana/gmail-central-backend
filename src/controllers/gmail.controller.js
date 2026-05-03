const axios = require("axios");
const supabase = require("../db/supabase");
const { getValidAccessToken } = require("../utils/auth.helper");

// ==========================
// LOGGER (Render debugging)
// ==========================
const startTimer = () => Date.now();

const log = (label, start, extra = "") => {
  console.log(`[EMAIL-SYNC] ${label} +${Date.now() - start}ms`, extra);
};

// // ==========================
// // CATEGORY ENGINE
// // ==========================
// const categorizeEmail = (from = "", subject = "", snippet = "") => {
//   const text = `${from} ${subject} ${snippet}`.toLowerCase();

//   const jobKeywords = [
//     "linkedin", "indeed", "job", "career", "interview",
//     "application", "hired", "position", "recruiter",
//     "workday", "greenhouse", "lever", "bamboohr"
//   ];

//   const receiptKeywords = [
//     "receipt", "invoice", "order", "payment",
//     "paid", "transaction", "shopee", "lazada",
//     "amazon", "grab", "billing", "order confirmed",
//     "order shipped", "maya"
//   ];

//   const spamKeywords = [
//     "unsubscribe", "promo", "promotion", "discount",
//     "offer", "sale", "marketing", "newsletter",
//     "limited time", "win", "free", "crypto"
//   ];

//   const score = (keywords) =>
//     keywords.reduce((acc, kw) => acc + (text.includes(kw) ? 1 : 0), 0);

//   const jobScore = score(jobKeywords);
//   const receiptScore = score(receiptKeywords);
//   const spamScore = score(spamKeywords);

//   if (jobScore >= 2) return "Job";
//   if (receiptScore >= 2) return "Receipt";
//   if (spamScore >= 2) return "Spam";

//   if (jobScore === 1) return "Job";
//   if (receiptScore === 1) return "Receipt";
//   if (spamScore === 1) return "Spam";

//   return "Others";
// };

// // ==========================
// // HEADER HELPER
// // ==========================
// const getHeader = (headers, name) =>
//   headers.find(h => h.name === name)?.value || "";

// // ==========================
// // SAVE EMAIL (SUPABASE)
// // ==========================
// const saveInboxEmail = async (user_id, email, start) => {
//   log("Checking duplicate email", start);

//   const { data: existing } = await supabase
//     .from("emails")
//     .select("id")
//     .eq("message_id", email.message_id)
//     .eq("user_id", user_id)
//     .maybeSingle();

//   if (existing) {
//     log("Duplicate skipped", start);
//     return;
//   }

//   log("Inserting email to Supabase", start);

//   const { error } = await supabase.from("emails").insert([
//     {
//       user_id,

//       message_id: email.message_id,
//       thread_id: email.thread_id,

//       sender: email.from,
//       subject: email.subject,
//       snippet: email.snippet,
//       category: email.category,

//       account_email: email.account_email,
//       created_at: Date.now(),
//     },
//   ]);

//   if (error) {
//     console.log("[EMAIL-SYNC] SUPABASE ERROR", error);
//   } else {
//     log("Email saved", start);
//   }
// };

// // ==========================
// // GET EMAILS (ALL ACCOUNTS)
// // ==========================
// exports.getEmails = async (req, res) => {
//   const start = startTimer();

//   try {
//     const { user_id } = req.params;
//     log("Start email sync", start, user_id);

//     // ==========================
//     // GET ACCOUNTS
//     // ==========================
//     log("Fetching accounts", start);

//     const { data: accounts, error: accErr } = await supabase
//       .from("accounts")
//       .select("*")
//       .eq("user_id", user_id);

//     if (accErr) throw accErr;

//     if (!accounts.length) {
//       log("No accounts found", start);
//       return res.status(404).json({ error: "No accounts found" });
//     }

//     const results = [];

//     // ==========================
//     // LOOP ACCOUNTS
//     // ==========================
//     for (const acc of accounts) {
//       log("Processing account", start, acc.email);

//       const token = await getValidAccessToken(acc);

//       const gmailRes = await axios.get(
//         "https://gmail.googleapis.com/gmail/v1/users/me/messages",
//         {
//           headers: { Authorization: `Bearer ${token}` },
//           params: { q: "is:unread" },
//         }
//       );

//       const messages = gmailRes.data.messages || [];
//       const emails = [];

//       log("Messages fetched", start, messages.length);

//       // ==========================
//       // LOOP MESSAGES
//       // ==========================
//       for (const msg of messages) {
//         const detail = await axios.get(
//           `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`,
//           {
//             headers: { Authorization: `Bearer ${token}` },
//           }
//         );

//         const data = detail.data;
//         const headers = data.payload.headers;

//         const emailData = {
//           message_id: data.id,
//           thread_id: data.threadId,

//           from: getHeader(headers, "From"),
//           to: getHeader(headers, "To"),
//           subject: getHeader(headers, "Subject"),
//           date: getHeader(headers, "Date"),
//           snippet: data.snippet,

//           category: categorizeEmail(
//             getHeader(headers, "From"),
//             getHeader(headers, "Subject"),
//             data.snippet
//           ),

//           account_email: acc.email,
//         };

//         await saveInboxEmail(user_id, emailData, start);
//         emails.push(emailData);
//       }

//       results.push({
//         email: acc.email,
//         unread_count: messages.length,
//         emails,
//       });
//     }

//     log("Sync completed", start);

//     res.json({
//       user_id,
//       accounts: results,
//       total_time_ms: Date.now() - start,
//     });

//   } catch (err) {
//     console.error("[EMAIL-SYNC ERROR]", err.response?.data || err.message);
//     res.status(500).json({ error: "Failed to fetch emails" });
//   }
// };

exports.getEmails = async (req, res) => {
  const start = Date.now();

  try {
    const { user_id } = req.params;

    // ==========================
    // GET ACCOUNTS
    // ==========================
    const { data: accounts } = await supabase
      .from("accounts")
      .select("email")
      .eq("user_id", user_id);

    // ==========================
    // GET EMAILS FROM CACHE
    // ==========================
    const { data: emails } = await supabase
      .from("emails")
      .select("*")
      .eq("user_id", user_id)
      .order("created_at", { ascending: false })
      .limit(50);

    // ==========================
    // GROUP EMAILS BY ACCOUNT (this builds "results")
    // ==========================
    const results = (accounts || []).map((acc) => {
      const accountEmails = (emails || []).filter(
        (e) => e.account_email === acc.email
      );

      return {
        email: acc.email,
        unread_count: accountEmails.length,
        emails: accountEmails,
      };
    });

    // ==========================
    // RESPONSE (YOUR TARGET FORMAT)
    // ==========================
    return res.json({
      user_id,
      accounts: results,
      total_time_ms: Date.now() - start,
    });

  } catch (err) {
    console.error("[GET EMAILS ERROR]", err.message);

    return res.status(500).json({
      error: "Failed to fetch emails",
    });
  }
};
// ==========================
// SINGLE EMAIL
// ==========================
exports.getMessageById = async (req, res) => {
  const start = startTimer();

  try {
    const { user_id, email, message_id } = req.params;

    log("Fetching single email", start);

    const { data: accounts } = await supabase
      .from("accounts")
      .select("*")
      .eq("user_id", user_id);

    const account = accounts.find(a => a.email === email);

    if (!account) {
      log("Account not found", start);
      return res.status(404).json({ error: "Account not found" });
    }

    const token = await getValidAccessToken(account);

    const messageRes = await axios.get(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${message_id}?format=full`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    const message = messageRes.data;
    const headers = message.payload.headers;

    const emailData = {
      id: message.id,
      threadId: message.threadId,

      subject: getHeader(headers, "Subject"),
      from: getHeader(headers, "From"),
      to: getHeader(headers, "To"),
      date: getHeader(headers, "Date"),

      snippet: message.snippet,
      category: categorizeEmail(
        getHeader(headers, "From"),
        getHeader(headers, "Subject"),
        message.snippet
      ),
    };

    log("Single email fetched", start);

    res.json(emailData);

  } catch (err) {
    console.error("[EMAIL ERROR]", err.response?.data || err.message);
    res.status(500).json({ error: "Failed to fetch email" });
  }
};

// ==========================
// DEBUG USER
// ==========================
exports.debugUser = async (req, res) => {
  const start = startTimer();

  const { user_id } = req.params;

  log("Debug start", start);

  // RUN BOTH QUERIES IN PARALLEL
  const [accountsRes, inboxRes] = await Promise.all([
    supabase
      .from("accounts")
      .select("*")
      .eq("user_id", user_id),

    supabase
      .from("emails")
      .select("*")
      .eq("user_id", user_id)
      .order("created_at", { ascending: false })
      .limit(50), // IMPORTANT LIMIT FIX
  ]);

  const accounts = accountsRes.data;
  const inbox = inboxRes.data;

  log("Debug loaded", start, {
    accounts: accounts?.length,
    inbox: inbox?.length,
  });

  res.json({
    user_id,
    accounts,
    inbox,
    total: inbox?.length || 0,
    duration_ms: Date.now() - start,
  });
};