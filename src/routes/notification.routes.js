const router = require("express").Router();
const notificationController = require("../controllers/notification.controller");

// App auth (NEW)
router.post("/captured", notificationController.captured);
router.get("/history", notificationController.getNotifications);

module.exports = router;