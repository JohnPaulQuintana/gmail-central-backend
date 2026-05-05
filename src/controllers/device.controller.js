const querystring = require("querystring");
const axios = require("axios");
// DATABASE SUPABASE
const supabase = require("../db/supabase");

// =====================
// REGISTER DEVICE
// =====================
exports.registerDevice = async (req, res) => {
  const {
    user_id,
    device_id,
    platform,
    device_name,
    app_version
  } = req.body;

  // basic validation
  if (!user_id || !device_id || !platform) {
    return res.status(400).json({
      error: "user_id, device_id, and platform are required"
    });
  }

  try {
    // upsert = prevents duplicates for same user + device
    const { data, error } = await supabase
      .from("devices")
      .upsert(
        [
          {
            user_id,
            device_id,
            platform,
            device_name: device_name || null,
            app_version: app_version || null,
            is_active: true,
            last_seen: new Date()
          }
        ],
        {
          onConflict: "user_id,device_id"
        }
      )
      .select()
      .single();

    if (error) {
      console.error("Device register error:", error);
      return res.status(500).json({ error: error.message });
    }

    return res.json({
      message: "Device registered successfully",
      device: data
    });

  } catch (err) {
    console.error("Unexpected error:", err);
    return res.status(500).json({
      error: "Internal server error"
    });
  }
};