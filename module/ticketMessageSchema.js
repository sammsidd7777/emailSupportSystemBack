const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    SenderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "USER",
    },
    SenderEmail: {
      type: String,
      lowercase: true,
      required: true,
    },
    SenderRole: {
      type: String,
      enum: ["admin", "customer", "supportAgent","ai"],
      required: true,
    },
    Body: {
      type: String,
      required: true,
    },
    Source: {
      type: String,
      enum: ["web", "email"],
      default: "web",
    },
    Type: {
      type: String,
      enum: ["public", "internal"],
      default: "public",
    },
  },
  { timestamps: true }
);

const ticketMessageSchema = new mongoose.Schema(
  {
    TicketId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TICKET",
      required: true,
      unique: true,
    },

    TicketNumber:{
      type:String,
    },
    Messages: [messageSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model("TICKETMESSAGE", ticketMessageSchema);