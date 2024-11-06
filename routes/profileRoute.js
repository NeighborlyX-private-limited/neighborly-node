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
  .get(checkActiveAccount, isAuthenticated, getUserContent);
router
  .route("/user-awards/:userId?")
  .get(checkActiveAccount, isAuthenticated, getUserAwards);
router
  .route("/awards/:userId?")
  .get(checkActiveAccount, isAuthenticated, getAwards);
router
  .route("/user-comments/:userId?")
  .get(checkActiveAccount, isAuthenticated, getUserComments);
router
  .route("/user-groups/:userId?")
  .get(checkActiveAccount, isAuthenticated, getUserGroups);
router
  .route("/user-info/:userId?")
  .get(checkActiveAccount, isAuthenticated, getUserInfo);
router
  .route("/send-feedback")
  .post(checkActiveAccount, isAuthenticated, submitFeedback);
router
  .route("/edit-user-info")
  .put(isAuthenticated, singleFileUpload, editUserInfo);
router
  .route("/delete-account")
  .delete(checkActiveAccount, isAuthenticated, deleteAccount);

module.exports = router;
