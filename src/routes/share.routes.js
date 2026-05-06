const router = require("express").Router();
const shareController = require("../controllers/share.controller");

router.post("/captured", shareController.shared);
router.post("/transactions", shareController.getTransactions);

module.exports = router;
