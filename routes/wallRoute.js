const express = require("express");
const { isAuthenticated } = require("../middlewares/auth");

const router = express.Router();

const {
  findPosts,
  feedBack,
  createPost,
  fetchPostById,
  deletePost,
  fetchPollById,
  createPoll,
  deletePoll,
  reportPost,
} = require("../controllers/wallController");

router.route("/fetch-posts").get(isAuthenticated, findPosts);
router.route("/feedback-post").put(isAuthenticated, feedBack);
router.route("/create-post").post(isAuthenticated, createPost);
router.route("/delete-post/:postId").delete(isAuthenticated, deletePost);
router.route("/report-post").post(isAuthenticated, reportPost);
router.route("/posts/:id").get(isAuthenticated, fetchPostById);

// Poll-related routes
router.route("/polls/:id").get(isAuthenticated, fetchPollById);
router.route("/create-poll").post(isAuthenticated, createPoll);
router.route("/delete-poll/:id").delete(isAuthenticated, deletePoll);

module.exports = router;
