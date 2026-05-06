const supabase = require("../db/supabase");

exports.shared = async (req, res) => {
    const startTime = Date.now();

    try {
        console.log("\n==================== NEW REQUEST ====================");
        console.log("Time:", new Date().toISOString());

        const { text, source, time, userId, deviceId } = req.body;

        console.log(req.body);

        // 🔥 BASIC VALIDATION
        if (!text || !userId || !deviceId) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields"
            });
        }

        // 🔥 SAVE TO DB (optional but recommended)
        // const { error } = await supabase
        //     .from("shared_receipts")
        //     .insert([
        //         {
        //             text,
        //             source,
        //             time,
        //             user_id: userId,
        //             device_id: deviceId
        //         }
        //     ]);

        // if (error) {
        //     console.error("DB ERROR:", error);

        //     return res.status(500).json({
        //         success: false,
        //         message: "Database insert failed"
        //     });
        // }

        const duration = Date.now() - startTime;

        console.log("Saved successfully in", duration, "ms");

        // ✅ IMPORTANT: SUCCESS RESPONSE
        return res.status(200).json({
            success: true,
            message: "Received",
            duration
        });

    } catch (error) {
        console.error("SERVER ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};