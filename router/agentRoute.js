
const express = require("express");
const { getAgentProfile, getMyAssignedTickets, getAgentTicketById, updateTicketStatus, replyToTicketByAgent } = require("../controller/supportController");
const { protect } = require("../middleware/authMiddleware");
const router = express.Router();

// router.use(isAuthenticated);
// router.use(authorizeRoles("supportAgent", "admin"));

router.get("/profile", protect, getAgentProfile);
router.get("/tickets", protect, getMyAssignedTickets);
router.get("/tickets/:ticketId", protect, getAgentTicketById);
router.post("/tickets/:ticketId/reply", protect, replyToTicketByAgent);
router.patch("/tickets/:ticketId/status", protect, updateTicketStatus);

module.exports = router;
