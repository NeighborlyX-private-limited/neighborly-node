const express = require("express");
const {
  loginUser,
  registerUser,
  loggedInUser,
  logoutUser,
  userinfo,
  getUserGroups,
  updatePicture,
  updateLocation,
  fetchCities,
  fetchPreSignedURL,
  changePassword,
  getAvatar,
  deleteUser,
  findMe,
  sendOTP,
  googleAuth
} = require("../controllers/userController");
const { isAuthenticated } = require("../middlewares/auth");
const passport = require('passport');
require('../passport');
const router = express.Router();

router.use(passport.initialize());
router.use(passport.session());

router.route("/login").post(loginUser);
router.route("/register").post(registerUser);
router.route("/me").get(isAuthenticated, loggedInUser);
router.route("/logout").get(isAuthenticated, logoutUser);
router.route("/user-info").get(isAuthenticated, userinfo);
router.route("/get-user-groups").get(isAuthenticated, getUserGroups);
router.route("/update-user-picture").put(isAuthenticated, updatePicture);
router.route("/update-user-location").put(isAuthenticated, updateLocation);
router.route("/change-password").put(isAuthenticated, changePassword);
router.route("/delete-user").delete(isAuthenticated, deleteUser);
router.route("/find-me").get(isAuthenticated, findMe);
router.route("/fetch-cities").get(fetchCities);
router.route("/get-presigned-url").get(fetchPreSignedURL);
router.route("/get-avatar").get(getAvatar);
router.route("/send-otp").get(sendOTP);
router.route("/google-auth").get(
  passport.authenticate('google', {
    scope:
      ['email', 'profile']
  }))
router.route('/google/callback').get(
  passport.authenticate('google', {
    successRedirect: '/user/success',
    failureRedirect: '/user/failure'
  }));
router.route('/success').get(googleAuth);
router.route('/failure').get((req, res) => {
  res.status(403).send("forbidden")
})
module.exports = router;
