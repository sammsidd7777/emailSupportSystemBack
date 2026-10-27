
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendEmail = async ({ to, subject, text, html }) => {
  if (!to) {
    throw new Error("Recipient email is required");
  }

  if (!subject) {
    throw new Error("Email subject is required");
  }

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error("EMAIL_USER or EMAIL_PASS is missing");
  }

  const result = await transporter.sendMail({
    from: {
      name: "BitMax Support",
      address: process.env.EMAIL_USER,
    },
    to,
    subject,
    text: text || "Please open this email in an HTML-compatible email client.",
    html,
  });

  console.log("Email sent successfully:", {
    to,
    subject,
    messageId: result.messageId,
  });

  return result;
};

module.exports = sendEmail;
