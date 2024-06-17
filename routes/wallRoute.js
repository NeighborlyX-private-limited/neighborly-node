const express = require("express");
const { isAuthenticated } = require("../middlewares/auth");

const router = express.Router();

const {
  findPosts,
  feedBack,
  createPost,
  fetchPostById,
  deletePost,
  reportPost,
  fetchCommentThread,
} = require("../controllers/wallController");

router.route("/fetch-posts").get(isAuthenticated, findPosts);
router.route("/feedback-post").put(isAuthenticated, feedBack);
router.route("/create-post").post(isAuthenticated, createPost);
router.route("/delete-post/:postId").delete(isAuthenticated, deletePost);
router.route("/report-post").post(isAuthenticated, reportPost);
router.route("/posts/:id").get(isAuthenticated, fetchPostById);
router
  .route("/fetch-comment-thread/:id")
  .get(isAuthenticated, fetchCommentThread);

module.exports = router;
