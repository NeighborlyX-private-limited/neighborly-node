const rateLimit = require("express-rate-limit");

exports.otpLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 1,
  message: "Too many requests, please try again after a minute.",
  standardHeaders: true,
  legacyHeaders: false,
});

exports.updateLocationLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 10, // 10 requests per minute
  message: "Too many location updates, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

exports.fetchCitiesLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 60, // 60 requests per minute
  message: "Too many requests for cities, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

exports.uploadFileLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 30, // 30 requests per minute
  message: "Too many file uploads, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

exports.findNearbyGroupsLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 60, // 60 requests per minute
  message: "Too many requests for nearby groups, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

exports.fetchGroupDetailsLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 60, // 60 requests per minute
  message: "Too many requests for group details, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

exports.fetchNearbyUsersLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 60, // 60 requests per minute
  message: "Too many requests for nearby users, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

exports.searchGroupLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 60, // 60 requests per minute
  message: "Too many search requests, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});
