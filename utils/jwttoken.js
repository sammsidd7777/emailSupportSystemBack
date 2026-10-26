
const jwt = require("jsonwebtoken");

const createAccessToken = async (
  user,
  res,
  message,
  tokenLife,
  tokenTime
) => {
  const token = jwt.sign(
    { id: user?._id },
    process.env.JWT_SECRET,
    { expiresIn: tokenLife }
  );

res.cookie("token", token, {
  httpOnly: true,
  secure: true,
  sameSite: "none",
  maxAge: 7 * 24* 60 *60 *100,
  path: "/",
});

  return res.status(200).json({
    success: true,
    message,
    user: {
      id: user._id,
      Name: user.Name,
      Email: user.Email,
      Role: user.Role,
    },
  });
};

module.exports = createAccessToken;
