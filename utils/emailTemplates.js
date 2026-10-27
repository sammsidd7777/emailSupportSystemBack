
const escapeHtml = (value = "") =>
  String(value).replace(/[&<>"']/g, (char) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };

    return entities[char];
  });

const emailLayout = (content) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <title>BitMax Support</title>
</head>
<body style="margin:0;padding:0;background:#f1f2f4;
  font-family:Arial,Helvetica,sans-serif;color:#202124;">

  <table role="presentation" width="100%" cellpadding="0"
    cellspacing="0" border="0" style="background:#f1f2f4;">
    <tr>
      <td align="center" style="padding:28px 12px;">

        <table role="presentation" width="600" cellpadding="0"
          cellspacing="0" border="0"
          style="width:100%;max-width:600px;background:#ffffff;
          border-radius:14px;overflow:hidden;">

          <tr>
            <td align="center"
              style="background:#101012;padding:30px 20px;
              border-bottom:3px solid #d6ad55;">

              <h1 style="margin:0;color:#ffffff;font-size:28px;
                letter-spacing:4px;">BITMAX</h1>

              <p style="margin:9px 0 0;color:#d6ad55;
                font-size:11px;letter-spacing:2px;">
                CUSTOMER SUPPORT SYSTEM
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:30px 24px;">
              ${content}
            </td>
          </tr>

          <tr>
            <td align="center"
              style="background:#f7f7f8;border-top:1px solid #eeeeef;
              padding:22px 16px;">

              <p style="margin:0;color:#333333;font-size:13px;
                font-weight:bold;">BitMax Support Team</p>

              <p style="margin:8px 0 0;color:#888888;font-size:11px;
                line-height:1.7;">
                This is an automated notification from BitMax Support.
                Please do not reply directly to this email.
              </p>

              <p style="margin:10px 0 0;color:#aaaaaa;font-size:10px;">
                &copy; ${new Date().getFullYear()} BitMax
              </p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>
</body>
</html>
`;

const ticketCard = (ticket) => `
  <table role="presentation" width="100%" cellpadding="0"
    cellspacing="0" border="0"
    style="background:#f8f8fa;border:1px solid #e5e5e8;
    border-radius:10px;margin:22px 0;">

    <tr>
      <td style="padding:20px;">

        <p style="margin:0;color:#888888;font-size:11px;
          letter-spacing:1px;">TICKET NUMBER</p>

        <h2 style="margin:8px 0 22px;color:#171717;font-size:23px;">
          ${escapeHtml(ticket.TicketNumber || "N/A")}
        </h2>

        <p style="margin:0;color:#888888;font-size:11px;
          letter-spacing:1px;">SUBJECT</p>

        <p style="margin:8px 0 20px;color:#222222;font-size:15px;
          line-height:1.6;font-weight:bold;">
          ${escapeHtml(ticket.Subject || "Support Request")}
        </p>

        <p style="margin:0 0 9px;color:#888888;font-size:11px;">
          CURRENT STATUS
        </p>

        <span style="display:inline-block;background:#fff0cc;
          color:#805c00;padding:8px 12px;border-radius:20px;
          font-size:12px;font-weight:bold;">
          In Progress
        </span>

      </td>
    </tr>
  </table>
`;

const actionButton = (url, label) => `
  <table role="presentation" cellpadding="0" cellspacing="0"
    border="0" style="margin:24px 0;">
    <tr>
      <td align="center" bgcolor="#d6ad55"
        style="border-radius:7px;">

        <a href="${escapeHtml(url)}"
          style="display:inline-block;padding:14px 22px;
          color:#111111;text-decoration:none;font-size:14px;
          font-weight:bold;border-radius:7px;">
          ${escapeHtml(label)}
        </a>

      </td>
    </tr>
  </table>
