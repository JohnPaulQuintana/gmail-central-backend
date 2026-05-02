const router = require("express").Router();
const authController = require("../controllers/auth.controller");

// App auth (NEW)
router.post("/login", authController.appLogin);

// Gmail OAuth start
router.get("/google", authController.getAuthUrl);

// OAuth callback
router.get("/callback", authController.handleCallback);

module.exports = router;