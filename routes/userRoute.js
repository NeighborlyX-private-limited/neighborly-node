const express = require("express");
const {
  loggedInUser,
  userinfo,
  updatePicture,
  updateLocation,
  fetchCities,
  uploadFile,
  changePassword,
  deleteUser,
  updateUserdob,
  saveFcmToken,
  updateTutorialInfo,
} = require("../controllers/userController");
const { isAuthenticated } = require("../middlewares/auth");
const { singleFileUpload } = require("../middlewares/fileUpload");
const router = express.Router();

router.route("/me").get(isAuthenticated, loggedInUser);
router.route("/user-info").get(isAuthenticated, userinfo);
router.route("/update-user-picture").put(isAuthenticated, updatePicture);
router.route("/update-user-location").put(isAuthenticated, updateLocation);
router.route("/change-password").put(changePassword);
router.route("/delete-user").delete(isAuthenticated, deleteUser);
router.route("/update-user-dob").put(isAuthenticated, updateUserdob);
router.route("/fetch-cities").get(fetchCities);
router.route("/upload-file").post(singleFileUpload, uploadFile);
router.route("/save-fcm-token").post(saveFcmToken);
router.route("/update-tutorial-info").put(isAuthenticated, updateTutorialInfo);

module.exports = router;
