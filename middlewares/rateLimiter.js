const rateLimit = require("express-rate-limit");

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 5, 
  message: "Too many requests, please try again later.",
});

module.exports ={otpLimiter};