// routes/ticketMessageRoutes.js

const express = require("express");
const { userReplyToTicket } = require("../controller/userController");
const { authorize, protect } = require("../middleware/authMiddleware");
const router = express.Router();







// Customer reply
router.post(
  "/:ticketId/reply",
  protect,
  authorize("customer"),
  userReplyToTicket
);

module.exports = router;