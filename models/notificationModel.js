const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const NotificationSchema = new Schema({
  notificationId: {
    type: String,
    required: true,
    unique: true,
  },
  userId: {
    type: String,
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  eventType: {
    type: String,
    required: true, // e.g., "group_message", "comment"
  },
  data: {
    groupId: String,
    postId: String,
    commentId: String,
    messageId: String,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  status: {
    type: String,
    default: "unread",
  },
  firebaseMessageId: {
    type: String,
  },
});

module.exports = mongoose.model("Notification", NotificationSchema);
