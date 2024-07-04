const express = require("express");
const { isAuthenticated } = require("../middlewares/auth");
const router = express.Router();

const {
  getUserContent,
  getUserAwards,
  getUserComments,
  getUserGroups,
  getUserInfo,
  submitFeedback,
} = require("../controllers/profileController");

router.route("/user-content/:userId?").get(isAuthenticated, getUserContent);
router.route("/user-awards/:userId?").get(isAuthenticated, getUserAwards);
router.route("/user-comments/:userId?").get(isAuthenticated, getUserComments);
router.route("/user-groups/:userId?").get(isAuthenticated, getUserGroups);
router.route("/user-info/:userId?").get(isAuthenticated, getUserInfo);
router.route("/send-feedback").post(isAuthenticated, submitFeedback);

module.exports = router;
