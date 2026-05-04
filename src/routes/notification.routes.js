const router = require("express").Router();
const notificationController = require("../controllers/notification.controller");

// App auth (NEW)
router.post("/captured", notificationController.captured);

module.exports = router;