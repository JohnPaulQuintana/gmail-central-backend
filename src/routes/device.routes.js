const router = require("express").Router();
const deviceController = require("../controllers/device.controller");

// App auth (NEW)
router.post("/register", deviceController.registerDevice);

module.exports = router;