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
  deleteUser
} = require("../controllers/userController");
const { isAuthenticated } = require("../middlewares/auth");

const router = express.Router();

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
router.route("/fetch-cities").get(fetchCities);
router.route("/get-presigned-url").get(fetchPreSignedURL);
router.route("/get-avatar").get(getAvatar);

module.exports = router;
