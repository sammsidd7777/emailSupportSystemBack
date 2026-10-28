const PushToken = require("../module/PushToken");



exports.registerAdminToken = async (req, res) => {
  try {
    // Adapt this to your existing auth middleware.
    const user = req.user;

    if (!user || user.Role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only admins can register push notifications.",
      });
    }

    const { token } = req.body;

    if (typeof token !== "string" || !token.trim()) {
      return res.status(400).json({
        success: false,
        message: "A valid FCM token is required.",
      });
    }

    await PushToken.findOneAndUpdate(
      { token },
      {
        $set: {
          userId: user._id,
          token,
          role: "admin",
        },
      },
      { upsert: true, new: true, runValidators: true }
    );

    return res.status(200).json({
      success: true,
      message: "Admin device registered successfully.",
    });
  } catch (error) {
    console.error("Register push token error:", error);

    return res.status(500).json({
      success: false,
      message: "Could not register the device.",
    });
  }
};
