const express = require("express");
const { isAuthenticated } = require("../middlewares/auth");
const router = express.Router();
const passport = require("passport");
const { 
    loginUser,
    registerUser,
    logoutUser,
    sendOTP,
    googleAuth
} = require('../controllers/authController');

require("../middlewares/passport");

router.use(passport.initialize());
router.use(passport.session());

router.route("/login").post(loginUser);
router.route("/register").post(registerUser);
router.route("/logout").get(isAuthenticated, logoutUser);
router.route("/send-otp").get(sendOTP);
router.route("/google/oauth").get(
    passport.authenticate("google", {
        successRedirect: "/user/success",
        failureRedirect: "/user/failure",
    })
);
router.route("/success").get(googleAuth);
router.route("/failure").get((req, res) => {
    res.status(403).send("forbidden");
});
module.exports = router;