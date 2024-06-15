const User = require('../models/userModel');

const sendToken = async(user, statusCode, res) => {
  const accessToken = user.getJWTToken(process.env.JWT_EXPIRY, process.env.JWT_SECRET);

  const refreshToken = user.getJWTToken(process.env.REFRESH_EXPIRY, process.env.REFRESH_SECRET);

  await User.updateOne({ _id: user._id },
    { $set: { refreshToken: refreshToken} }
  );

  const options = {
    expires: new Date(
      Date.now() + process.env.COOKIE_EXPIRY * 30 * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
  };

  res.status(statusCode).cookie("refreshToken", refreshToken, options).header("Authorization", accessToken).json({
    success: true,
    refreshToken,
    user,
  });
  // res.setHeader("Authorization", token);
  // res.send();
  // res.status(statusCode).cookie("token", token, options).json({
  //   success: true,
  //   token,
  //   user
  // })
  // res.status(statusCode)
  // res.setHeader("Authorization", token);
  // res.send();
};

module.exports = sendToken;
