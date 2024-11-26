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
  uploadFiles,
} = require("../controllers/userController");
const { isAuthenticated } = require("../middlewares/auth");
const {
  singleFileUpload,
  multipleFilesUpload,
} = require("../middlewares/fileUpload");

const {
  updateLocationLimiter,
  fetchCitiesLimiter,
  uploadFileLimiter,
} = require("../middlewares/rateLimiter");

const router = express.Router();

router.route("/me").get(isAuthenticated, loggedInUser);
router.route("/user-info").get(isAuthenticated, userinfo);
router.route("/update-user-picture").put(isAuthenticated, updatePicture);
router
  .route("/update-user-location/:cityLocation")
  .put(isAuthenticated, updateLocationLimiter, updateLocation);
router.route("/change-password").put(changePassword);
router.route("/delete-user").delete(isAuthenticated, deleteUser);
router.route("/update-user-dob").put(isAuthenticated, updateUserdob);
router.route("/fetch-cities").get(fetchCitiesLimiter, fetchCities);
router
  .route("/upload-file")
  .post(singleFileUpload, uploadFileLimiter, uploadFile);
router
  .route("/upload-files")
  .post(multipleFilesUpload, uploadFileLimiter, uploadFiles);
router.route("/save-fcm-token").post(saveFcmToken);
router.route("/update-tutorial-info").put(isAuthenticated, updateTutorialInfo);

module.exports = router;
