const axios = require("axios");
const { getAccounts } = require("../db/user.db");
const { getValidAccessToken } = require("../utils/auth.helper");
const db = require("../db/test_db");

// ==========================
// CATEGORY ENGINE (JOB / RECEIPT / SPAM)
// ==========================
const categorizeEmail = (from = "", subject = "", snippet = "") => {
  const text = `${from} ${subject} ${snippet}`.toLowerCase();

  // ==========================
  // JOB EMAILS
  // ==========================
  const jobKeywords = [
    "linkedin", "indeed", "job", "career", "interview",
    "application", "hired", "position", "recruiter",
    "workday", "greenhouse", "lever", "bamboohr"
  ];

  // ==========================
  // RECEIPTS / TRANSACTIONS
  // ==========================
  const receiptKeywords = [
    "receipt", "invoice", "order", "payment",
    "paid", "transaction", "shopee", "lazada",
    "amazon", "grab", "billing", "order confirmed",
    "order shipped", "maya"
  ];

  // ==========================
  // SPAM / PROMO
  // ==========================
  const spamKeywords = [
    "unsubscribe", "promo", "promotion", "discount",
    "offer", "sale", "marketing", "newsletter",
    "limited time", "win", "free", "crypto"
  ];

  const score = (keywords) =>
    keywords.reduce((acc, kw) => acc + (text.includes(kw) ? 1 : 0), 0);

  const jobScore = score(jobKeywords);
  const receiptScore = score(receiptKeywords);
  const spamScore = score(spamKeywords);

  // strong match first
  if (jobScore >= 2) return "Job";
  if (receiptScore >= 2) return "Receipt";
  if (spamScore >= 2) return "Spam";

  // fallback
  if (jobScore === 1) return "Job";
  if (receiptScore === 1) return "Receipt";
  if (spamScore === 1) return "Spam";

  return "Others";
};

// ==========================
// HEADER HELPER
// ==========================
const getHeader = (headers, name) =>
  headers.find(h => h.name === name)?.value || "";

// ==========================
// SAVE TO LOCAL INBOX DB
// ==========================
const saveInboxEmail = (app_user_id, email) => {
  const user = db.users.find(u => u.user_id === app_user_id);
  if (!user) return;

  if (!user.inbox) user.inbox = [];

  const exists = user.inbox.find(e => e.message_id === email.message_id);
  if (exists) return;

  user.inbox.push({
    ...email,
    read: false,
    created_at: Date.now(),
  });
};

// ==========================
// GET ALL UNREAD EMAILS (ALL ACCOUNTS)
// ==========================
exports.getEmails = async (req, res) => {
  try {
    const { user_id } = req.params;

    const accounts = getAccounts(user_id);
    if (!accounts.length) {
      return res.status(404).json({ error: "No accounts found" });
    }

    const results = [];

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
      const emails = [];

      for (const msg of messages) {
        const detail = await axios.get(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        const data = detail.data;
        const headers = data.payload.headers;

        const emailData = {
          message_id: data.id,
          thread_id: data.threadId,

          from: getHeader(headers, "From"),
          to: getHeader(headers, "To"),
          subject: getHeader(headers, "Subject"),
          date: getHeader(headers, "Date"),
          snippet: data.snippet,

          category: categorizeEmail(
            getHeader(headers, "From"),
            getHeader(headers, "Subject"),
            data.snippet
          ),

          account_email: acc.email,
        };

        saveInboxEmail(user_id, emailData);
        emails.push(emailData);
      }

      results.push({
        email: acc.email,
        unread_count: messages.length,
        emails,
      });
    }

    res.json({
      user_id,
      accounts: results,
    });

  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: "Failed to fetch emails" });
  }
};

// ==========================
// GET SINGLE EMAIL (FIXED)
// ==========================
exports.getMessageById = async (req, res) => {
  try {
    const { user_id, email, message_id } = req.params;

    const accounts = getAccounts(user_id);
    const account = accounts.find(a => a.email === email);

    if (!account) {
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

    res.json(emailData);

  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: "Failed to fetch email" });
  }
};

// ==========================
// DEBUG USER
// ==========================
exports.debugUser = (req, res) => {
  const { user_id } = req.params;

  const user = db.users.find(u => u.user_id === user_id);

  res.json({
    user_id,
    accounts: getAccounts(user_id),
    inbox: user?.inbox || [],
  });
};