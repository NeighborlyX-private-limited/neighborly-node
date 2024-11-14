const express = require("express");
const otpLimiter = require("../middlewares/rateLimiter");
const { isAuthenticated } = require("../middlewares/auth");
const router = express.Router();
const {
  loginUser,
  registerUser,
  logoutUser,
  sendOTP,
  googleAuth,
  verifyOTP,
  forgotPassword,
  sendPhoneOTP,
  verifyPhoneOTP,
} = require("../controllers/authController");

router.route("/login").post(loginUser);
router.route("/register").post(registerUser);
router.route("/logout").get(isAuthenticated, logoutUser);

//router.route("/send-otp").post(sendOTP);
router.route("/send-otp").post(otpLimiter, sendOTP); // Apply rate limiter only to this route

router.route("/verify-otp").post(verifyOTP);
router.route("/forgot-password").post(forgotPassword);

router.route("/google/login").post(googleAuth);

router.route("/send-phone-otp").post(sendPhoneOTP);
router.route("/verify-phone-otp").post(verifyPhoneOTP);

module.exports = router;
