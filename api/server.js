
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
      process.env.CLIENT_URL,
    ].filter(Boolean),
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Backend API is running",
  });
});

// Connect to MongoDB before handling API routes
app.use(async (req, res, next) => {
  try {
    await connectDB(process.env.MONGOURL);
    next();
  } catch (error) {
    next(error);
  }
});

// Existing routes
// app.use("/api/user", userRoute);
// app.use("/api/auth", authRoute);
// app.use("/api/tickets", ticketRoute);
// app.use("/api/admin", adminRoute);
// app.use("/api/agent", agentRoute);
// app.use("/api/messages", messageRoute);

app.use("/",res.status(200).json({
  message:"hii api is working"
}))

// Error handler last
app.use(errorMiddleware);

module.exports = app;
