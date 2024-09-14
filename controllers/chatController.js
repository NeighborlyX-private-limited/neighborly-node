const opencage = require("opencage-api-client");
const Message = require("../models/messageModel");
const MessageVote = require("../models/MessageVoteModel");
const Group = require("../models/groupModel");
const User = require("../models/userModel");
const Report = require("../models/ReportModel");
const mongoose = require("mongoose");
const { activityLogger, errorLogger } = require("../utils/logger");
const { error } = require("winston");
const uuid = require("uuid");
const ObjectId = mongoose.Types.ObjectId;

exports.fetchUserChats = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(new ObjectId(userId)).select(
      "groups mutedGroups"
    );
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const chatDetailsPromises = user.groups.map(async (groupId) => {
      const group = await Group.findById(new ObjectId(groupId));
      const lastMessage = await Message.findOne({
        groupId: new ObjectId(groupId),
      })
        .sort({ sendAt: -1 })
        .limit(1);

      const unreadCount = await Message.countDocuments({
        groupId: new ObjectId(groupId),
        readBy: { $ne: new ObjectId(userId) },
      });

      const isMuted = user.mutedGroups.includes(groupId);

      return {
        id: group._id,
        name: group.name,
        avatarUrl: group.icon || "default_avatar_url.jpg",
        lastMessage: lastMessage ? lastMessage.message : "No messages yet",
        lastMessageDate: lastMessage ? lastMessage.sendAt : null,
        isMuted: isMuted,
        isGroup: true,
        unreadedCount: unreadCount,
      };
    });

    const chatDetails = await Promise.all(chatDetailsPromises);

    return res.status(200).json(chatDetails);
  } catch (error) {
    errorLogger.error("Error fetching user chats", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.fetchLastMessages = async (req, res) => {
  try {
    const groupId = req.params["groupId"];
    const page = parseInt(req.query.page) || 1; // Default page 1
    const limit = parseInt(req.query.limit) || 10; // Default 10 messages
    const user = req.user;
    const group = await Group.findById(groupId);
    let isAdmin = false;
    let author;
    const skip = (page - 1) * limit;

    const messages = await Message.find({ groupId: groupId })
      .sort({ sent_at: -1 }) // Sort by sent_at in descending order to get the latest messages first
      .skip(skip)
      .limit(limit);
    const formatedMessages = await Promise.all(
      messages.map(async (message) => {
        const messageVote = await MessageVote.findOne({where: {
          userid: user._id.toString()
        }})
        const otherMessages = await Message.find({ parentMessageId: message._id});
        const repliesCount = otherMessages.length;
        for (let admin of group.admin) {
          if (admin.userId.toString() === message.userid.toString()) {
            isAdmin = true;
            author = admin;
            break;
          }
        }
        if (!isAdmin) {
          for (let member of group.members) {
            if (member.userId.toString() === message.userid.toString()) {
              author = member;
              break;
            }
          }
        }
        const cheersCount = await MessageVote.count({
          where: {
            messageid: message._id.toString(),
            votetype: "cheer",
          },
        });
        const boosCount = await MessageVote.count({
          where: {
            messageid: message._id.toString(),
            votetype: "boo",
          },
        });
        return {
          id: message._id.toString(),
          text: message.message,
          date: message.sendAt,
          isMine: user._id.toString() === message.userid.toString(),
          repliesCount,
          isAdmin,
          author,
          cheers: cheersCount,
          boos: boosCount,
          booOrCheer: messageVote.votetype
        };
      })
    );
    return res.status(200).json(formatedMessages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    errorLogger.error("An error occured while fetching messages:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.updateReadBy = async(req, res) => {
  try {
    const { messageId, groupId, userId } = req.body;
    const message = await Message.findById(messageId);
    let updatedMessage;
    if(groupId === message.groupId.toString()) {
      updatedMessage = await Message.updateOne(
        { _id: new ObjectId(messageId) },
        {
          $addToSet: {
            readBy: new ObjectId(userId)
          }
        }
      );
      res.status(201).json(updatedMessage);
    }
    else {
      throw new Error("User is not member of group");
    }
  } catch(err) {
    errorLogger.error("An error occured while updating readBy:", err);
    res.status(500).json({ error: err.message});
  }
}
