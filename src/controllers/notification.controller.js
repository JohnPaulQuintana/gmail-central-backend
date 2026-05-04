exports.captured = async (req, res) => {
    try {
        console.log("- NAVISYNC NOTIFICATION RECEIVED:");
        console.log(req.body);

        const { package: pkg, title, text, time } = req.body;

        console.log("APP:", pkg);
        console.log("TITLE:", title);
        console.log("TEXT:", text);
        console.log("TIME:", time);

        return res.status(200).json({
            success: true,
            message: "Notification received",
        });

    } catch (error) {
        console.error("ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};