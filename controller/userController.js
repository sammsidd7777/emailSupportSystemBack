
const TICKET = require("../module/ticketSchema");
const TICKETMESSAGE = require("../module/ticketMessageSchema");
const AppError = require("../utils/AppError");
const USER = require("../module/userSchema");
const  bcrypt =require("bcryptjs");
const crypto = require("crypto");
const transporter = require("../utils/email.js");
const mongoose = require("mongoose");



const userReplyToTicket = async (req, res, next) => {
  try {
    const { ticketId } = req.params;
    const { message } = req.body;
    const userId = req.user?._id;

    // 1. Authentication check
    if (!userId) {
      return next(new AppError("Authentication required.", 401));
    }

    // 2. Validate message
    if (typeof message !== "string" || !message.trim()) {
      return next(new AppError("Reply message is required.", 400));
    }

    // 3. Find ticket belonging to this customer
    const ticket = await TICKET.findOne({
      _id: ticketId,
      RequesterId: userId, // Apne Ticket schema ka actual field name use karein
    });

    if (!ticket) {
      return next(
        new AppError("Ticket not found or you do not own this ticket.", 404)
      );
    }

    // 4. Check ticket status
    if (
      ["resolved", "closed"].includes(
        String(ticket.Status || "").toLowerCase()
      )
    ) {
      return next(
        new AppError("Cannot reply to a closed or resolved ticket.", 400)
      );
    }

    // 5. Find existing conversation
    const conversation = await TICKETMESSAGE.findOne({
      TicketId: ticket._id,
    });

    if (!conversation) {
      return next(
        new AppError("Conversation not found for this ticket.", 404)
      );
    }

    // 6. Add message to the existing conversation
    conversation.Messages.push({
      SenderId: userId,
      SenderEmail: req.user.Email, // Apne User schema ke field ke according
      SenderRole: "customer",
      Body: message.trim(),
      Source: "web",
      Type: "public",
    });

    await conversation.save();

    // 7. Response
    return res.status(201).json({
      success: true,
      message: "Your reply has been added successfully.",
      data: conversation,
    });
  } catch (error) {
    return next(error);
  }
};
const myProfile = async (req, res) => {
  try {
    const id = req?.user?._id;

    const user = await USER.findById(id).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Your profile loaded successfully",
      user,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to load profile",
      error: error.message,
    });
  }
};

const generateOTP = () => {
  return crypto.randomInt(100000, 1000000).toString();
};

const updateProfile = async (req, res, next) => {
  try {
    const id = req?.user?._id;
    const { name, phone, password } = req.body;

    if (!id) {
      return res.status(401).json({
        success: false,
        message: "Please login first",
      });
    }

    if (!password) {
      return res.status(400).json({
        success: false,
        message: "Password is required to update profile",
      });
    }

    if (name === undefined && phone === undefined) {
      return res.status(400).json({
        success: false,
        message: "Please provide name or phone number",
      });
    }

    const user = await USER.findById(id).select("+password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const isPasswordValid = await bcrypt.compare(
      password,
      user.PasswordHash
    );

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Incorrect password",
      });
    }

    // Update only permitted fields
    if (name !== undefined) {
      if (!name.trim()) {
        return res.status(400).json({
          success: false,
          message: "Name cannot be empty",
        });
      }

      user.Name = name.trim();
    }

    if (phone !== undefined) {
      user.Phone = phone;
    }

    await user.save();

    const updatedUser = user.toObject();
    delete updatedUser.password;

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    next(error);
  }
};



const updateEmail = async (req, res, next) => {
  try {
    const id = req?.user?._id;
    const { newEmail, password } = req.body;

    // Check authentication
    if (!id) {
      return res.status(401).json({
        success: false,
        message: "Please login first",
      });
    }

    // Validate required fields
    if (!newEmail || !password) {
      return res.status(400).json({
        success: false,
        message: "New email and password are required",
      });
    }

    // Normalize email
    const normalizedEmail = newEmail.trim().toLowerCase();

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address",
      });
    }

    // Find authenticated user
    const user = await USER.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(
      password,
      user.PasswordHash
    );

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Incorrect password",
      });
    }

    // Check whether email is already current email
    if (normalizedEmail === user.Email.toLowerCase()) {
      return res.status(400).json({
        success: false,
        message: "This is already your current email",
      });
    }

    // Check whether email is already registered
    const existingUser = await USER.findOne({
      Email: normalizedEmail,
      _id: { $ne: user._id },
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "This email is already registered",
      });
    }

    // Generate secure 6-digit OTP
    const otp = await generateOTP();

    // Hash OTP before storing it
    const otpHash = crypto
      .createHash("sha256")
      .update(otp)
      .digest("hex");

    // Save pending email and OTP details
    user.PendingEmail = normalizedEmail;
    user.EmailOtpHash = otpHash;
    user.EmailOtpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);
    user.EmailOtpAttempts = 0;

    await user.save();

    // Send OTP to the new email address
    try {
      await transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: normalizedEmail,
        subject: "Verify Your New Email - BitMax",

        text: `Your BitMax email verification OTP is ${otp}. It expires in 5 minutes.`,

        html: `
          <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px;">
            <h2 style="color: #D4AF37;">Verify Your New Email</h2>

            <p>Your BitMax email verification code is:</p>

            <h1 style="letter-spacing: 8px; color: #D4AF37;">
              ${otp}
            </h1>

            <p>This code expires in 5 minutes.</p>

            <p style="color: #666; font-size: 13px;">
              If you did not request this change, please secure your account.
            </p>
          </div>
        `,
      });
    } catch (mailError) {
      // Clear OTP details if email delivery fails
      user.PendingEmail = null;
      user.EmailOtpHash = null;
      user.EmailOtpExpiresAt = null;
      user.EmailOtpAttempts = 0;

      await user.save();

      throw mailError;
    }

    return res.status(200).json({
      success: true,
      message: "OTP sent to your new email. Please verify it.",
    });
  } catch (error) {
    next(error);
  }
};


