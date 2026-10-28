const { adminDashboard } = require("../controller/adminController");
const PushToken = require("../module/PushToken");



async function sendPushNotification({
  title,
  body,
  url = "/admin/tickets",
  ticketId = "",
}) {
  const devices = await PushToken.find({ role: "admin" })
    .select("token")
    .lean();

  if (!devices.length) {
    console.log("No registered admin push devices.");
    return;
  }

  const messages = devices.map((device) => ({
    token: device.token,

    notification: {
      title,
      body,
    },

    data: {
      url,
      ticketId: String(ticketId),
    },

    webpush: {
      notification: {
        icon: "/favicon.ico",
        tag: ticketId || "support-ticket",
      },
    },
  }));

  const result = await adminDashboard.messaging().sendEach(messages);

  // Remove tokens that Firebase confirms are no longer valid.
  const invalidTokens = [];

  result.responses.forEach((response, index) => {
    if (
      !response.success &&
      [
        "messaging/registration-token-not-registered",
        "messaging/invalid-registration-token",
      ].includes(response.error?.code)
    ) {
      invalidTokens.push(devices[index].token);
    }
  });

  if (invalidTokens.length) {
    await PushToken.deleteMany({
      token: { $in: invalidTokens },
    });
  }

  console.log(
    `Push notifications: ${result.successCount} succeeded, ` +
      `${result.failureCount} failed.`
  );
}

module.exports = sendPushNotification;
