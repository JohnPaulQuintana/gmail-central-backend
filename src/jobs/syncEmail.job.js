const { syncUserEmails } = require("../services/gmailSync.service");

const runSyncJob = async (user_id) => {
  console.log("[JOB] Sync triggered", user_id);
  await syncUserEmails(user_id);
};

module.exports = { runSyncJob };