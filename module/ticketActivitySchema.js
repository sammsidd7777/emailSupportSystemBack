
const mongoose = require("mongoose");

const TicketActivitySchema = new mongoose.Schema(
  {
    TicketId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ticket",
      required: true,
    },

    ActorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    Action: {
      type: String,
      required: true,
      enum: [
        "ticket_created",
        "status_changed",
        "priority_changed",
        "assigned",
        "ticket_resolved",
        "ticket_closed",
      ],
    },

    OldValue: {
      type: String,
      default: null,
    },

    NewValue: {
      type: String,
      default: null,
    },

    Metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "TICKETACTIVITY",
  TicketActivitySchema
);
