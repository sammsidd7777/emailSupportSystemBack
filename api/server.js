
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
app.use("/api/user", userRoute);
app.use("/api/messages", messageRoute);

// Error handler must be last
app.use(errorMiddleware);

// Export Express app for Vercel
module.exports = app;
