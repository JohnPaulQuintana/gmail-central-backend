const router = require("express").Router();
const gmailController = require("../controllers/gmail.controller");

// ALL UNREAD EMAILS (ALL ACCOUNTS)
router.get("/:user_id/emails", gmailController.getEmails);

// SINGLE EMAIL (FIXED)
router.get("/:user_id/:email/message/:message_id", gmailController.getMessageById);

// DEBUG
router.get("/debug/:user_id", gmailController.debugUser);

module.exports = router;