require("dotenv").config();
const express = require("express");
const cors = require("cors");

const authRoutes = require("./src/routes/auth.routes");
const notificationRoutes = require("./src/routes/notification.routes");
const gmailRoutes = require("./src/routes/gmail.routes");
const debugRoutes = require("./src/routes/debug.routes");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/auth", authRoutes);
app.use("/notification", notificationRoutes);
app.use("/gmail", gmailRoutes);
app.use("/debug", debugRoutes);

app.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});