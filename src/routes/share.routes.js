const router = require("express").Router();
const shareController = require("../controllers/share.controller");

router.post("/captured", shareController.shared);

module.exports = router;
