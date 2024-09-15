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
    activityLogger.info(`Fetching chats for user with ID: ${userId}`);

    const user = await User.findById(new ObjectId(userId)).select(
      "groups mutedGroups"
    );
    if (!user) {
      activityLogger.info(`User with ID: ${userId} not found`);
      return res.status(404).json({ message: "User not found." });
    }

    const chatDetailsPromises = user.groups.map(async (groupId) => {
      const group = await Group.findById(new ObjectId(groupId));
      // Only fetch the last top-level message (parentMessageId should be null)
      const lastMessage = await Message.findOne({
        groupId: new ObjectId(groupId),
        parentMessageId: null,
      })
        .sort({ sendAt: -1 })
        .limit(1);

      const unreadCount = await Message.countDocuments({
        groupId: new ObjectId(groupId),
        readBy: { $ne: new ObjectId(userId) },
      });

      const isMuted = user.mutedGroups.includes(groupId);

      activityLogger.info(`Fetched chat details for group with ID: ${groupId}`);

      return {
        id: group._id,
        name: group.name,
        avatarUrl: group.icon || "default_avatar_url.jpg",
        lastMessage: lastMessage ? lastMessage.message : "No messages yet",
        lastMessageDate: lastMessage ? lastMessage.sendAt : null,
        isMuted: isMuted,
        isGroup: true,
        unreadCount: unreadCount,
      };
    });

    const chatDetails = await Promise.all(chatDetailsPromises);

    activityLogger.info(
      `Fetched ${chatDetails.length} chat(s) for user with ID: ${userId}`
    );
    return res.status(200).json(chatDetails);
  } catch (error) {
    errorLogger.error(
      `Error fetching user chats for user with ID: ${req.user._id}`,
      error
    );
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.fetchGroupMessages = async (req, res) => {
  try {
    const groupId = req.params["groupId"];
    const userId = req.user._id;
    const page = parseInt(req.query.page) || 1; // Default page 1
    const limit = parseInt(req.query.limit) || 10; // Default 10 messages
    const skip = (page - 1) * limit;

    activityLogger.info(
      `Fetching last messages for group with ID: ${groupId} for user: ${userId} (page: ${page}, limit: ${limit})`
    );

    // Fetch only top-level messages (where parentMessageId is null)
    const messages = await Message.find({
      groupId: groupId,
      parentMessageId: null, // Exclude replies (parentMessageId is null)
    })
      .sort({ sendAt: -1 })
      .skip(skip)
      .limit(limit);

    const group = await Group.findById(groupId).select("admin");
    if (!group) {
      activityLogger.info(`Group with ID: ${groupId} not found`);
      return res.status(404).json({ error: "Group not found." });
    }

    const admin = group.admin || []; // Ensure admin is an array even if undefined

    const formattedMessages = await Promise.all(
      messages.map(async (message) => {
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

        const userVote = await MessageVote.findOne({
          where: {
            messageid: message._id.toString(),
            userid: userId.toString(),
          },
        });

        const isMine = message.userid.toString() === userId.toString();
        const isRead = message.readBy.includes(userId);

        const author = await User.findById(message.userid).select(
          "username picture karma"
        );

        const repliesCount = await Message.countDocuments({
          parentMessageId: message._id,
        });

        const isAdmin = admin.some(
          (admin) => admin.userId.toString() === message.userid.toString()
        );

        activityLogger.info(
          `Formatted message with ID: ${message._id} for group: ${groupId}`
        );

        return {
          id: message._id,
          text: message.message,
          date: message.sendAt,
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
          isPinned: false,
          cheers: cheersCount,
          boos: boosCount,
          booOrCheer: userVote ? userVote.votetype : null,
        };
      })
    );

    activityLogger.info(
      `Fetched ${formattedMessages.length} message(s) for group with ID: ${groupId} for user: ${userId}`
    );
    return res.status(200).json(formattedMessages);
  } catch (error) {
    errorLogger.error(
      `Error fetching messages for group with ID: ${req.params["groupId"]} for user: ${req.user._id}`,
      error
    );
    res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.fetchMessageThread = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id;
    const parentMessage = await Message.findById(messageId);

    if (!parentMessage) {
      return res.status(404).json({ message: "Message not found." });
    }

    const groupId = parentMessage.groupId;

    const user = await User.findById(userId).select("groups");
    if (!user.groups.includes(groupId)) {
      return res
        .status(403)
        .json({ message: "User is not part of the group." });
    }

    const messages = await Message.find({ parentMessageId: messageId }).sort({
      sendAt: -1,
    });

    const group = await Group.findById(groupId).select("admin");

    if (!group) {
      return res.status(404).json({ error: "Group not found." });
    }

    const admin = group.admin || [];

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
        const isAdmin = admin.some(
          (admin) => admin.userId.toString() === message.userid.toString()
        );

        return {
          id: message._id,
          parentId: message.parentMessageId,
          text: message.message,
          date: message.sendAt,
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
    console.error("Error fetching message thread:", error);
    errorLogger.error(
      "An error occurred while fetching message thread:",
      error
    );
    res.status(500).json({ error: "Internal Server Error" });
  }
};
