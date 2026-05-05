const router = require("express").Router();
const deviceController = require("../controllers/device.controller");

// App auth (NEW)
router.post("/login", deviceController.registerDevice);