const express = require("express");
const { isAuthenticated } = require("../middlewares/auth");
const { singleFileUpload } = require("../middlewares/fileUpload");
const { checkActiveAccount } = require("../middlewares/userDeleted");
const router = express.Router();

const {
  getUserContent,
  getUserAwards,
  getUserComments,
  getUserGroups,
  getUserInfo,
  submitFeedback,
  editUserInfo,
  deleteAccount,
  getAwards,
} = require("../controllers/profileController");

router
  .route("/user-content/:userId?")
  .get(isAuthenticated, checkActiveAccount, getUserContent);
router
  .route("/user-awards/:userId?")
  .get(isAuthenticated, checkActiveAccount, getUserAwards);
router
  .route("/awards/:userId?")
  .get(isAuthenticated, checkActiveAccount, getAwards);
router
  .route("/user-comments/:userId?")
  .get(isAuthenticated, checkActiveAccount, getUserComments);
router
  .route("/user-groups/:userId?")
  .get(isAuthenticated, checkActiveAccount, getUserGroups);
router
  .route("/user-info/:userId?")
  .get(isAuthenticated, checkActiveAccount, getUserInfo);
router
  .route("/send-feedback")
  .post(isAuthenticated, checkActiveAccount, submitFeedback);
router
  .route("/edit-user-info")
  .put(isAuthenticated, singleFileUpload, editUserInfo);
router
  .route("/delete-account")
  .delete(isAuthenticated, checkActiveAccount, deleteAccount);

module.exports = router;
