const db = require("./test_db");

// =====================
// USERS
// =====================
exports.getOrCreateUser = (user_id, email = null) => {
  let user = db.users.find(u => u.user_id === user_id);

  if (!user) {
    user = {
      user_id,
      email,
      created_at: Date.now(),
    };

    db.users.push(user);
  }

  return user;
};

// =====================
// ADD GMAIL ACCOUNT (FLAT STRUCTURE)
// =====================
exports.addAccount = (app_user_id, accountData) => {
  const account = {
    app_user_id, // 🔥 IMPORTANT LINK TO APP USER

    google_id: accountData.google_id,
    email: accountData.email,
    name: accountData.name,
    picture: accountData.picture,

    access_token: accountData.access_token,
    refresh_token: accountData.refresh_token,

    scope: accountData.scope,
    token_type: accountData.token_type,
    expiry_date: accountData.expiry_date,

    is_active: true,
  };

  // prevent duplicates
  const exists = db.accounts.find(
    acc =>
      acc.app_user_id === app_user_id &&
      acc.email === account.email
  );

  if (!exists) {
    db.accounts.push(account);
  }

  return account;
};

// =====================
// GET ACCOUNTS
// =====================
exports.getAccounts = (app_user_id) => {
  return db.accounts.filter(
    acc => acc.app_user_id === app_user_id
  );
};