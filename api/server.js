
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
const aiRoute = require("../router/ai.routes");
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

// API routes
app.use("/api/auth", authRoute);
app.use("/api/tickets", ticketRoute);
app.use("/api/admin", adminRoute);
app.use("/api/agent", agentRoute);
app.use("/api/user", userRoute);
app.use("/api/users", userRoute);
app.use("/api/messages", messageRoute);
app.use("/api/push", pushRoutes);
app.use("/api/ai", aiRoute);

// Error handler must be last
app.use(errorMiddleware);

// Export Express app for Vercel
module.exports = app;

// Local server startup
if (require.main === module) {
  const startServer = async () => {
    try {
      if (!process.env.EMAIL_MONGO_URI) {
        throw new Error("EMAIL_MONGO_URI is missing in environment variables");
      }

      // Connect MongoDB before starting server
      await connectDB(process.env.EMAIL_MONGO_URI);

      const PORT = process.env.PORT || 3000;

      app.listen(PORT, () => {
        console.log(
          `Email Support Backend API running on port ${PORT}`
        );
      });

    } catch (error) {
      console.error("Server startup failed:", error.message);
      process.exit(1);
    }
  };

  startServer();
}
