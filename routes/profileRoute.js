const express = require("express");
const { isAuthenticated } = require("../middlewares/auth");
const { singleFileUpload } = require("../middlewares/fileUpload");
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
} = require("../controllers/profileController");

router.route("/user-content/:userId?").get(isAuthenticated, getUserContent);
router.route("/user-awards/:userId?").get(isAuthenticated, getUserAwards);
router.route("/user-comments/:userId?").get(isAuthenticated, getUserComments);
router.route("/user-groups/:userId?").get(isAuthenticated, getUserGroups);
router.route("/user-info/:userId?").get(isAuthenticated, getUserInfo);
router.route("/send-feedback").post(isAuthenticated, submitFeedback);
router
  .route("/edit-user-info")
  .put(isAuthenticated, singleFileUpload, editUserInfo);
router.route("/delete-account").delete(isAuthenticated, deleteAccount);

module.exports = router;
