
const mongoose = require("mongoose");

let isConnecting;

async function connectDB(uri) {
  if (!uri) {
    throw new Error("MONGOURL environment variable is missing");
  }

  // Reuse an existing connection
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  // Reuse an ongoing connection attempt
  if (!isConnecting) {
    isConnecting = mongoose
      .connect(uri)
      .then(() => {
        console.log("MongoDB connected successfully");
        return mongoose.connection;
      })
      .finally(() => {
        isConnecting = null;
      });
  }

  return isConnecting;
}

module.exports = connectDB;
