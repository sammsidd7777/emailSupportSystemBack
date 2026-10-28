const AppError = require("../utils/AppError");
const USER = require("../module/userSchema");
const TICKET = require("../module/ticketSchema");
const TICKETMESSAGE = require("../module/ticketMessageSchema");
const mongoose = require("mongoose");
const sendEmail = require("../utils/email");

const {
  createAgentAssignmentEmail,
  createCustomerAssignmentEmail,
} = require("../utils/emailTemplates");
const sendPushNotification = require("../utils/sendPushNotification");


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

    // The ticket is already saved. A push failure must not undo it.
sendPushNotification({
  title: "New Support Ticket",
  body: `Ticket ${ticket.TicketNumber || ticket._id} has been created.`,
  url: "/admin/tickets",
  ticketId: String(ticket._id),
}).catch((error) => {
  console.error("Ticket push notification failed:", error);
});

 const newMessage = await TICKETMESSAGE.create({
  TicketId: ticket._id,
  TicketNumber: TicketNum,
  Messages: [
    {
      SenderId: req.user._id,
      SenderEmail: req.user.Email,
      SenderRole: req.user.Role,
      Body: Description,
      Source: "web",
      Type: "public",
    },
  ],
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

    // 1. Fetch ticket
    const ticket = await TICKET.findById(id).lean();

    if (!ticket) {
      return next(new AppError("Ticket not found", 404));
    }

    // 2. Fetch all messages belonging to this ticket
    const messages = await TICKETMESSAGE.find({
      TicketId: ticket._id,
    })
      .sort({ createdAt: 1 })
      .lean();

    // 3. Return ticket and messages
    return res.status(200).json({
      success: true,
      message: "Ticket fetched successfully",
      ticket: {
        ...ticket,
        Messages: messages,
      },
    });
  } catch (error) {
    return next(error);
  }
};





const assignTicket = async (req, res, next) => {
  try {
    const { ticketId } = req.params;
    const { agentId } = req.body;

    // Validate agent ID
    if (!agentId) {
      return next(new AppError("Agent ID is required", 400));
    }

    console.log("Assign ticket params:", { ticketId, agentId });

    // Find ticket
    const ticket = await TICKET.findById(ticketId);

    if (!ticket) {
      return next(new AppError("Ticket not found", 404));
    }

    // Find selected agent
    const agent = await USER.findById(agentId);

    if (!agent) {
      return next(new AppError("Agent not found", 404));
    }

    // Optional: validate agent role
    /*
    if (agent.Role !== "supportAgent") {
      return next(
        new AppError("Selected user is not a support agent", 403)
      );
    }
    */

    // Validate ticket status
    const currentStatus = String(ticket.Status || "")
      .toLowerCase()
      .replace(/_/g, " ")
      .trim();

    if (["resolved", "closed"].includes(currentStatus)) {
      return next(
        new AppError(
          "Cannot assign a resolved or closed ticket",
          400
        )
      );
    }

    // Assign ticket
    ticket.Status = "in_progress";
    ticket.AssignedTo = agent._id;
    ticket.Assigned = true;

    await ticket.save();

    console.log("Ticket assigned successfully:", ticket._id);

    // Frontend dashboard URLs
    const frontendUrl = process.env.CLIENT_URL?.replace(/\/+$/, "");

    const agentDashboardUrl = frontendUrl
      ? `${frontendUrl}/agent/tickets/${ticket._id}`
      : null;

    const customerDashboardUrl = frontendUrl
      ? `${frontendUrl}/user/tickets/${ticket._id}`
      : null;

    // Prepare separate HTML emails
    const agentEmail = createAgentAssignmentEmail({
      agent,
      ticket,
      dashboardUrl: agentDashboardUrl || frontendUrl || "",
    });

    const customerEmail = createCustomerAssignmentEmail({
      ticket,
      dashboardUrl: customerDashboardUrl || frontendUrl || "",
    });

    // Send emails independently
    const emailResults = await Promise.allSettled([
      (async () => {
        if (!agent.Email) {
          throw new Error("Agent email is missing");
        }

        if (!agentDashboardUrl) {
          throw new Error("CLIENT_URL is missing");
        }

        return sendEmail({
          to: agent.Email,
          ...agentEmail,
        });
      })(),

      (async () => {
        if (!ticket.RequesterEmail) {
          throw new Error("Customer email is missing");
        }

        if (!customerDashboardUrl) {
          throw new Error("CLIENT_URL is missing");
        }

        return sendEmail({
          to: ticket.RequesterEmail,
          ...customerEmail,
        });
      })(),
    ]);

    // Log agent email result
    if (emailResults[0].status === "fulfilled") {
      console.log("Agent email sent successfully:", agent.Email);
    } else {
      console.error(
        "Agent email failed:",
        emailResults[0].reason?.message ||
          emailResults[0].reason
      );
    }

    // Log customer email result
    if (emailResults[1].status === "fulfilled") {
      console.log(
        "Customer email sent successfully:",
        ticket.RequesterEmail
      );
    } else {
      console.error(
        "Customer email failed:",
        emailResults[1].reason?.message ||
          emailResults[1].reason
      );
    }

    // Fetch updated ticket with agent details
    const updatedTicket = await TICKET.findById(ticket._id).populate(
      "AssignedTo",
      "Name Email AgentRole Role"
    );

    // Response
    return res.status(200).json({
      success: true,
      message: "Ticket assigned to agent successfully",
      ticket: updatedTicket,

      emailStatus: {
        agent:
          emailResults[0].status === "fulfilled"
            ? "sent"
            : "failed",

        customer:
          emailResults[1].status === "fulfilled"
            ? "sent"
            : "failed",
      },

      notificationsSent: emailResults.filter(
        (result) => result.status === "fulfilled"
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
