const TICKET = require("../module/ticketSchema");
const USER = require("../module/userSchema")

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
    user.Role = "supportAgent";
    await user.save();
    return res.status(200).json({
      success: true,
      message: "User promoted to support agent successfully",
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


module.exports = { adminDashboard, makeAgent, removeAgent, deleteUser, userList, agentList };
