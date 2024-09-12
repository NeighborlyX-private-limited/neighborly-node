const express = require("express");
const router = express.Router();
const { isAuthenticated } = require("../middlewares/auth");

const { fetchUserChats } = require("../controllers/chatController");

router.route("/fetch-user-chats").get(isAuthenticated, fetchUserChats);
module.exports = router;
