const express = require("express");
const router = express.Router();
const { isAuthenticated } = require("../middlewares/auth");

const {
  fetchUserChats,
  fetchLastMessages,
} = require("../controllers/chatController");

router.route("/fetch-user-chats").get(isAuthenticated, fetchUserChats);
router
  .route("/fetch-group-messages/:groupId")
  .get(isAuthenticated, fetchLastMessages);
module.exports = router;
