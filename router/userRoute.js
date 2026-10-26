// routes/ticketMessageRoutes.js

const express = require("express");
const { authorize, protect } = require("../middleware/authMiddleware");
const { myProfile, updateProfile, updateEmail, verifyEmailOtp } = require("../controller/userController");
const router = express.Router();







// Customer reply
router.post(
  "/:ticketId/reply",
  protect,
  authorize("customer"),
  userReplyToTicket
);




// Get user profile
router.get("/profile", protect,myProfile );

// Update name and phone
router.post("/profile", protect, updateProfile);

// Request email change (send OTP to new email)
router.post("/profile/email/change-request", protect, updateEmail);

// Verify OTP and update email
router.post("/profile/email/verify-otp", protect, verifyEmailOtp);



module.exports = router;