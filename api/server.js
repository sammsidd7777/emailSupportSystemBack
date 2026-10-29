
const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");

const connectDB = require("../db/ConnectDb");
const errorMiddleware = require("../middleware/errorHandle");

const authRoute = require("../router/authRoute");
const ticketRoute = require("../router/ticketRoute");
const adminRoute = require("../router/adminRoute");
const agentRoute = require("../router/agentRoute");
const userRoute = require("../router/userRoute");
const messageRoute = require("../router/messageRoute");
const aiRoute = require("../router/ai.routes")

const pushRoutes = require("../router/pushRoutes");


const app = express();

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://email-support-theta.vercel.app",
      process.env.CLIENT_URL,
    ].filter(Boolean),
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

// Health check
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Email Support Backend API is running",
  });
});

// Database connection
app.use(async (req, res, next) => {
  try {
    await connectDB(process.env.MONGOURL);
    next();
  } catch (error) {
    next(error);
  }
});

// API routes
app.use("/api/auth", authRoute);
app.use("/api/tickets", ticketRoute);
app.use("/api/admin", adminRoute);
app.use("/api/agent", agentRoute);
// Keep the previous singular path working while clients migrate to /api/users.
app.use("/api/user", userRoute);
app.use("/api/users", userRoute);
app.use("/api/messages", messageRoute);
app.use("/api/push", pushRoutes);
app.use("/api/ai",aiRoute);


// Error handler must be last
app.use(errorMiddleware);

// Export Express app for Vercel
if (require.main === module) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Email Support Backend API listening on port ${port}`);
  });
}

module.exports = app;
