const TICKET = require("../module/ticketSchema");
const USER = require("../module/userSchema");
const AppError = require("../utils/AppError");
const sendEmail = require("../utils/email");
const { unassignedTickets } = require("./ticketController");


const adminDashboard = async (req, res, next) => {
  try {
    // Total tickets
    const totalTicket = await TICKET.find().sort({ createdAt: -1 });

    // Total users and support agents
    const totalUser = await USER.countDocuments({
      Role: "customer",
    });

    const totalAgent = await USER.countDocuments({
      Role: "supportAgent",
    });

    // Assigned and unassigned tickets
    const assignTicket = totalTicket.filter(
      (ticket) => ticket.AssignedTo
    );

    const unAssinTicket = totalTicket.filter(
      (ticket) => !ticket.AssignedTo
    );

    // Ticket status counts
    const resolvedTickets = totalTicket.filter((ticket) =>
      ["resolved", "closed"].includes(
        String(ticket.Status || "").toLowerCase().replaceAll("_", " ")
      )
    );

    const openTickets = totalTicket.filter(
      (ticket) =>
        String(ticket.Status || "").toLowerCase() === "open"
    );

    const pendingTickets = totalTicket.filter((ticket) =>
      ["pending", "in progress"].includes(
        String(ticket.Status || "").toLowerCase().replaceAll("_", " ")
      )
    );

    // High and urgent priority tickets
    const highUrgentTickets = totalTicket.filter((ticket) =>
      ["high", "urgent"].includes(
        String(ticket.Priority || "").toLowerCase()
      )
    );

    // Resolution rate
    const resolutionRate =
      totalTicket.length > 0
        ? Number(
            (
              (resolvedTickets.length / totalTicket.length) *
              100
            ).toFixed(2)
          )
        : 0;

    // Recent tickets: latest 5
    const recentTickets = totalTicket.slice(0, 5);

    return res.status(200).json({
      success: true,
      message: "Admin dashboard data fetched successfully",

      stats: {
        totalTickets: totalTicket.length,
        totalUsers: totalUser,
        supportAgents: totalAgent,
        resolvedTickets: resolvedTickets.length,
        openTickets: openTickets.length,
        pendingInProgress: pendingTickets.length,
        unassignedTickets: unAssinTicket.length,
        highUrgentPriority: highUrgentTickets.length,
        resolutionRate,
      },

      totalCount: totalTicket.length,
      assignedCount: assignTicket.length,
      unassignedCount: unAssinTicket.length,

      totalTicket,
      assignTicket,
      unAssinTicket,
      recentTickets,
    });
  } catch (error) {
    return next(error);
  }
};


const makeAgent = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const user = await USER.findById(userId);

    if (!user) {
      return next(new AppError("User not found", 404));
    }

    // Check if already a support agent
    if (user.Role === "supportAgent") {
      return res.status(200).json({
        success: true,
        message: "User is already a support agent",
      });
    }

    // Update role
    user.Role = "supportAgent";
    await user.save();

    // Send promotion email without failing the role update
    let emailStatus = "sent";

    try {
      if (!user.Email) {
        throw new Error("User email is missing");
      }

      const frontendUrl = process.env.CLIENT_URL?.replace(/\/+$/, "");
      const dashboardUrl = frontendUrl
        ? `${frontendUrl}/agent/dashboard`
        : "";

      await sendEmail({
        to: user.Email,
        subject: "Congratulations! You are now a Support Agent",
        text: `Hi ${user.Name || "there"},

Congratulations! Your account has been promoted to Support Agent at BitMax Support.

You can now log in to your account and access your support agent dashboard.

${dashboardUrl ? `Agent Dashboard: ${dashboardUrl}` : ""}

Thank you,
BitMax Support Team`,
        html: `
          <div style="margin:0;padding:30px 12px;background:#f4f5f7;font-family:Arial,sans-serif;color:#222;">
            <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e5e7eb;">

              <div style="background:#111111;padding:28px 24px;text-align:center;">
                <h1 style="margin:0;color:#f5c451;font-size:25px;">
                  BitMax Support
                </h1>
                <p style="margin:8px 0 0;color:#ffffff;font-size:13px;">
                  Support Team Notification
                </p>
              </div>

              <div style="padding:32px 26px;">
                <h2 style="margin:0 0 16px;color:#202020;">
                  Congratulations, ${user.Name || "there"}!
                </h2>

                <p style="font-size:15px;line-height:1.7;color:#4b5563;">
                  We're pleased to inform you that your account has been
                  promoted to <strong style="color:#b8860b;">Support Agent</strong>
                  at BitMax Support.
                </p>

                <div style="margin:24px 0;padding:18px;background:#fff9e8;border:1px solid #f2d58a;border-radius:10px;">
                  <p style="margin:0 0 8px;color:#7c5a0a;font-size:13px;">
                    YOUR NEW ROLE
                  </p>
                  <h3 style="margin:0;color:#202020;font-size:20px;">
                    Support Agent
                  </h3>
                </div>

                <p style="font-size:15px;line-height:1.7;color:#4b5563;">
                  You can now log in to your account to access your agent
                  dashboard, manage assigned tickets, and assist customers.
                </p>

                ${
                  dashboardUrl
                    ? `
                      <div style="text-align:center;margin:28px 0;">
                        <a href="${dashboardUrl}"
                           style="display:inline-block;padding:13px 24px;background:#d4a72c;color:#111111;text-decoration:none;font-weight:bold;border-radius:7px;">
                          Open Agent Dashboard
                        </a>
                      </div>
                    `
                    : ""
                }

                <p style="font-size:14px;line-height:1.7;color:#6b7280;">
                  Thank you for being part of our support team. We wish you
                  success in your new role!
                </p>

                <p style="margin-top:26px;font-size:14px;color:#374151;">
                  Best regards,<br />
                  <strong>BitMax Support Team</strong>
                </p>
              </div>

              <div style="padding:16px;text-align:center;background:#f9fafb;border-top:1px solid #e5e7eb;">
                <p style="margin:0;font-size:12px;color:#9ca3af;">
                  This is an automated notification from BitMax Support.
                </p>
              </div>

            </div>
          </div>
        `,
      });
    } catch (emailError) {
      emailStatus = "failed";
      console.error(
        "Support agent promotion email failed:",
        emailError.message
      );
    }

    return res.status(200).json({
      success: true,
      message: "User promoted to support agent successfully",
      emailStatus,
    });
  } catch (error) {
    return next(error);
  }
};

