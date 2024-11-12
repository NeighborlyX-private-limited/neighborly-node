const express = require("express");
const { isAuthenticated } = require("../middlewares/auth");
const { isBanned } = require("../middlewares/bannedValidity");
const router = express.Router();

const {
  fetchCommentThread,
  fetchComments,
  addComment,
  sendPollVote,
  getComment,
} = require("../controllers/postController");

router.route("/fetch-comments/:postId").get(isAuthenticated, fetchComments);
router
  .route("/fetch-comment-thread/:id")
  .get(isAuthenticated, fetchCommentThread);
router.route("/add-comment").post(isAuthenticated, isBanned, addComment);
router.route("/send-poll-vote").post(isAuthenticated, sendPollVote);
router.route("/get-comment/:commentId").get(isAuthenticated, getComment);

module.exports = router;
