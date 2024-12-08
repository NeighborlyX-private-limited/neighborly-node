const express = require("express");
const { isAuthenticated } = require("../middlewares/auth");
const { isBanned } = require("../middlewares/bannedValidity");
const { hasValidKarma } = require("../middlewares/karmaValidity");
const {
  singleFileUpload,
  multipleFilesUpload,
} = require("../middlewares/fileUpload");
const router = express.Router();

const {
  findPosts,
  feedback,
  createPost,
  deleteData,
  report,
  giveAward,
  search,
} = require("../controllers/wallController");

router.route("/fetch-posts").get(isAuthenticated, findPosts);
router.route("/fetch-posts/:postId?").get(isAuthenticated, findPosts);
router.route("/search").get(isAuthenticated, search);
router.route("/feedback").put(isAuthenticated, feedback);
router
  .route("/create-post")
  .post(
    isAuthenticated,
    isBanned,
    hasValidKarma,
    multipleFilesUpload,
    createPost
  );
router.route("/delete/:type/:id").delete(isAuthenticated, deleteData);
router.route("/report").post(isAuthenticated, report);
router.post("/give-award", isAuthenticated, giveAward);

module.exports = router;
