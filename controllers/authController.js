const { generateUsername } = require("unique-username-generator");
const User = require("../models/userModel");
const ErrorHandler = require("../utils/errorHandler");
const sendToken = require("../utils/jwtToken");
const { activityLogger, errorLogger } = require("../utils/logger");
const bcrypt = require("bcryptjs");
const otpGenerator = require("otp-generator");
const dotenv = require("dotenv");

const { sendVerificationEmail, forgotPasswordEmail } = require("../utils/emailService");

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
    console.log(email);
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
  const { password, email } = req.body;
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

    if (user.isVerified) {
      activityLogger.info("Email is already verified");
      return res.status(400).json({ error: "Email is already verified" });
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
  const { email, otp } = req.body;

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
    await User.updateOne({_id: user._id}, {
      $set: {otp: null, otpExpiry: null, isVerified: true}
    })
    activityLogger.info("Email verified successfully");

    res.status(200).json({ message: "Email verified successfully" });
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
  res.clearCookie("token");
  req.session.destroy(() => {
    activityLogger.info("session destroyed successfully");
  });
  res.end();
};
exports.googleAuth = async (req, res) => {
  const email = req.user.email;
  const user = await User.findOne({ email: email });
  if (user === null) {
    try {
      let username = generateUsername() + Math.floor(Math.random() * 10000);
      while (await User.findOne({ username })) {
        username = generateUsername() + Math.floor(Math.random() * 10000);
        activityLogger.info(
          `Registration attempt for user with username ${username}.`
        );
      }
      const picture = `https://api.multiavatar.com/${username}.png?apikey=${AVATAR_KEY}`;
      const newUser = await User.create({
        username: username,
        email: email.toLowerCase(),
        picture: picture,
        auth_type: "google",
      });
      activityLogger.info("new user added by Google");
      sendToken(newUser, 200, res);
    } catch (err) {
      errorLogger.error("There is a problem in Google authentication");
    }
  } else {
    activityLogger.info(
      `${user.username} successfully logged in by Google authentication`
    );
    sendToken(user, 200, res);
  }
};

exports.forgotPassword = async(req, res) => {
  const {email} = req.body;
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
}
