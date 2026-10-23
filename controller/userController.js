
const TICKET = require("../module/ticketSchema");
const TICKETMESSAGE = require("../module/ticketMessageSchema");
const AppError = require("../utils/AppError");

const userReplyToTicket = async (req, res, next) => {
  try {
    const { ticketId } = req.params;
    const { message } = req.body;
    const userId = req.user?._id;

    // 1. Authentication check
    if (!userId) {
      return next(new AppError("Authentication required.", 401));
    }

    // 2. Validate message
    if (typeof message !== "string" || !message.trim()) {
      return next(new AppError("Reply message is required.", 400));
    }

    // 3. Find ticket belonging to this customer
    const ticket = await TICKET.findOne({
      _id: ticketId,
      RequesterId: userId, // Apne Ticket schema ka actual field name use karein
    });

    if (!ticket) {
      return next(
        new AppError("Ticket not found or you do not own this ticket.", 404)
      );
    }

    // 4. Check ticket status
    if (
      ["resolved", "closed"].includes(
        String(ticket.Status || "").toLowerCase()
      )
    ) {
      return next(
        new AppError("Cannot reply to a closed or resolved ticket.", 400)
      );
    }

    // 5. Find existing conversation
    const conversation = await TICKETMESSAGE.findOne({
      TicketId: ticket._id,
    });

    if (!conversation) {
      return next(
        new AppError("Conversation not found for this ticket.", 404)
      );
    }

    // 6. Add message to the existing conversation
    conversation.Messages.push({
      SenderId: userId,
      SenderEmail: req.user.Email, // Apne User schema ke field ke according
      SenderRole: "customer",
      Body: message.trim(),
      Source: "web",
      Type: "public",
    });

    await conversation.save();

    // 7. Response
    return res.status(201).json({
      success: true,
      message: "Your reply has been added successfully.",
      data: conversation,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = { userReplyToTicket };