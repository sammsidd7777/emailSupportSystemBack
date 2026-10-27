
const USER = require("../module/userSchema");
const TICKET = require("../module/ticketSchema");
const AppError = require("../utils/AppError");
const TICKETMESSAGE = require("../module/ticketMessageSchema");
const mongoose = require("mongoose");


// 1. Get tickets assigned to the logged-in agent
 const getMyAssignedTickets = async (req, res, next) => {
  try {
    const agentId = req.user?._id;

    if (!agentId) {
      return next(
        new AppError("Authentication required.", 401)
      );
    }

    const agent = await USER.findById(agentId);

    if (!agent) {
      return next(
        new AppError("Agent not found.", 404)
      );
    }

    if (agent.Role !== "supportAgent") {
      return next(
        new AppError(
          "Access denied. Only support agents can view assigned tickets.",
          403
        )
      );
    }

    // Fetch all tickets assigned to this agent
    const tickets = await TICKET.find({
      AssignedTo: agentId,
    }).sort({ createdAt: -1 });

    // Calculate ticket counts by status
    const stats = {
      total: tickets.length,
      open: 0,
      progress: 0,
      resolved: 0,
      closed: 0,
    };

    tickets.forEach((ticket) => {
      const status = String(ticket.Status || "open")
        .trim()
        .toLowerCase()
        .replace(/[_-]+/g, " ")
        .replace(/\s+/g, " ");

      if (status === "open") {
        stats.open++;
      } else if (
        ["progress", "in progress", "inprogress"].includes(status)
      ) {
        stats.progress++;
      } else if (status === "resolved") {
        stats.resolved++;
      } else if (status === "closed") {
        stats.closed++;
      }
    });

    return res.status(200).json({
      success: true,
      count: tickets.length,
      stats,
      tickets,
    });
  } catch (error) {
    return next(error);
  }
};

// 2. Get details of one ticket assigned to this agent



const getAgentTicketById = async (req, res, next) => {
  try {
    const { ticketId } = req.params;
    const agentId = req.user?._id;

    if (!agentId) {
      return next(new AppError("Authentication required.", 401));
    }

    if (!mongoose.Types.ObjectId.isValid(ticketId)) {
      return next(new AppError("Invalid ticket ID.", 400));
    }

    const agent = await USER.findById(agentId);

    if (!agent) {
      return next(new AppError("Agent not found.", 404));
    }

    const ticket = await TICKET.findById(ticketId)
      .populate("AssignedTo", "Name Email Role")
      .lean();

    if (!ticket) {
      return next(new AppError("Ticket not found.", 404));
    }

    const assignedAgentId = ticket.AssignedTo?._id || ticket.AssignedTo;

    if (!assignedAgentId || String(assignedAgentId) !== String(agent._id)) {
      return next(
        new AppError("Ticket is not assigned to this agent.", 403)
      );
    }

    // Find the message document and its nested Messages array
    const ticketMessage = await TICKETMESSAGE.findOne({
      TicketId: ticket._id,
    }).lean();

    return res.status(200).json({
      success: true,
      message: "Ticket fetched successfully.",
      ticket: {
        ...ticket,
        Messages: ticketMessage?.Messages || [],
      },
    });
  } catch (error) {
    return next(error);
  }
};


// 3. Reply to an assigned ticket
 
const replyToTicketByAgent = async (req, res, next) => {
  try {
    const { ticketId } = req.params;
    const { message } = req.body;
    const agentId = req.user?._id;


    console.log(ticketId , message ,agentId ,"data come")

    if (!agentId) {
      return next(new AppError("Authentication required.", 401));
    }

    if (typeof message !== "string" || !message.trim()) {
      return next(new AppError("Reply message is required.", 400));
    }

    const ticket = await TICKET.findOne({
      _id: ticketId,
      AssignedTo: agentId,
    });

    if (!ticket) {
      return next(
        new AppError("Ticket not found or not assigned to you.", 404)
      );
    }

    if (["resolved", "closed"].includes(
      String(ticket.Status || "").toLowerCase()
    )) {
      return next(
        new AppError("Cannot reply to a closed or resolved ticket.", 400)
      );
    }

    // Find the existing conversation for this ticket
    const conversation = await TICKETMESSAGE.findOne({
      TicketId: ticket._id,
    });

    if (!conversation) {
      return next(
        new AppError("Conversation not found for this ticket.", 404)
      );
    }

    // Add reply to the existing document
    conversation.Messages.push({
      SenderId: agentId,
      SenderEmail: req.user.Email, // Use your actual User email field
      SenderRole: "supportAgent",
      Body: message.trim(),
      Source: "web",
      Type: "public",
    });

    await conversation.save();

    return res.status(201).json({
      success: true,
      message: "Reply added successfully.",
      data: conversation,
    });
  } catch (error) {
    return next(error);
  }
};

// 4. Update status of an assigned ticket
 const updateTicketStatus = async (req, res, next) => {
  try {
    const { ticketId } = req.params;
    const { status } = req.body;
    const agentId = req.user?._id;

    console.log(ticketId, status, agentId, "updateTicketStatus params");

    if (!agentId) {
      return next(new AppError("Authentication required.", 401));
    }

    const allowedStatuses = [
      "open",
      "progress",
      "resolved",
      "closed",
    ];

    if (
      typeof status !== "string" ||
      !allowedStatuses.includes(status.toLowerCase())
    ) {
      return next(
        new AppError(
          "Invalid status. Use open, in progress, or resolved.",
          400
        )
      );
    }

    const ticket = await TICKET.findOne({
      _id: ticketId,
      AssignedTo: agentId,
    });

    if (!ticket) {
      return next(
        new AppError("Ticket not found or not assigned to you.", 404)
      );
    }

    ticket.Status = status.toLowerCase();

    await ticket.save();

    return res.status(200).json({
      success: true,
      message: "Ticket status updated successfully.",
      ticket,
    });
  } catch (error) {
    return next(error);
  }
};

// 5. Get logged-in agent profile
 const getAgentProfile = async (req, res, next) => {
  try {
    const agentId = req.user?._id;

    if (!agentId) {
      return next(new AppError("Authentication required.", 401));
    }

    const agent = await USER.findById(agentId).select("-password -otp");

    if (!agent) {
      return next(new AppError("Agent not found.", 404));
    }

    return res.status(200).json({
      success: true,
      agent,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getMyAssignedTickets,
  getAgentTicketById,
  replyToTicketByAgent,
  updateTicketStatus,
  getAgentProfile,
};