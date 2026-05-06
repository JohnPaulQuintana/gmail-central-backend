const supabase = require("../db/supabase");

exports.shared = async (req, res) => {
    const startTime = Date.now();
    try {
        console.log("\n==================== NEW REQUEST ====================");
        console.log("Time:", new Date().toISOString());

        const shared = req.body;

        console.log(shared)
    } catch (error) {
        
    }
}