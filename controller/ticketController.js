const AppError = require("../utils/AppError");
const USER = require("../module/userSchema");
const TICKET = require("../module/ticketSchema");
const sendTestEmail = require("../testEmail");
const TICKETMESSAGE = require("../module/ticketMessageSchema");

const createTicket = async (req, res, next) => {
  try {
    const { Subject, Description, Priority } = req.body;

    console.log(Subject, Description, Priority, "datacoming");
    const id = req.user?._id;

    // 1. Validate required fields
    if (!Subject || !Description || !Priority) {
      return next(new AppError("Some details are missing", 400));
    }

    // 2. Find logged-in user
    const user = await USER.findById(id);

    if (!user) {
      return next(new AppError("User not found", 404));
    }

    // 3. Generate ticket number
    const totalTicket = await TICKET.countDocuments();

    const TicketNum = `TKT-${10001 + totalTicket}`;

    // 4. Create ticket in MongoDB
    const ticket = await TICKET.create({
      TicketNumber: TicketNum,
      Subject,
      Description,
      Priority,
      RequesterId: id,
      RequesterEmail: user.Email,
      Status: "open",
    });

    const newMessage = await TICKETMESSAGE.create({
      TicketId: ticket._id,
      SourceSenderId: req.user._id,
      SenderEmail: req.user.Email,
      SenderRole: req.user.Role,
      Body: Description,
      Source: "web",
      Type: "public",
    });

    // 5. Send response
    return res.status(201).json({
      success: true,
      message: "Ticket created successfully",
      ticket,
      newMessage,
    });
  } catch (error) {
    return next(error);
  }
};

const myTicketList = async (req, res, next) => {
  try {
    // 1. Get logged-in user ID
    const id = req.user?._id;

    console.log(req.user, "myTicketlist");

    // 2. Find user
    const user = await USER.findById(id);

    if (!user) {
      return next(new AppError("User not found", 404));
    }

    // 3. Find tickets created by this user
    const List = await TICKET.find({
      $or: [{ RequesterId: id }, { RequesterEmail: user.Email }],
    }).sort({ createdAt: -1 });

    // 4. Check if tickets exist
    if (List.length === 0) {
      return res.status(200).json({
        success: true,
        message: "You have not created any tickets yet",
        tickets: [],
      });
    }

    // 5. Send response
    return res.status(200).json({
      success: true,
      message: "Tickets fetched successfully",
      tickets: List,
    });
  } catch (error) {
    return next(error);
  }
};


const getTicketById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new AppError("Invalid ticket ID", 400));
    }

    const ticket = await TICKET.findById(id);

    if (!ticket) {
      return next(new AppError("Ticket not found", 404));
    }

    // Fetch the existing conversation from MongoDB
    const conversation = await TICKETMESSAGE.findOne({
      TicketId: ticket._id,
    });

    // Attach the message array to the ticket response
    const ticketData = ticket.toObject();

    ticketData.Messages = conversation?.Messages || [];

    return res.status(200).json({
      success: true,
      message: "Ticket fetched successfully",
      ticket: ticketData,
    });
  } catch (error) {
    next(error);
  }
};

