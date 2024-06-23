const ErrorHandler = require("../utils/errorHandler");
const jwt = require("jsonwebtoken");
const User = require("../models/userModel");

exports.isAuthenticated = async (req, res, next) => {
  const { refreshToken } = req.cookies;

  const accessToken = req.headers["authorization"];

  if (!accessToken && !refreshToken) {
    return res.status(401).send("Access Denied. No token provided.");
  }

  try {
    const accessToken = token.substring(7);
    const decodedData = jwt.verify(accessToken, process.env.JWT_SECRET);
    req.user = await User.findById(decodedData.id);
    next();
  } catch (error) {
    if (!refreshToken) {
      return res.status(401).send("Access Denied. No refresh token provided.");
    }

    try {
      const decoded = jwt.verify(refreshToken, process.env.REFRESH_SECRET);
      const user = await User.findById(decoded.id);
      const accesstoken = user.getJWTToken(
        process.env.JWT_EXPIRY,
        process.env.JWT_SECRET
      );
      req.user = user;
      res.header("Authorization", accesstoken);
      next();
    } catch (error) {
      return res.status(400).send("Invalid Token.");
    }
  }
};
