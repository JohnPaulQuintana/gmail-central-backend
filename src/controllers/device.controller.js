const querystring = require("querystring");
const axios = require("axios");
// DATABASE SUPABASE
const supabase = require("../db/supabase");
exports.registerDevice = async (req, res) => {
  const { user_id, device_id, platform } = req.body;

  if (!user_id || !device_id) {
    return res.status(400).json({ error: "missing fields" });
  }

  const { data, error } = await supabase
    .from("devices")
    .upsert([
      {
        user_id,
        device_id,
        platform,
        updated_at: new Date()
      }
    ]);

  if (error) return res.status(500).json({ error });

  res.json({
    message: "Device registered",
    device_id
  });
};