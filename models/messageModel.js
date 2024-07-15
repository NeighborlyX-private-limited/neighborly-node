// messageModel.js
const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Group",
    required: true
  },
  name: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true,
  },
  sendAt: {
    type: Date,
    default: Date.now,
  },
  readBy: [{
    type: String,
    required: true,
  }],
  mediaLink: {
    type: String
  },
  votes: {
    votes: {
      type: mongoose.Schema.Types.ObjectId,
      ref:"content_votes"
    },
  },
  picture: {
    type: String,
  },
  awards:{
    awards:{
      type:mongoose.Schema.Types.ObjectId,
      ref:"awards",
    },
  },
  parentMessageId: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
});

const Message = mongoose.model("Message", messageSchema);

module.exports = Message;
