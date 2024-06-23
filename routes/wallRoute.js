const express = require("express");
const { isAuthenticated } = require("../middlewares/auth");

const router = express.Router();

const {
  findPosts,
  feedback,
  createPost,
  deleteData,
  report,
  giveAward,
} = require("../controllers/wallController");

router.route("/fetch-posts").get(isAuthenticated, findPosts);
router.route("/fetch-posts/:postId?").get(isAuthenticated, findPosts);
router.route("/feedback").put(isAuthenticated, feedback);
router.route("/create-post").post(isAuthenticated, createPost);
router.route("/delete/:type/:id").delete(isAuthenticated, deleteData);
router.route("/report").post(isAuthenticated, report);
router.post("/give-award", isAuthenticated, giveAward);

module.exports = router;
