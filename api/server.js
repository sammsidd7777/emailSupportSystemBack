const dotenv = require("dotenv");
dotenv.config(); // sabse upar, baaki sab se pehle

const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const connectDB = require("../db/ConnectDb");
const errorMiddleware = require("../middleware/errorHandle");

const authRoute = require("../router/authRoute");
const ticketRoute = require("../router/ticketRoute");
const adminRoute = require("../router/adminRoute");
const agentRoute = require("../router/agentRoute");
const userRoute = require('../router/userRoute')
const PORT = process.env.PORT || 8000; // 5000 avoid karo (Mac AirPlay)

const app = express();

// 1. CORS sabse pehle
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

// 2. Body + cookies
app.use(express.json());
app.use(cookieParser());

// 3. Routes
app.use("/api/user",userRoute);
app.use("/api/auth", authRoute);
app.use("/api/tickets", ticketRoute);
app.use("/api/admin", adminRoute);
app.use("/api/agent", agentRoute);
app.use("/api/messages", require("../router/messageRoute")); // Use the message route
 // Agent route

// 4. Error handler hamesha last mein
app.use(errorMiddleware);

// 5. Pehle DB connect, phir server start
const startServer = async () => {
  try {
    await connectDB(process.env.MONGOURL);
    app.listen(PORT, () => {
      console.log(`Server running on ${PORT}`);
    });
  } catch (error) {
    console.log("Server start failed:", error.message);
    process.exit(1);
  }
};

startServer();