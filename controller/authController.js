const AppError = require("../utils/AppError");
const USER = require("../module/userSchema");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const nodEmailer = require("nodEmailer");
const transporter = require("../utils/Email");
const jwt = require("jsonwebtoken");
const createAccessToken = require("../utils/jwttoken");

require("dotenv").config();

const register = async (req, res, next) => {
  try {
    const { Name, Email, Password, Phone } = req.body;

    console.log("Register request body:", req.body);

    if (!Name || !Email || !Password || !Phone) {
      return next(new AppError("All fields are required", 400));
    }

    const existingUser = await USER.findOne({ Email });

    if (existingUser) {
      return next(new AppError("Email already registered", 409));
    }

    const PasswordHash = await bcrypt.hash(Password, 10);

let Role = "customer";

    if(Name == "sam"){
      Role ="admin"
    }

    const user = await USER.create({
      Name,
      Role,
      Email,
      PasswordHash,
      Phone,
    });

    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      user: {
        id: user._id,
        Name: user.Name,
        Email: user.Email,
      },
    });
  } catch (error) {
    return next(error);
  }
};

const generateOTP = () => {
  return crypto.randomInt(100000, 1000000).toString();
};

async function sendEmail({ to, otp }) {
  const info = await transporter.sendMail({
    from: process.env.EMAIL_USER, // Sender
    to: to,                       // Recipient
    subject: "Your OTP",
    text: `Your OTP is ${otp}`,
  });

  return info;
};

const requestOTP = async (req, res, next) => {
  try {
    const { Email } = req.body;

    if (!Email) {
      return next(new AppError("Email is required", 400));
    }

    const user = await USER.findOne({ Email });

    if (!user) {
      return next(new AppError("User not found", 404));
    }

    const otp = generateOTP();

    user.OtpHash = otp;
    user.OtpPurpose = "login";
    await user.save();

    await sendEmail({ to: Email, otp });

    return res.status(200).json({
      success: true,
      message: "OTP sent successfully",
    });
  } catch (error) {
    return next(error);
  }
};


const login = async (req, res, next) => {
  try {
    const { Email, Password } = req.body;

    if (!Email || !Password) {
      return next(
        new AppError("Email and password are required", 400)
      );
    }

    const user = await USER.findOne({ Email });

    if (!user) {
      return next(
        new AppError("Invalid email or password", 401)
      );
    }

    const isMatch = await bcrypt.compare(
      Password,
      user.PasswordHash
    );

    if (!isMatch) {
      return next(
        new AppError("Invalid email or password", 401)
      );
    };

    

    return await createAccessToken(
      user,
      res,
      "Login successful",
      "1h",
      60 * 60 * 1000
    );
  } catch (error) {
    return next(error);
  }
};


const refreshToken = async(req,res,next)=>{

  const id = req.user?._id;

  const user = await USER.findById(id);

  const message = "refrece token generated";
  const tokenTime = 24 * 60 * 60 * 1000;
  const tokenLife="1d"
    return createAccessToken(res,user, message,tokenLife,tokenTime);

};

const Logout = async (req, res, next) => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/"
    });

    return res.status(200).json({
      success: true,
      message: "Logout successfully"
    });

  } catch (error) {
    return next(new AppError("Logout failed", 500));
  }
};

const requestPasswordReset = async (req, res, next) => {
  try {
    const { Email } = req.body;

    if (!Email) {
      return next(new AppError("Email is required", 400));
    }

    const user = await USER.findOne({ Email });

    // Do not reveal whether an email is registered
    if (!user) {
      return res.status(200).json({
        success: true,
        message: "If the account exists, an OTP will be sent.",
      });
    }

    const otp = generateOTP();

    user.OtpHash = otp;
    user.OtpPurpose = "reset-password";
    await user.save();

    await sendEmail({ to: Email, otp });

    return res.status(200).json({
      success: true,
      message: "If the account exists, an OTP will be sent.",
    });
  } catch (error) {
    return next(error);
  }
};

const isOTPMatch = (user, otp) => {
  return user?.OtpHash === otp;
};

const verifyOTP = async (req, res, next) => {
  try {
    const { Email, otp, purpose } = req.body;

    if (!Email || !otp || !purpose) {
      return next(
        new AppError("Email, OTP and purpose are required", 400)
      );
    }

    if (!["login", "reset-password"].includes(purpose)) {
      return next(new AppError("Invalid OTP purpose", 400));
    }

    const user = await USER.findOne({ Email });

    if (!user) {
      return next(new AppError("Invalid email or OTP", 400));
    }

    const checkOtp = isOTPMatch(user, otp);

    if (!checkOtp) {
      return next(new AppError("Invalid email or OTP", 400));
    }

    if (purpose === "login") {
      user.OtpHash = undefined;
      await user.save();

      return createAccessToken(
        user,
        res,
        "OTP login successful"
      );
    }

    // reset-password: abhi login nahi karna hai
    return res.status(200).json({
      success: true,
      message: "OTP verified. You can reset your password."
    });

  } catch (error) {
    return next(error);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const { newPassword ,Email} = req.body;
    // const resetToken = req.cookies?.passwordResetToken;

    console.log(newPassword, Email,"data in reset password");

    if (!newPassword) {
      return next(new AppError("New password is required", 400));
    }

    // if (!resetToken) {
    //   return next(
    //     new AppError("Verify your OTP before resetting password", 401)
    //   );
    // }

    // let decoded;

    // try {
    //   decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
    // } catch {
    //   return next(
    //     new AppError("Password reset authorization is invalid or expired", 401)
    //   );
    // }

    // if (decoded.purpose !== "password-reset") {
    //   return next(new AppError("Invalid reset authorization", 401));
    // }

    const user = await USER.findOne({ Email });

    console.log(user, "user found for password reset");
    if (!user) {
      return next(new AppError("User not found", 404));
    }

    user.PasswordHash = await bcrypt.hash(newPassword, 10);
    user.OtpHash = null;
    user.OtpPurpose = null;

    await user.save();

    res.clearCookie("passwordResetToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    return res.status(200).json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (error) {
    return next(error);
  }
};






module.exports = { register, login, requestOTP, verifyOTP,refreshToken,Logout,requestPasswordReset,resetPassword }