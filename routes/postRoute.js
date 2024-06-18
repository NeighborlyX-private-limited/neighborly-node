const express = require("express");
const { isAuthenticated } = require("../middlewares/auth");
const router = express.Router();

const {
  fetchCommentThread,
  fetchComments,
  addComment,
} = require("../controllers/postController");

router.route("/fetch-comments/:postId").get(isAuthenticated, fetchComments);
router
  .route("/fetch-comment-thread/:id")
  .get(isAuthenticated, fetchCommentThread);
router.route("/add-comment").post(isAuthenticated, addComment);

module.exports = router;
