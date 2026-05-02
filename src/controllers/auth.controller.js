const querystring = require("querystring");
const axios = require("axios");
const db = require("../db/test_db");
const { addAccount } = require("../db/user.db");
const { v4: uuidv4 } = require("uuid");

// =====================
// APP LOGIN (temporary simple auth)
// =====================
exports.appLogin = (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: "email required" });
  }

  // FIX: use db.users (NOT addAccount.users)
  let user = db.users.find(u => u.email === email);

  if (!user) {
    user = {
      user_id: uuidv4(),
      email,
      created_at: Date.now(),
    };

    db.users.push(user);
  }

  res.json({
    message: "App authenticated",
    user_id: user.user_id,
  });
};

// =====================
// GET GOOGLE AUTH URL
// =====================
exports.getAuthUrl = (req, res) => {
  const { app_user_id } = req.query;

  if (!app_user_id) {
    return res.status(400).json({
      error: "app_user_id is required"
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
      "https://www.googleapis.com/auth/userinfo.profile"
    ].join(" "),
  });

  const url = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;

  res.json({ url });
};

// =====================
// HANDLE CALLBACK
// =====================
exports.handleCallback = async (req, res) => {
  try {
    const { code, state } = req.query;

    const app_user_id = state;

    if (!app_user_id) {
      return res.status(400).json({
        error: "Missing app_user_id"
      });
    }

    // 1. Token exchange
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

    // 2. Profile
    const profile = await axios.get(
      "https://openidconnect.googleapis.com/v1/userinfo",
      {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
        },
      }
    );

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

    // 3. SAVE (multi-account safe)
    const result = addAccount(app_user_id, accountData);

    // res.json({
    //   message: "Gmail connected successfully",
    //   app_user_id,
    //   account: accountData,
    // });
    return res.redirect(
      `navisync://auth/callback?status=success`
    );

  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: "Auth failed" });
  }
};