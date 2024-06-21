const { generateUsername } = require("unique-username-generator");
const User = require("../models/userModel");
const ErrorHandler = require("../utils/errorHandler");
const sendToken = require("../utils/jwtToken");
const { activityLogger, errorLogger } = require("../utils/logger");
const bcrypt = require("bcryptjs");
const otpGenerator = require("otp-generator");
const dotenv = require("dotenv");
const { OAuth2Client } = require("google-auth-library");

const {
  sendVerificationEmail,
  forgotPasswordEmail,
} = require("../utils/emailService");

const AVATAR_KEY = process.env.MULTI_AVATAR_API_KEY;

// User Login
exports.loginUser = async (req, res, next) => {
  const { userId, password } = req.body;
  let email = "";
  let username = "";
  let user;

  const emailRegex = /^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/;

  if (emailRegex.test(userId)) {
    email = userId.toLowerCase();
    user = await User.findOne({ email: email });
  } else {
    username = userId;
    user = await User.findOne({ username: username });
  }

  if (!user) {
    errorLogger.error(`Invalid email or password for ${user}`);
    return next(new ErrorHandler("Invalid Email or Password", 401));
  }

  const match = await user.comparePassword(password);

  if (!match) {
    errorLogger.error("An unexpected error occurred during login");
    return next(new ErrorHandler("Invalid Email or Password", 401));
  }
  activityLogger.info(
    `User ${user.username}(${user._id}) has logged in successfully`
  );
  sendToken(user, 200, res);
};

// User Register
exports.registerUser = async (req, res) => {
  const { password, email, dob, gender } = req.body;
  let username = generateUsername() + Math.floor(Math.random() * 10000);
  while (await User.findOne({ username })) {
    username = generateUsername() + Math.floor(Math.random() * 10000);
    activityLogger.info(
      `Registration attempt for user with username ${username}.`
    );
  }
  try {
    const picture = `https://api.multiavatar.com/${username}.png?apikey=${AVATAR_KEY}`;
    const user = await User.create({
      username: username,
      password: password,
      email: email.toLowerCase(),
      dob: dob,
      gender: gender,
      picture: picture,
      auth_type: "email",
    });

    sendToken(user, 200, res);
  } catch (error) {
    errorLogger.error(
      "An unexpected error occurred during user registration:",
      error
    );
    if (error.code === 11000 || error.code === 11001) {
      return res.status(400).json({
        error: "Duplicate Entry",
        message: Object.keys(error.keyValue)[0] + " already exists.",
      });
    }
    return res.status(400).json(error);
  }
};

//Send Verification mail

exports.sendOTP = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });

    activityLogger.info("Sending OTP for " + email);
    if (!user) {
      errorLogger.error("User not found");
      return res.status(400).json({ error: "User not found" });
    }

    await sendVerificationEmail(email);
    activityLogger.info("OTP sent");
    res.status(200).json({ msg: "OTP sent successfully" });
  } catch (error) {
    errorLogger.error(`An error occured:${error}`);
    res.status(500).json({ error: error.message });
  }
};

//Verify OTP
exports.verifyOTP = async (req, res) => {
  const { email, otp, verificationFor } = req.body;

  try {
    const user = await User.findOne({ email });
    activityLogger.info("Verifying OTP for " + email);
    if (!user) {
      errorLogger.error("Invalid Email!");
      return res.status(400).json({ error: "Invalid email or OTP" });
    }

    if (user.otp !== otp) {
      errorLogger.error("Invalid OTP!");
      return res.status(400).json({ error: `Invalid OTP` });
    }
    if (user.otpExpiry < Date.now()) {
      errorLogger.error("Expired OTP!");
      return res.status(400).json({ error: "OTP has expired" });
    }
    // No logic change for forget password as it does not matter much, change required here if needed
    await User.updateOne(
      { _id: user._id },
      {
        $set: { otp: null, otpExpiry: null, isVerified: true },
      }
    );
    if (verificationFor === "email-verify") {
      activityLogger.info("Email verified successfully for " + email);
      res.status(200).json({ message: "Email verified successfully" });
    } else if (verificationFor === "forgot-password") {
      activityLogger.info(
        "Password changed OTP verified. Proceeding to change password for " +
          email
      );
      res
        .status(200)
        .json({ message: "Reset password OTP verified successfully" });
    } else {
      // TODO this logic needs to be changed as we are currently only taking email in req params
      activityLogger.info("Phone number OTP verified for " + email);
      res.status(200).json({ message: "Phone number verified successfully" });
    }
  } catch (error) {
    res.status(500).json({
      error: `An error occurred while verifying OTP: ${error.message}`,
    });
  }
};

//Logout User
exports.logoutUser = async (req, res, next) => {
  const user = req.user.username;
  activityLogger.info(`${user} logged out`);
  res.clearCookie("refreshToken");
  req.session.destroy(() => {
    activityLogger.info("session destroyed successfully");
  });
  res.end();
};

exports.googleAuth = async (req, res) => {
  try {
    const { token } = req.body;
    const client = new OAuth2Client();
    const ticket = await client.verifyIdToken({
      idToken: token,
      requiredAudience: process.env.CLIENT_ID,
    });
    const payload = ticket.getPayload();

    if (!payload) {
      errorLogger.error("Invalid token provided for Oauth");
      res.status(400).json({
        message: "invalid token",
      });
    }

    const { email, email_verified, given_name, family_name } = payload;

    if (!email_verified) {
      errorLogger.error("Email is not verified");
      res.status(400).json({
        message: "Email is not verified",
      });
    }
    let username = generateUsername() + Math.floor(Math.random() * 10000);
    while (await User.findOne({ username })) {
      username = generateUsername() + Math.floor(Math.random() * 10000);
    }
    try {
      const picture = `https://api.multiavatar.com/${username}.png?apikey=${AVATAR_KEY}`;
      const user = await User.create({
        username: username,
        password: password,
        email: email.toLowerCase(),
        picture: picture,
        auth_type: "email",
      });
      activityLogger.info("User logged in successfully");
      sendToken(user, 200, res);
    } catch (error) {
      errorLogger.error("Error in Oauth:", err);
      res.status(500).json({
        message: err,
      });
    }
  } catch (err) {
    errorLogger.error("Error in Oauth:", err);
    res.status(500).json({
      message: "Error in Oauth",
    });
  }
};

exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });

    if (!user) {
      errorLogger.error("User not found");
      return res.status(400).json({ error: "User not found" });
    }
    await forgotPasswordEmail(email);
    activityLogger.info("forgot password email sent");
    res.status(200).json({ msg: "forgot-password email sent successfully" });
  } catch (error) {
    errorLogger.error(`An error occured in forgotPassword:${error}`);
    res.status(500).json({ error: error.message });
  }
};