const assignTicket = async (req, res, next) => {
  try {
    const { ticketId } = req.params;
    const { agentId } = req.body;

    if (!agentId) {
      return next(new AppError("Agent ID is required", 400));
    }

    console.log(ticketId, agentId, "assignTicket params");

    // Find ticket and selected agent
    const ticket = await TICKET.findById(ticketId);
    if (!ticket) {
      return next(new AppError("Ticket not found", 404));
    }

    const agent = await USER.findById(agentId);
    if (!agent) {
      return next(new AppError("Agent not found", 404));
    }

    // // Validate agent role
    // if (agent.Role !== "supportAgent") {
    //   return next(
    //     new AppError("Selected user is not a support agent", 403)
    //   );
    // }

    // Validate category compatibility
    // if (
    //   String(ticket.Category || "").trim().toLowerCase() !==
    //   String(agent.AgentRole || "").trim().toLowerCase()
    // ) {
    //   return next(
    //     new AppError(
    //       "Ticket category does not match the agent's category",
    //       403
    //     )
    //   );
    // }

    // Optional: prevent assigning a closed ticket
    const currentStatus = String(ticket.Status || "")
      .toLowerCase()
      .replaceAll("_", " ")
      .trim();

    if (["resolved", "closed"].includes(currentStatus)) {
      return next(
        new AppError("Cannot assign a resolved or closed ticket", 400),
      );
    }

    // Assign ticket
    ticket.Status = "in_progress";
    ticket.AssignedTo = agent._id;
    ticket.Assigned = true;

    await ticket.save();

  // Send assignment notification emails to both agent and customer
const notifications = [
  {
    to: agent.Email,
    subject: `New Ticket Assigned: ${ticket.TicketNumber}`,
    text: `
Hello ${agent.Name || "Support Agent"},

A new support ticket has been assigned to you.

Ticket Number: ${ticket.TicketNumber}
Subject: ${ticket.Subject}

Please log in to your support dashboard to review and respond to the ticket.

Regards,
Support Team
    `.trim(),
  },
  {
    to: ticket.RequesterEmail,
    subject: `Your Ticket Has Been Assigned: ${ticket.TicketNumber}`,
    text: `
Hello ${ticket.RequesterName || "Customer"},

Your support ticket has been successfully assigned to a support agent.

Ticket Number: ${ticket.TicketNumber}
Subject: ${ticket.Subject}

Our support agent will review your issue and respond as soon as possible.

Thank you for contacting our support team.

Regards,
Support Team
    `.trim(),
  },
];

// Email failures should not undo the successful ticket assignment
const emailResults = await Promise.allSettled(
  notifications.map(async (email) => {
    if (!email.to) {
      throw new Error("Recipient email is missing");
    }

    return sendTestEmail(email);
  }),
);

emailResults.forEach((result, index) => {
  if (result.status === "fulfilled") {
    console.log(`Email sent to ${notifications[index].to}`);
  } else {
    console.error(
      `Failed to send email to ${notifications[index].to}:`,
      result.reason?.message || result.reason,
    );
  }
});

    // Return populated agent details
    const updatedTicket = await TICKET.findById(ticket._id).populate(
      "AssignedTo",
      "Name Email AgentRole Role",
    );

    return res.status(200).json({
      success: true,
      message: "Ticket assigned to agent successfully",
      ticket: updatedTicket,
      notificationsSent: emailResults.filter(
        (result) => result.status === "fulfilled",
      ).length,
    });
  } catch (error) {
    return next(error);
  }
};

const allTicket = async (req, res, next) => {
  try {
    // 1. Get logged-in user ID
    console.log(req?.user, "user");
    const id = req.user?._id || req?.user.id;

    if (!id) {
      return next(new AppError("User not authenticated", 401));
    }

    // 2. Find user
    const user = await USER.findById(id);

    if (!user) {
      return next(new AppError("User not found", 404));
    }

    let totalTicket = [];
    let assignTicket = [];
    let unAssinTicket = [];

    // 3. Admin can see all tickets
    if (user.Role === "admin") {
      totalTicket = await TICKET.find();

      assignTicket = totalTicket.filter((ticket) => ticket.AssignedTo);

      unAssinTicket = totalTicket.filter((ticket) => !ticket.AssignedTo);
    }

    // 4. Customer can see only their own tickets
    else if (user.Role === "customer") {
      totalTicket = await TICKET.find({
        RequesterId: id,
      });

      assignTicket = totalTicket.filter((ticket) => ticket.AssignedTo);

      unAssinTicket = totalTicket.filter((ticket) => !ticket.AssignedTo);
    }

    // 5. Support agent sees tickets assigned to them
    else if (user.Role === "supportAgent") {
      totalTicket = await TICKET.find({
        AssignedTo: id,
      });

      assignTicket = totalTicket;
      unAssinTicket = [];
    } else {
      return next(new AppError("Invalid user role", 403));
    }

    // 6. Response
    return res.status(200).json({
      success: true,
      totalCount: totalTicket.length,
      assignedCount: assignTicket.length,
      unassignedCount: unAssinTicket.length,
      totalTicket,
      assignTicket,
      unAssinTicket,
    });
  } catch (error) {
    return next(error);
  }
};

const unassignedTickets = async (req, res, next) => {
  try {
    // 1. Get logged-in user ID
    const id = req.user?._id;

    if (!id) {
      return next(new AppError("User not authenticated", 401));
    }

    const user = await USER.findById(id);

    if (!user) {
      return next(new AppError("User not found", 404));
    }

    // 2. Admin can see all unassigned tickets
    let unAssinTicket = [];

    if (user.Role === "admin") {
      unAssinTicket = await TICKET.find({
        AssignedTo: { $exists: false },
      });
    }

    // 3. Customer can see only their own unassigned tickets
    else if (user.Role === "customer") {
      unAssinTicket = await TICKET.find({
        RequesterId: id,
        AssignedTo: { $exists: false },
      });
    }

    // 4. Support agent sees unassigned tickets in their category
    else if (user.Role === "supportAgent") {
      unAssinTicket = await TICKET.find({
        AssignedTo: { $exists: false },
        Category: user.Category,
      });
    } else {
      return next(new AppError("Invalid user role", 403));
    }

    return res.status(200).json({
      success: true,
      unassignedCount: unAssinTicket.length,
      unAssinTicket,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createTicket,
  myTicketList,
  assignTicket,
  allTicket,
  getTicketById,
  unassignedTickets,
};