`;

const createAgentAssignmentEmail = ({
  agent,
  ticket,
  dashboardUrl,
}) => {
  const subject = `New Ticket Assigned: ${ticket.TicketNumber}`;

  const html = emailLayout(`
    <span style="display:inline-block;background:#fff0cc;
      color:#805c00;padding:8px 12px;border-radius:20px;
      font-size:11px;font-weight:bold;letter-spacing:1px;">
      NEW ASSIGNMENT
    </span>

    <h2 style="margin:22px 0 12px;color:#171717;
      font-size:26px;line-height:1.3;">
      A new ticket is waiting for you.
    </h2>

    <p style="margin:0;color:#606067;font-size:14px;line-height:1.8;">
      Hello ${escapeHtml(agent.Name || "Support Agent")},
    </p>

    <p style="margin:8px 0 0;color:#606067;font-size:14px;
      line-height:1.8;">
      A new customer support ticket has been assigned to you.
      Please review the issue and respond to the customer as soon
      as possible.
    </p>

    ${ticketCard(ticket)}

    <p style="margin:0;color:#606067;font-size:14px;line-height:1.8;">
      Please open your agent dashboard to review the conversation,
      send a reply, and manage the ticket status.
    </p>

    ${actionButton(dashboardUrl, "Open Agent Dashboard →")}

    <p style="margin:24px 0 0;color:#606067;font-size:14px;">
      Best regards,<br>
      <strong style="color:#171717;">BitMax Support Team</strong>
    </p>
  `);

  const text = `
Hello ${agent.Name || "Support Agent"},

A new ticket has been assigned to you.

Ticket Number: ${ticket.TicketNumber}
Subject: ${ticket.Subject}
Status: In Progress

Open your agent dashboard:
${dashboardUrl}

Regards,
BitMax Support Team
  `.trim();

  return { subject, html, text };
};

const createCustomerAssignmentEmail = ({
  ticket,
  dashboardUrl,
}) => {
  const subject = `Your Ticket Has Been Assigned: ${ticket.TicketNumber}`;

  const html = emailLayout(`
    <div style="text-align:center;margin-bottom:20px;">
      <div style="display:inline-block;background:#e8f6ec;
        color:#21864b;width:52px;height:52px;line-height:52px;
        border-radius:50%;font-size:28px;font-weight:bold;">
        &#10003;
      </div>

      <h2 style="margin:16px 0 8px;color:#171717;
        font-size:25px;line-height:1.35;">
        Your ticket has been assigned!
      </h2>

      <p style="margin:0;color:#777777;font-size:13px;">
        Your support request is now with our team.
      </p>
    </div>

    <p style="margin:0;color:#606067;font-size:14px;line-height:1.8;">
      Hello ${escapeHtml(ticket.RequesterName || "Customer")},
    </p>

    <p style="margin:8px 0 0;color:#606067;font-size:14px;
      line-height:1.8;">
      Thank you for contacting BitMax Support. Your ticket has
      been assigned to our support team. An agent will review
      your issue and respond as soon as possible.
    </p>

    ${ticketCard(ticket)}

    <p style="margin:0;color:#606067;font-size:14px;line-height:1.8;">
      You can visit your support dashboard to view your ticket
      and check the latest conversation updates.
    </p>

    ${actionButton(dashboardUrl, "View My Ticket →")}

    <p style="margin:24px 0 0;color:#606067;font-size:14px;
      line-height:1.8;">
      We appreciate your patience.<br><br>
      Best regards,<br>
      <strong style="color:#171717;">BitMax Support Team</strong>
    </p>
  `);

  const text = `
Hello ${ticket.RequesterName || "Customer"},

Your support ticket has been assigned to our team.

Ticket Number: ${ticket.TicketNumber}
Subject: ${ticket.Subject}
Status: In Progress

View your ticket:
${dashboardUrl}

Thank you for contacting BitMax Support.

Regards,
BitMax Support Team
  `.trim();

  return { subject, html, text };
};

module.exports = {
  createAgentAssignmentEmail,
  createCustomerAssignmentEmail,
};
