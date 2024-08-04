const { generateUsername } = require("unique-username-generator");
const axios = require("axios");
const User = require("../models/userModel");
const ErrorHandler = require("../utils/errorHandler");
const sendToken = require("../utils/jwtToken");
const { activityLogger, errorLogger } = require("../utils/logger");
const bcrypt = require("bcryptjs");
const otpGenerator = require("otp-generator");
const dotenv = require("dotenv");
const { OAuth2Client } = require("google-auth-library");
const client = new OAuth2Client(process.env.CLIENT_ID);
const textlocalApiKey = process.env.TEXTLOCAL_API_KEY;
const {
  sendVerificationEmail,
  forgotPasswordEmail,
  otpgenerator,
} = require("../utils/emailService");
const {
  MESSAGE_TEMPLATE,
  MESSAGE_API_ENDPOINT,
} = require("../utils/constants");
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

  if (user.isDeleted) {
    errorLogger.error(`Attempt to login with a deleted account: ${userId}`);
    return next(new ErrorHandler("This account has been deleted", 401));
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
  const { password, email, phoneNumber } = req.body;
  let username = generateUsername() + Math.floor(Math.random() * 10000);
  while (await User.findOne({ username })) {
    username = generateUsername() + Math.floor(Math.random() * 10000);
    activityLogger.info(
      `Registration attempt for user with username ${username}.`
    );
  }

  try {
    if (email) {
      const picture = `https://api.multiavatar.com/${username}.png?apikey=${AVATAR_KEY}`;
      const user = await User.create({
        username: username,
        password: password,
        email: email.toLowerCase(),
        picture: picture,
        bio: null,
        auth_type: email ? "email" : "phone",
      });
      sendToken(user, 200, res);
    } else if (phoneNumber) {
      const picture = `https://api.multiavatar.com/${username}.png?apikey=${AVATAR_KEY}`;
      const user = await User.create({
        username: username,
        password: password,
        phoneNumber: phoneNumber,
        picture: picture,
        bio: null,
        auth_type: email ? "email" : "phone",
      });
      sendToken(user, 200, res);
    }
  } catch (error) {
    errorLogger.error(
      "An unexpected error occurred during user registration:",
      error
    );
    if (error.code === 11000 || error.code === 11001) {
      return res.status(400).json({
        error: "Duplicate Entry",
        message: "Email/phone already exists.",
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
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.CLIENT_ID,
    });
    const payload = ticket.getPayload();

    if (!payload) {
      errorLogger.error("Invalid token provided for Oauth");
      return res.status(400).json({
        message: "Invalid token",
      });
    }

    const { email, email_verified, given_name, family_name } = payload;

    if (!email_verified) {
      errorLogger.error("Email is not verified");
      return res.status(400).json({
        message: "Email is not verified",
      });
    }

    let user = await User.findOne({ email: email.toLowerCase() });

    if (user) {
      if (user.isDeleted) {
        errorLogger.error(`Attempt to login with a deleted account: ${email}`);
        return res.status(401).json({
          message: "This account has been deleted",
        });
      }

      activityLogger.info(
        `User ${user.username}(${user._id}) has logged in successfully via Google`
      );
      return sendToken(user, 200, res);
    }

    let username = generateUsername() + Math.floor(Math.random() * 10000);
    while (await User.findOne({ username })) {
      username = generateUsername() + Math.floor(Math.random() * 10000);
    }

    try {
      const picture = `https://api.multiavatar.com/${username}.png?apikey=${process.env.AVATAR_KEY}`;
      user = await User.create({
        username: username,
        email: email.toLowerCase(),
        picture: picture,
        auth_type: "google",
      });
      activityLogger.info("User created and logged in successfully via Google");
      return sendToken(user, 200, res);
    } catch (error) {
      errorLogger.error("Error in Oauth:", error);
      return res.status(500).json({
        message: "Internal Server Error",
      });
    }
  } catch (err) {
    errorLogger.error("Error in Oauth:", err);
    return res.status(500).json({
      message: "Internal Server Error",
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

exports.sendPhoneOTP = async (req, res, next) => {
  const { phoneNumber } = req.body;
  if (!phoneNumber) {
    errorLogger.error("phone number is required");
    return next(new ErrorHandler("phone number is required", 400));
  }
  let user = await User.findOne({ phoneNumber });
  if (!user) {
    return next(new ErrorHandler("User not found", 404));
  }
  const otp = otpgenerator();
  const message = MESSAGE_TEMPLATE.replace("{{otp}}", otp);
  const apiKey = process.env.TEXTLOCAL_API_KEY;

  const url = MESSAGE_API_ENDPOINT.replace("<apiKey>", apiKey)
    .replace("<phoneNumber>", `91${phoneNumber}`)
    .replace("<message>", encodeURIComponent(message));

  try {
    const response = await axios.get(url);

    if (response.data.status !== "success") {
      throw new Error(response.data.errors[0].message);
    }
    activityLogger.info(
      `Phone number OTP sent successfully for ${phoneNumber}`
    );
    let user = await User.findOne({ phoneNumber });
    user.otp = otp;
    await user.save();

    activityLogger.info(`OTP sent to PhoneNumber: ${phoneNumber}`);
    res.status(200).json({ message: "OTP sent successfully" });
  } catch (err) {
    errorLogger.error(`Failed to send OTP: ${err.message}`);
    return next(new ErrorHandler("Failed to send OTP", 500));
  }
};

//verify otp
exports.verifyPhoneOTP = async (req, res, next) => {
  const { phoneNumber, otp } = req.body;

  if (!phoneNumber || !otp) {
    errorLogger.error("Phone number and the Otp is required");
    return next(new ErrorHandler("phone number and otp are required", 400));
  }
  const user = await User.findOne({ phoneNumber });

  if (!user || user.otp !== otp) {
    errorLogger.error("Invalid Phone Number or Otp");
    return next(new ErrorHandler("Invalid phone Number or Otp", 401));
  }

  if (user.isDeleted) {
    errorLogger.error(
      `Attempt to login with a deleted account: ${phoneNumber}`
    );
    return next(new ErrorHandler("This account has been deleted", 401));
  }

  user.isPhoneVerified = true;
  user.otp = undefined; //clear OTP after verification
  await user.save();

  activityLogger.info(
    "user with phone Number ${PhoneNumber} has logged in successfully"
  );
  sendToken(user, 200, res);
};