const verifyEmailOtp = async (req, res, next) => {
  try {
    const id = req?.user?._id;
    const { otp } = req.body;

    if (!id) {
      return res.status(401).json({
        success: false,
        message: "Please login first",
      });
    }

    if (!otp || !/^\d{6}$/.test(String(otp))) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid 6-digit OTP",
      });
    }

    const user = await USER.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (
      !user.PendingEmail ||
      !user.EmailOtpHash ||
      !user.EmailOtpExpiresAt
    ) {
      return res.status(400).json({
        success: false,
        message: "Please request an email verification OTP first",
      });
    }

    // Check OTP expiry
    if (user.EmailOtpExpiresAt.getTime() <= Date.now()) {
      user.PendingEmail = null;
      user.EmailOtpHash = null;
      user.EmailOtpExpiresAt = null;
      user.EmailOtpAttempts = 0;

      await user.save();

      return res.status(400).json({
        success: false,
        message: "OTP has expired. Please request a new one",
      });
    }

    // Limit incorrect attempts
    if (user.EmailOtpAttempts >= 5) {
      user.PendingEmail = null;
      user.EmailOtpHash = null;
      user.EmailOtpExpiresAt = null;
      user.EmailOtpAttempts = 0;

      await user.save();

      return res.status(429).json({
        success: false,
        message: "Too many attempts. Please request a new OTP",
      });
    }

    // Hash the submitted OTP
    const otpHash = crypto
      .createHash("sha256")
      .update(String(otp))
      .digest("hex");

    // Compare OTP hashes
    if (otpHash !== user.EmailOtpHash) {
      user.EmailOtpAttempts += 1;
      await user.save();

      return res.status(400).json({
        success: false,
        message: "Incorrect OTP",
      });
    }

    // Ensure the pending email is still available
    const existingUser = await USER.findOne({
      Email: user.PendingEmail,
      _id: { $ne: user._id },
    });

    if (existingUser) {
      user.PendingEmail = null;
      user.EmailOtpHash = null;
      user.EmailOtpExpiresAt = null;
      user.EmailOtpAttempts = 0;

      await user.save();

      return res.status(409).json({
        success: false,
        message: "This email is already registered",
      });
    }

    // Update email only after successful OTP verification
    user.Email = user.PendingEmail;

    // Clear temporary OTP data
    user.PendingEmail = null;
    user.EmailOtpHash = null;
    user.EmailOtpExpiresAt = null;
    user.EmailOtpAttempts = 0;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Email updated successfully",
      user: {
        _id: user._id,
        Name: user.Name,
        Email: user.Email,
        Phone: user.Phone,
      },
    });
  } catch (error) {
    next(error);
  }
};




const updatePassword = async (req, res, next) => {
  try {
    const id = req.user?._id;
    const { currentPassword, newPassword } = req.body;

    if (!id) {
      return res.status(401).json({
        success: false,
        message: "Please login first",
      });
    }

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password and new password are required",
      });
    }

    if (typeof newPassword !== "string" || newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 8 characters long",
      });
    }

    const user = await USER.findById(id).select("+PasswordHash");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      user.PasswordHash
    );

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Incorrect current password",
      });
    }

    const isSamePassword = await bcrypt.compare(
      newPassword,
      user.PasswordHash
    );

    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        message: "New password must be different from current password",
      });
    }

    user.PasswordHash = await bcrypt.hash(newPassword, 12);

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (error) {
    next(error);
  }
};




module.exports = { userReplyToTicket,myProfile,updateProfile,updateEmail,verifyEmailOtp,updatePassword };