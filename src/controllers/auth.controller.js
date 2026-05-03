const querystring = require("querystring");
const axios = require("axios");
// const db = require("../db/test_db");
// const { addAccount } = require("../db/user.db");
// const { v4: uuidv4 } = require("uuid");
// DATABASE SUPABASE
const supabase = require("../db/supabase");
const { syncUserEmails } = require("../services/gmailSync.service");
// =====================
// APP LOGIN (temporary simple auth)
// =====================
exports.appLogin = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: "email required" });
  }

  // find user
  let { data: user } = await supabase
    .from("users")
    .select("*")
    .eq("email", email)
    .single();

  // create if not exists
  if (!user) {
    const { data: newUser } = await supabase
      .from("users")
      .insert([{ email }])
      .select()
      .single();

    user = newUser;
  }

  res.json({
    message: "App authenticated",
    user_id: user.id,
  });
};

// =====================
// GET GOOGLE AUTH URL
// =====================
exports.getAuthUrl = (req, res) => {
  const { app_user_id } = req.query;

  if (!app_user_id) {
    return res.status(400).json({
      error: "app_user_id is required",
    });
  }

  const params = querystring.stringify({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: process.env.GOOGLE_REDIRECT_URI,
    response_type: "code",
    access_type: "offline",
    prompt: "consent",

    // pass identity through OAuth flow
    state: app_user_id,

    scope: [
      "https://www.googleapis.com/auth/gmail.readonly",
      "openid",
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile",
    ].join(" "),
  });

  const url = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;

  res.json({ url });
};

// =====================
// HANDLE CALLBACK
// =====================
exports.handleCallback = async (req, res) => {
  const startTime = Date.now();

  const log = (step, extra = "") => {
    console.log(`[NAVISYNC] ${step} +${Date.now() - startTime}ms`, extra);
  };

  try {
    const { code, state } = req.query;
    const app_user_id = state;

    log("Callback received", { app_user_id });

    if (!app_user_id) {
      log("ERROR: Missing app_user_id");
      return res.status(400).json({ error: "Missing app_user_id" });
    }

    // =====================
    // 1. TOKEN EXCHANGE
    // =====================
    log("Starting token exchange");

    const tokenRes = await axios.post(
      "https://oauth2.googleapis.com/token",
      querystring.stringify({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: process.env.GOOGLE_REDIRECT_URI,
        grant_type: "authorization_code",
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const tokens = tokenRes.data;

    log("Token exchange done");

    // =====================
    // 2. GET PROFILE
    // =====================
    log("Fetching Google profile");

    const profile = await axios.get(
      "https://openidconnect.googleapis.com/v1/userinfo",
      {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
        },
      }
    );

    log("Profile fetched", profile.data.email);

    // =====================
    // 3. BUILD ACCOUNT
    // =====================
    const accountData = {
      google_id: profile.data.sub,
      email: profile.data.email,
      name: profile.data.name,
      picture: profile.data.picture,

      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,

      scope: tokens.scope,
      token_type: tokens.token_type,
      expiry_date: Date.now() + tokens.expires_in * 1000,

      is_active: true,
    };

    // =====================
    // 4. SAVE TO SUPABASE
    // =====================
    log("Saving to Supabase");

    const { data, error } = await supabase.from("accounts").insert([
      {
        user_id: app_user_id,
        ...accountData,
      },
    ]);

    if (error) {
      log("SUPABASE ERROR", error);
      throw error;
    }

    log("Saved successfully");

    // after saving account
    syncUserEmails(app_user_id); // FIRE AND FORGET

    // =====================
    // 5. REDIRECT BACK TO APP
    // =====================
    log("Redirecting to app");

    return res.redirect(`navisync://callback?status=success`);

  } catch (err) {
    console.error("[NAVISYNC ERROR]", err.response?.data || err.message);

    return res.status(500).json({
      error: "Auth failed",
    });
  }
};
