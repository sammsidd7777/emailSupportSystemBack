
const TICKET = require("../module/ticketSchema");
const TICKETMESSAGE = require("../module/ticketMessageSchema");
const AppError = require("../utils/AppError");
const USER = require("../module/userSchema");
const  bcrypt =require("bcryptjs");
const crypto = require("crypto");
const transporter = require("../utils/email.js");
const mongoose = require("mongoose");

const sendEmail = require("../utils/email.js");





const userReplyToTicket = async (req, res, next) => {
  try {
    const { ticketId } = req.params;
    const { message } = req.body;
    const userId = req.user?._id;

    // 1. Authentication
    if (!userId) {
      return next(new AppError("Authentication required.", 401));
    }

    // 2. Validate message
    if (typeof message !== "string" || !message.trim()) {
      return next(
        new AppError("Reply message is required.", 400)
      );
    }

    // 3. Find customer's ticket
    const ticket = await TICKET.findOne({
      _id: ticketId,
      RequesterId: userId,
    });

    if (!ticket) {
      return next(
        new AppError(
          "Ticket not found or you do not own this ticket.",
          404
        )
      );
    }

    // 4. Check ticket status
    if (
      ["resolved", "closed"].includes(
        String(ticket.Status || "").toLowerCase()
      )
    ) {
      return next(
        new AppError(
          "Cannot reply to a closed or resolved ticket.",
          400
        )
      );
    }

    // 5. Find conversation
    const conversation = await TICKETMESSAGE.findOne({
      TicketId: ticket._id,
    });

    if (!conversation) {
      return next(
        new AppError("Conversation not found for this ticket.", 404)
      );
    }

    // 6. Check whether an agent is assigned
    const assignedAgentId = ticket.AssignedTo;

    // If no agent is assigned, allow only one customer message
    if (!assignedAgentId) {
      const existingCustomerMessages = conversation.Messages.filter(
        (msg) =>
          msg.SenderRole === "customer" &&
          msg.Type === "public"
      );

      if (existingCustomerMessages.length >= 1) {
        return next(
          new AppError(
            "No support agent is assigned yet. You can send only one message until an agent is assigned.",
            400
          )
        );
      }
    }

    // 7. Save customer message
    conversation.Messages.push({
      SenderId: userId,
      SenderEmail: req.user.Email,
      SenderRole: "customer",
      Body: message.trim(),
      Source: "web",
      Type: "public",
    });

    await conversation.save();

    // 8. Notify assigned agent by email
    let emailStatus = "not_sent";

    if (assignedAgentId) {
      try {
        const agent = await USER.findById(assignedAgentId).select(
          "Name Email"
        );

        if (agent?.Email) {
          const ticketNumber =
            ticket.TicketNumber ||
            conversation.TicketNumber ||
            String(ticket._id);

          const escapeHtml = (value = "") =>
            String(value)
              .replace(/&/g, "&amp;")
              .replace(/</g, "&lt;")
              .replace(/>/g, "&gt;")
              .replace(/"/g, "&quot;")
              .replace(/'/g, "&#039;");

          await sendEmail({
            to: agent.Email,
            subject: `New customer reply - Ticket ${ticketNumber}`,

            text: `
Hello ${agent.Name || "Support Agent"},

The customer has replied to a ticket assigned to you.

Ticket: ${ticketNumber}
Subject: ${ticket.Subject || "Support Ticket"}
Customer: ${req.user.Name || req.user.Email}

Customer message:
${message.trim()}

Please log in to BitMax Support to respond.
            `.trim(),

            html: `
              <div style="font-family:Arial,sans-serif;background:#f3f4f6;padding:24px;color:#1f2937;">
                <div style="max-width:600px;margin:auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
                  <div style="background:#111827;padding:22px;text-align:center;">
                    <h2 style="margin:0;color:#f5c451;">BitMax Support</h2>
                    <p style="color:#fff;margin-bottom:0;">New Customer Reply</p>
                  </div>

                  <div style="padding:24px;">
                    <p>Hello ${escapeHtml(agent.Name || "Support Agent")},</p>
                    <p>A customer has replied to a ticket assigned to you.</p>

                    <p><strong>Ticket:</strong> ${escapeHtml(ticketNumber)}</p>
                    <p><strong>Subject:</strong> ${escapeHtml(ticket.Subject || "Support Ticket")}</p>
                    <p><strong>Customer:</strong> ${escapeHtml(req.user.Name || req.user.Email || "Customer")}</p>

                    <h3>Customer Message</h3>
                    <div style="padding:16px;background:#fffbeb;border-left:4px solid #d4a72c;border-radius:6px;white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.7;">${escapeHtml(message.trim())}</div>

                    <p style="margin-top:24px;">Please log in to your support dashboard to respond.</p>
                    <p>Regards,<br/><strong>BitMax Support Team</strong></p>
                  </div>
                </div>
              </div>
            `,
          });

          emailStatus = "sent";
        } else {
          emailStatus = "agent_email_missing";
        }
      } catch (emailError) {
        emailStatus = "failed";
        console.error(
          "Customer reply email to agent failed:",
          emailError.message
        );
      }
    }

    // 9. Response
    return res.status(201).json({
      success: true,
      message: "Your reply has been added successfully.",
      data: conversation,
      emailStatus,
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
  const requestId = `UPDATE_EMAIL_${Date.now()}`;

  try {
    console.log(`[${requestId}] STEP 1: Request received`);

    const id = req?.user?._id;
    const { newEmail, password } = req.body;

    console.log(`[${requestId}] STEP 2: Request data checked`, {
      userId: id ? String(id) : null,
      hasNewEmail: Boolean(newEmail),
      hasPassword: Boolean(password),
    });

    // Authentication
    if (!id) {
      console.log(`[${requestId}] ERROR: User not authenticated`);

      return res.status(401).json({
        success: false,
        message: "Please login first",
      });
    }

    // Required fields
    if (!newEmail || !password) {
      console.log(`[${requestId}] ERROR: Missing required fields`);

      return res.status(400).json({
        success: false,
        message: "New email and password are required",
      });
    }

    const normalizedEmail = newEmail.trim().toLowerCase();

    console.log(`[${requestId}] STEP 3: Email normalized`);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(normalizedEmail)) {
      console.log(`[${requestId}] ERROR: Invalid email format`);

      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address",
      });
    }

    console.log(`[${requestId}] STEP 4: Email format valid`);

    // MongoDB: Find user
    console.log(`[${requestId}] STEP 5: Before USER.findById`);

    const user = await USER.findById(id);

    console.log(`[${requestId}] STEP 6: After USER.findById`, {
      userFound: Boolean(user),
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Password verification
    console.log(`[${requestId}] STEP 7: Before bcrypt.compare`);

    const isPasswordValid = await bcrypt.compare(
      password,
      user.PasswordHash
    );

    console.log(`[${requestId}] STEP 8: After bcrypt.compare`, {
      isPasswordValid,
    });

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Incorrect password",
      });
    }

    // Check current email
    console.log(`[${requestId}] STEP 9: Checking current email`);

    if (normalizedEmail === user.Email?.trim().toLowerCase()) {
      return res.status(400).json({
        success: false,
        message: "This is already your current email",
      });
    }

    // Check duplicate email
    console.log(`[${requestId}] STEP 10: Before USER.findOne`);

    const existingUser = await USER.findOne({
      Email: normalizedEmail,
      _id: { $ne: user._id },
    });

    console.log(`[${requestId}] STEP 11: After USER.findOne`, {
      emailAlreadyRegistered: Boolean(existingUser),
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "This email is already registered",
      });
    }

    // Generate OTP
    console.log(`[${requestId}] STEP 12: Before generateOTP`);

    const otp = generateOTP();

    console.log(`[${requestId}] STEP 13: OTP generated`);

    // Hash OTP
    console.log(`[${requestId}] STEP 14: Before OTP hashing`);

    const otpHash = crypto
      .createHash("sha256")
      .update(otp)
      .digest("hex");

    console.log(`[${requestId}] STEP 15: OTP hashing completed`);

    // Save pending email
    user.PendingEmail = normalizedEmail;
    user.EmailOtpHash = otpHash;
    user.EmailOtpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);
    user.EmailOtpAttempts = 0;

    console.log(`[${requestId}] STEP 16: Before user.save`);

    await user.save();

    console.log(`[${requestId}] STEP 17: After user.save`);

    // Send OTP email
    console.log(`[${requestId}] STEP 18: Before transporter.sendMail`);

    try {
      const mailResult = await transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: normalizedEmail,
        subject: "Verify Your New Email - BitMax",
        text: `Your BitMax email verification OTP is ${otp}. It expires in 5 minutes.`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 24px;">
            <h2 style="color: #D4AF37;">Verify Your New Email</h2>
            <p>Your BitMax verification code is:</p>
            <h1 style="letter-spacing: 8px; color: #D4AF37;">
              ${otp}
            </h1>
            <p>This code expires in 5 minutes.</p>
          </div>
        `,
      });

      console.log(`[${requestId}] STEP 19: Email sent successfully`, {
        acceptedCount: mailResult.accepted?.length ?? 0,
        rejectedCount: mailResult.rejected?.length ?? 0,
        messageId: mailResult.messageId,
      });
    } catch (mailError) {
      console.error(`[${requestId}] ERROR: Email sending failed`, {
        name: mailError.name,
        code: mailError.code,
        command: mailError.command,
        message: mailError.message,
      });

      // Clear pending OTP if email delivery fails
      user.PendingEmail = null;
      user.EmailOtpHash = null;
      user.EmailOtpExpiresAt = null;
      user.EmailOtpAttempts = 0;

      console.log(`[${requestId}] STEP 20: Before cleanup save`);

      await user.save();

      console.log(`[${requestId}] STEP 21: Cleanup save completed`);

      throw mailError;
    }

    console.log(`[${requestId}] STEP 22: Sending success response`);

    return res.status(200).json({
      success: true,
      message: "OTP sent to your new email. Please verify it.",
    });
  } catch (error) {
    console.error(`[${requestId}] FINAL ERROR`, {
      name: error.name,
      message: error.message,
      code: error.code,
      stack: error.stack,
    });

    return next(error);
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