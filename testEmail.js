require("dotenv").config();

const transporter = require("./utils/email");

async function sendTestEmail() {
  const info = await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: "sambhumihar978@gmail.com",
    subject: "SMTP Test",
    text: "Hello! SMTP is working successfully.",
  });

  console.log("Email sent:", info.messageId);
}

module.exports = sendTestEmail;

sendTestEmail().catch(console.error);