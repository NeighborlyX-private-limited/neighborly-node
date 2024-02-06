// messageModel.js
const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  group_id: {
    type: String,
    required: true,
  },
  sender: {
    type: String,
    required: true,
  },
  msg: {
    type: String,
    required: true,
  },
  sent_at: {
    type: Date,
    default: Date.now,
  },
  msg_id: {
    type: String,
    required: true,
    unique: true,
  },
  read_by: {
    type: [String],
    default: [],
  },
  votes: {
    type: Number,
    default: 0,
  },
});

const Message = mongoose.model("Message", messageSchema);

module.exports = Message;
