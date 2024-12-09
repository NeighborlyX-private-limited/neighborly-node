const rateLimit = require("express-rate-limit");

exports.otpLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 1,
  message: "Too many requests, please try again after a minute.",
  standardHeaders: true,
  legacyHeaders: false,
});
