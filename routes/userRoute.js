const express = require("express");
const {
  loggedInUser,
  userinfo,
  getUserGroups,
  updatePicture,
  updateLocation,
  fetchCities,
  fetchPreSignedURL,
  changePassword,
  deleteUser,
  findMe
} = require("../controllers/userController");
const { isAuthenticated } = require("../middlewares/auth");
const router = express.Router();

router.route("/me").get(isAuthenticated, loggedInUser);
router.route("/user-info").get(isAuthenticated, userinfo);
router.route("/get-user-groups").get(isAuthenticated, getUserGroups);
router.route("/update-user-picture").put(isAuthenticated, updatePicture);
router.route("/update-user-location").put(isAuthenticated, updateLocation);
router.route("/change-password").put(isAuthenticated, changePassword);
router.route("/delete-user").delete(isAuthenticated, deleteUser);
router.route("/find-me").get(isAuthenticated, findMe);
router.route("/fetch-cities").get(fetchCities);
router.route("/get-presigned-url").get(fetchPreSignedURL);
module.exports = router;
