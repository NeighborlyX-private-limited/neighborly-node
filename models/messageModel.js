// models/messageModel.js
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
  userid: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
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
    type: mongoose.Schema.Types.ObjectId,  
    ref: 'User',  
    required: true,
  }],
  mediaLink: {
    type: String
  },
  picture: {
    type: String,
  },  
  parentMessageId: {
    type: mongoose.Schema.Types.ObjectId,  
  },
  cheers: {
    type: Number,
    default: 0
  },
  boos: {
    type: Number,
    default: 0
  }
}, {
    timestamps: true  
});

const Message = mongoose.model("Message", messageSchema);

module.exports = Message;
