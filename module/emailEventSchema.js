
const mongoose = require("mongoose");

const EmailEventSchema = new mongoose.Schema(
  {
    ProviderMessageId: {
      type: String,
      default: null,
      index: true,
    },

    MessageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TicketMessage",
      default: null,
    },

    TicketId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ticket",
      default: null,
    },

    Direction: {
      type: String,
      enum: ["inbound", "outbound"],
      required: true,
    },

    Status: {
      type: String,
      enum: [
        "queued",
        "sent",
        "delivered",
        "failed",
        "received",
        "processed",
      ],
      required: true,
    },

    Error: {
      type: String,
      default: null,
    },

    ProcessedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("EMAILEVENT", EmailEventSchema);
