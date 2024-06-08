const nodemailer = require("nodemailer");
const otpGenerator = require("otp-generator");
const User = require("../models/userModel");
require("dotenv").config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORTE,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

const sendVerificationEmail = async (userEmail) => {
  const otp = otpgenerator();
  const otpExpiry = new Date(Date.now() + 15 * 60 * 1000);

  const user = await User.findOneAndUpdate(
    { email: userEmail },
    { otp, otpExpiry },
    { new: true }
  );

  const mailOptions = {
    from: `"Neighborly" <${process.env.SMTP_USER}>`,
    to: userEmail,
    subject: "Verify Your Email Address",
    html: `<p>Please verify your email using the following OTP: <strong>${otp}</strong></p>`,
  };

  return transporter.sendMail(mailOptions);
};

const forgotPasswordEmail = async (userEmail) => {
  const otp = otpgenerator();
  const otpExpiry = new Date(Date.now() + 15 * 60 * 1000);

  const user = await User.findOneAndUpdate(
    { email: userEmail },
    { otp, otpExpiry },
    { new: true }
  );
  const mailOptions = {
    from: `"Neighborly" <${process.env.SMTP_USER}>`,
    to: userEmail,
    subject: "Generate a new Password",
    html: `<p>Hi,</p><p>Here is the OTP to reset your password: <strong>${otp}</strong> </p>`,
  };

  return transporter.sendMail(mailOptions);
};

const otpgenerator = () => {
  const otp = otpGenerator.generate(6, {
    upperCaseAlphabets: false,
    lowerCaseAlphabets: false,
    specialChars: false,
  });
  return otp;
};

module.exports = { sendVerificationEmail, forgotPasswordEmail, otpgenerator };
