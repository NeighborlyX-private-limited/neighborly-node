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
    const userId = req.user._id;
    const page = parseInt(req.query.page) || 1; // Default page 1
    const limit = parseInt(req.query.limit) || 10; // Default 10 messages
    const skip = (page - 1) * limit;

    const messages = await Message.find({ groupId: groupId })
      .sort({ sent_at: -1 })
      .skip(skip)
      .limit(limit);

    const group = await Group.findById(groupId).select("admins");

    // Format messages
    const formattedMessages = await Promise.all(
      messages.map(async (message) => {
        // Fetch cheers and boos count from Postgres (MessageVote table)
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

        // Fetch the user's vote (booOrCheer)
        const userVote = await MessageVote.findOne({
          where: {
            messageid: message._id.toString(),
            userid: userId.toString(),
          },
        });

        // Check if the message is mine
        const isMine = message.userid.toString() === userId.toString();

        // Check if the message is read by the user
        const isRead = message.readBy.includes(userId);

        // Get author's details (from the User model)
        const author = await User.findById(message.userid).select(
          "username picture karma"
        );

        // Count replies (messages with parentMessageId equal to the message's _id)
        const repliesCount = await Message.countDocuments({
          parentMessageId: message._id,
        });

        // Check if the author is an admin
        const isAdmin = group.admins.some(
          (admin) => admin.userId.toString() === message.userid.toString()
        );

        // Format the message
        return {
          id: message._id,
          text: message.message,
          date: message.sent_at,
          isMine: isMine,
          isRead: isRead,
          readByUser: true,
          author: {
            userId: author._id,
            userName: author.username,
            picture: author.picture,
            karma: author.karma,
          },
          repliesCount: repliesCount,
          isAdmin: isAdmin,
          isPinned: false, // For now, setting isPinned to false
          cheers: cheersCount,
          boos: boosCount,
          booOrCheer: userVote ? userVote.votetype : null,
        };
      })
    );

    return res.status(200).json(formattedMessages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    errorLogger.error("An error occurred while fetching messages:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
