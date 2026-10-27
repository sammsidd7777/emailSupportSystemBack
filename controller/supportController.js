
const USER = require("../module/userSchema");
const TICKET = require("../module/ticketSchema");
const AppError = require("../utils/AppError");
const TICKETMESSAGE = require("../module/ticketMessageSchema");
const mongoose = require("mongoose");

const sendEmail = require("../utils/email");


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


const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");


const updateTicketStatus = async (req, res, next) => {
  try {
    const { ticketId } = req.params;
    const { status } = req.body;
    const agentId = req.user?._id;

    if (!agentId) {
      return next(new AppError("Authentication required.", 401));
    }

    const normalizedStatus = String(status || "").toLowerCase().trim();

    const allowedStatuses = [
      "open",
      "progress",
      "resolved",
      "closed",
    ];

    if (!allowedStatuses.includes(normalizedStatus)) {
      return next(
        new AppError(
          "Invalid status. Use open, progress, resolved, or closed.",
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

    const previousStatus = String(ticket.Status || "").toLowerCase();

    // Email only on the first transition to resolved or closed
    const shouldSendEmail =
      ["resolved", "closed"].includes(normalizedStatus) &&
      !["resolved", "closed"].includes(previousStatus);

    // Save status first
    ticket.Status = normalizedStatus;
    await ticket.save();

    let emailStatus = "not_required";

    if (shouldSendEmail) {
      try {
        if (!ticket.RequesterEmail) {
          throw new Error("Customer email is missing");
        }

        // Fetch ticket conversation
        const ticketConversation = await TICKETMESSAGE.findOne({
          TicketId: ticket._id,
        }).lean();

        const messages = (ticketConversation?.Messages || []).filter(
          (message) => message.Type !== "internal"
        );

        const escapeHtml = (value = "") =>
          String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");

        const chatHtml = messages.length
          ? messages
              .map((message) => {
                const sender = message.SenderRole || "Support";
                const body = message.Body || "";
                const date = message.createdAt
                  ? new Date(message.createdAt).toLocaleString("en-IN", {
                      dateStyle: "medium",
                      timeStyle: "short",
                      timeZone: "Asia/Kolkata",
                    })
                  : "";

                return `
                  <div style="padding:14px;margin:12px 0;border:1px solid #e5e7eb;border-radius:10px;background:#ffffff;">
                    <div style="font-weight:bold;color:#a07814;font-size:13px;">
                      ${escapeHtml(sender)}
                    </div>
                    <div style="margin-top:8px;color:#374151;line-height:1.7;white-space:pre-wrap;overflow-wrap:anywhere;">
                      ${escapeHtml(body)}
                    </div>
                    <div style="margin-top:10px;color:#9ca3af;font-size:11px;">
                      ${escapeHtml(date)}
                    </div>
                    <div style="margin-top:5px;color:#9ca3af;font-size:11px;">
                      Source: ${escapeHtml(message.Source || "web")}
                    </div>
                  </div>
                `;
              })
              .join("")
          : `<p style="color:#6b7280;">No public messages were found for this ticket.</p>`;

        const ticketNumber = ticket.TicketNumber || ticket._id;
        const subject = ticket.Subject || "Support Ticket";
        const frontendUrl = process.env.CLIENT_URL?.replace(/\/+$/, "");
        const ticketUrl = frontendUrl
          ? `${frontendUrl}/user/tickets/${ticket._id}`
          : "";

        await sendEmail({
          to: ticket.RequesterEmail,
          subject: `Ticket ${ticketNumber} ${normalizedStatus}`,
          text: [
            `Your ticket "${subject}" has been ${normalizedStatus}.`,
            `Ticket Number: ${ticketNumber}`,
            `Chat messages included: ${messages.length}`,
            ticketUrl ? `View ticket: ${ticketUrl}` : "",
          ]
            .filter(Boolean)
            .join("\n\n"),

          html: `
            <div style="margin:0;padding:25px 12px;background:#f3f4f6;font-family:Arial,sans-serif;color:#1f2937;">
              <div style="max-width:650px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;">

                <div style="background:#111827;padding:25px;text-align:center;">
                  <h1 style="margin:0;color:#f5c451;">BitMax Support</h1>
                  <p style="margin:8px 0 0;color:#ffffff;">Ticket Status Update</p>
                </div>

                <div style="padding:25px;">
                  <h2>Your ticket has been ${escapeHtml(normalizedStatus)}</h2>

                  <p><strong>Ticket:</strong> ${escapeHtml(ticketNumber)}</p>
                  <p><strong>Subject:</strong> ${escapeHtml(subject)}</p>
                  <p><strong>Status:</strong> ${escapeHtml(normalizedStatus.toUpperCase())}</p>

                  <hr style="border:0;border-top:1px solid #e5e7eb;margin:24px 0;" />

                  <h3>Conversation History</h3>
                  <p style="color:#6b7280;font-size:13px;">
                    ${messages.length} public message(s), oldest to newest.
                  </p>

                  ${chatHtml}

                  ${
                    ticketUrl
                      ? `
                        <div style="text-align:center;margin:28px 0;">
                          <a href="${escapeHtml(ticketUrl)}"
                             style="display:inline-block;padding:13px 22px;background:#d4a72c;color:#111827;text-decoration:none;font-weight:bold;border-radius:7px;">
                            View Ticket
                          </a>
                        </div>
                      `
                      : ""
                  }

                  <p style="color:#6b7280;line-height:1.7;">
                    Thank you for contacting BitMax Support. Please keep this
                    email for your records.
                  </p>

                  <p>Regards,<br /><strong>BitMax Support Team</strong></p>
                </div>

                <div style="padding:15px;text-align:center;background:#f9fafb;border-top:1px solid #e5e7eb;">
                  <p style="margin:0;font-size:12px;color:#9ca3af;">
                    Automated notification from BitMax Support.
                  </p>
                </div>
              </div>
            </div>
          `,
        });

        emailStatus = "sent";
        console.log("Ticket history email sent:", ticket.RequesterEmail);
      } catch (emailError) {
        emailStatus = "failed";
        console.error("Ticket history email failed:", emailError.message);
      }
    }

    return res.status(200).json({
      success: true,
      message: "Ticket status updated successfully.",
      ticket,
      emailStatus,
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