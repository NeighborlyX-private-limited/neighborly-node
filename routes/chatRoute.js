const express = require("express");
const router = express.Router();
const { isAuthenticated } = require("../middlewares/auth");

const {
  fetchUserChats,
  fetchGroupMessages,
  fetchMessageThread,
} = require("../controllers/chatController");

router.route("/fetch-user-chats").get(isAuthenticated, fetchUserChats);
router
  .route("/fetch-group-messages/:groupId")
  .get(isAuthenticated, fetchGroupMessages);
router
  .route("/fetch-message-thread/:messageId")
  .get(isAuthenticated, fetchMessageThread);
module.exports = router;
