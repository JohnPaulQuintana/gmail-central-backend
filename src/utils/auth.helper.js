const axios = require("axios");
const querystring = require("querystring");

// =====================
// REFRESH TOKEN
// =====================
exports.refreshAccessToken = async (refresh_token) => {
  const res = await axios.post(
    "https://oauth2.googleapis.com/token",
    querystring.stringify({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token,
      grant_type: "refresh_token",
    }),
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );

  return {
    access_token: res.data.access_token,
    expiry_date: Date.now() + res.data.expires_in * 1000,
  };
};

// =====================
// GET VALID TOKEN
// =====================
exports.getValidAccessToken = async (account) => {
  if (Date.now() < account.expiry_date) {
    return account.access_token;
  }

  console.log("🔄 Token expired, refreshing...");

  const refreshed = await exports.refreshAccessToken(account.refresh_token);

  // update account locally
  account.access_token = refreshed.access_token;
  account.expiry_date = refreshed.expiry_date;

  return account.access_token;
};