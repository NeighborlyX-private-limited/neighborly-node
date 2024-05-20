const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD
  }
});

const sendVerificationEmail = async (userEmail, userId) => {
  const verificationLink = `https://yourdomain.com/verify?token=${userId}`; // Adjust according to your token handling

  const mailOptions = {
    from: `"Neighborly" <${process.env.SMTP_USER}>`,
    to: userEmail,
    subject: 'Verify Your Email Address',
    html: `<p>Please verify your email by clicking on the link:</p>
           <a href="${verificationLink}">${verificationLink}</a>`
  };

  return transporter.sendMail(mailOptions);
};

module.exports = { sendVerificationEmail };