const removeAgent = async (req, res, next) => {
  try {
    const { userId } = req.params;    
    const user = await USER.findById(userId);
    if (!user) {
      return next(new AppError("User not found", 404));
    }
    user.Role = "customer";
    await user.save();
    return res.status(200).json({
      success: true,
      message: "User demoted from support agent successfully",
    });
  } catch (error) {
    return next(error);
  }
};

const deleteUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const user = await USER.findById(userId);
    if (!user) {
      return next(new AppError("User not found", 404));
    }
    await user.remove();
    return res.status(200).json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    return next(error);
  }
};

const userList = async (req, res, next) => {
  try {
    const users = await USER.find({ Role: "customer" }).sort({ createdAt: -1 });
    return res.status(200).json({
      success: true,  
      message: "User list fetched successfully",
      users,
    });
  } catch (error) {
    return next(error);
  }
};


const userStatusToggel = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await USER.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    user.Status = !user.Status;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "User status changed successfully",
      status: user.Status,
    });
  } catch (error) {
    next(error);
  }
};


const agentList = async (req, res, next) => {
  try {
    const agents = await USER.find({ Role: "supportAgent" }).sort({ createdAt: -1 });

    console.log(agents, "agent list");
    return res.status(200).json({
      success: true,  
      message: "User list fetched successfully",
      agents,
    });
  } catch (error) {
    return next(error);
  }
};



const bulkAssignTickets = async (req, res, next) => {
  try {
    const { agentId } = req.params;
    const { ticketIds } = req.body;

    if (!agentId) {
      return next(new AppError("Agent ID is required", 400));
    }

    if (!Array.isArray(ticketIds) || ticketIds.length === 0) {
      return next(new AppError("Please select tickets", 400));
    }

    const agent = await USER.findById(agentId);

    if (!agent) {
      return next(new AppError("Agent not found", 404));
    }

    const result = await TICKET.updateMany(
      { _id: { $in: ticketIds } },
      {
        $set: {
          AssignedTo: agentId,
          Assigned: true,
        },
      }
    );

    return res.status(200).json({
      success: true,
      message: "Tickets assigned successfully",
      assignedCount: result.modifiedCount,
    });

  } catch (error) {
    next(error);
  }
};


const autoAssignTickets = async (req,res,next) => {

  try {

    const agent =await  agentList();

    const unAssingTicket = await unassignedTickets(); 

    res.send(200).json({
      success:true,
      message:{agent,unAssingTicket}
    })


    
  } catch (error) {
    
  }


}


module.exports = { bulkAssignTickets,autoAssignTickets,adminDashboard, makeAgent, removeAgent, deleteUser, userList, agentList ,userStatusToggel};
