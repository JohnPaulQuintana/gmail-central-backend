const router = require("express").Router();
const supabase = require("../db/supabase");


router.get("/db", (req, res) => {
  const db = require("../db/test_db");
  res.json(db);
});

// test connection on db
router.get("/test-supabase", async (req, res) => {
  const { data, error } = await supabase.from("users").select("*");

  res.json({ data, error });
});

module.exports = router;