const express = require("express");
const { isAuthenticated } = require("../middlewares/auth");
const router = express.Router();

const {
  fetchPostById,
  fetchCommentThread,
} = require("../controllers/postController");

router.route("/fetch-post/:id").get(isAuthenticated, fetchPostById);
router
  .route("/fetch-comment-thread/:id")
  .get(isAuthenticated, fetchCommentThread);

module.exports = router;
