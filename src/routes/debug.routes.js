const router = require("express").Router();

router.get("/db", (req, res) => {
  const db = require("../db/test_db");
  res.json(db);
});

module.exports = router;