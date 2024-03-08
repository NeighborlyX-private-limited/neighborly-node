// messageModel.js
const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  group_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Group",
    required: true
  },
  sender: {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    senderName: {
      type: String,
      required: true
    }
  },
  msg: {
    type: String,
    required: true,
  },
  sent_at: {
    type: Date,
    default: Date.now,
  },
  read_by: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      }],
  votes: {
    type: Number,
    default: 0,
  },
});

const Message = mongoose.model("Message", messageSchema);

module.exports = Message;
