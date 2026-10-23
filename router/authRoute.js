const express = require("express");
const { register, login, requestOTP, verifyOTP, refreshToken, Logout, requestPasswordReset, resetPassword } = require("../controller/authController");

const app = express();
const router = express.Router();


router.post('/register',register);
router.post('/login',login);
router.post("/login-otp",requestOTP);
router.post("/verify-otp",verifyOTP);
router.post("/refresh-token", refreshToken);
router.post("/logout",Logout);
router.post("/forgot-password",requestPasswordReset);
router.post("/reset-password",resetPassword)

	


module.exports = router;
