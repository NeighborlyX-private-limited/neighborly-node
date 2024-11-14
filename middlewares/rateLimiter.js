/*
const rateLimit = require("express-rate-limit");

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: "Too many requests, please try again later.",
});

module.exports = { otpLimiter };
*/



const rateLimit = require("express-rate-limit");

// Rate limiter for OTP requests: 1 request per minute
const otpLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 1, // Limit each IP to 1 request per windowMs
  message: "Too many requests, please try again after a minute.", // Custom error message
  standardHeaders: true, // Includes rate limit info in headers
  legacyHeaders: false, // Disables legacy X-RateLimit-* headers
});

module.exports = otpLimiter;


/*
const rateLimit = require("express-rate-limit");
const { MemoryStore } = require("express-rate-limit");

// Rate limiter based on user ID with a custom error message
const otpLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 1, // Limit each user to 1 request per minute
  keyGenerator: (req) => {
    // Ensure req.user is defined
    if (!req.user || !req.user.id) {
      throw new Error("User not authenticated. Rate limiting requires authentication.");
    }
    return req.user.id; // Use user ID for rate-limiting key
  },
  handler: (req, res) => {
    res.status(429).json({ message: "Only one OTP request per minute is allowed." });
  },
  store: new MemoryStore(), // Store rate limits in memory
});

module.exports = otpLimiter;
*/







