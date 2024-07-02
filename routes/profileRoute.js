const express = require("express");
const { isAuthenticated } = require("../middlewares/auth");
const router = express.Router();

const {
  getUserPosts,
  getUserPolls,
  getUserAwards,
  getUserComments,
  getUserGroups,
} = require("../controllers/profileController");

router.route("/user-posts/:userId?").get(isAuthenticated, getUserPosts);
router.route("/user-polls/:userId?").get(isAuthenticated, getUserPolls);
router.route("/user-awards/:userId?").get(isAuthenticated, getUserAwards);
router.route("/user-comments/:userId?").get(isAuthenticated, getUserComments);
router.route("/user-groups/:userId?").get(isAuthenticated, getUserGroups);

module.exports = router;
