// routes/ticketMessageRoutes.js

const express = require("express");
const { authorize, protect } = require("../middleware/authMiddleware");
const { myProfile, updateProfile, updateEmail, verifyEmailOtp, userReplyToTicket, updatePassword } = require("../controller/userController");
const { userStatusToggel } = require("../controller/adminController");
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

router.post("/:id/status",protect,userStatusToggel)

// Request email change (send OTP to new email)
router.post("/profile/email/change-request", protect, updateEmail);

// Verify OTP and update email
router.post("/profile/email/verify-otp", protect, verifyEmailOtp);

router.patch("/profile/password/change",protect,updatePassword)



module.exports = router;