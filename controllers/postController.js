const Post = require("../models/ContentModel");
const User = require("../models/userModel");
const Report = require("../models/ReportModel");
const Comment = require("../models/CommentModel");
const Content = require("../models/ContentModel");
const Award = require("../models/AwardModel");
const PollVote = require("../models/PollVoteModel");
const CommentVote = require("../models/CommentVoteModel");
const { Op, where } = require("sequelize");
const { activityLogger, errorLogger } = require("../utils/logger");
const { sequelize } = require("../config/database");
const notificationAPI = process.env.API_ENDPOINT + process.env.NOTIFICATION;

exports.fetchCommentThread = async (req, res) => {
  try {
    const parentCommentid = req.params["id"];
    const userId = req.user._id.toString();

    // Fetch comments with the given parentCommentid
    const comments = await Comment.findAll({
      where: { parent_commentid: parentCommentid },
      include: [
        {
          model: Award,
          as: "awards",
          attributes: ["award_type"],
          required: false,
        },
      ],
      order: [
        ["cheers", "DESC"],
        ["createdat", "DESC"],
      ],
    });

    // Fetch user details for each comment
    const userIds = comments.map((comment) => comment.userid);
    const users = await User.find({ _id: { $in: userIds } }).select(
      "_id picture"
    );

    // Fetch user feedback (cheer/boo) for each comment
    const commentIds = comments.map((comment) => comment.commentid);
    const userVotes = await CommentVote.findAll({
      where: {
        commentid: { [Op.in]: commentIds },
        userid: userId, // Checking votes by the current user
      },
    });

    // Map user votes to a dictionary for easier lookup
    const userVotesMap = userVotes.reduce((acc, vote) => {
      acc[vote.commentid] = vote.votetype;
      return acc;
    }, {});

    // Map user details to comments
    const userMap = users.reduce((acc, user) => {
      acc[user._id] = user;
      return acc;
    }, {});

    const formattedComments = comments.map((comment) => {
      const awards = comment.awards.map((award) => award.award_type);
      const user = userMap[comment.userid];

      const userFeedback = userVotesMap[comment.commentid] || null;

      return {
        replyid: comment.commentid,
        text: comment.text,
        userid: comment.userid,
        username: comment.username,
        cheers: comment.cheers,
        createdat: comment.createdat,
        boos: comment.boos,
        awards: awards,
        user_picture: user ? user.picture : null,
        userFeedback: userFeedback,
      };
    });

    activityLogger.info(
      `Fetched comment thread for parent comment ID: ${parentCommentid}`
    );
    res.status(200).json(formattedComments);
  } catch (err) {
    errorLogger.error("Something wrong with fetchCommentThread", err);
    res.status(400).json({
      msg: err.message || "Something went wrong",
    });
  }
};

exports.fetchComments = async (req, res) => {
  try {
    const postId = req.params["postId"];
    const userId = req.user._id.toString();
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 15;

    const offset = (page - 1) * pageSize;
    const limit = pageSize;

    // Fetch comments with awards
    const comments = await Comment.findAndCountAll({
      where: { contentid: postId, parent_commentid: null },
      include: [
        {
          model: Award,
          as: "awards",
          attributes: ["award_type"],
          required: false,
        },
      ],
      order: [
        ["cheers", "DESC"],
        ["createdat", "DESC"],
      ],
      offset: offset,
      limit: limit,
    });

    // Fetch user details for each comment
    const userIds = comments.rows.map((comment) => comment.userid);
    const users = await User.find({ _id: { $in: userIds } }).select(
      "username picture"
    );

    // Fetch user feedback (cheer/boo) for each comment
    const commentIds = comments.rows.map((comment) => comment.commentid);
    const userVotes = await CommentVote.findAll({
      where: {
        commentid: { [Op.in]: commentIds },
        userid: userId, // Checking votes by the current user
      },
    });

    // Map user votes to a dictionary for easier lookup
    const userVotesMap = userVotes.reduce((acc, vote) => {
      acc[vote.commentid] = vote.votetype;
      return acc;
    }, {});

    // Map user details to comments
    const userMap = users.reduce((acc, user) => {
      acc[user._id] = user;
      return acc;
    }, {});

    const formattedComments = comments.rows.map((comment) => {
      const awards = comment.awards.map((award) => award.award_type);
      const user = userMap[comment.userid];

      // Check if the user has voted on the comment and get the votetype
      const userFeedback = userVotesMap[comment.commentid] || null;

      return {
        commentid: comment.commentid,
        text: comment.text,
        userid: comment.userid,
        username: comment.username,
        cheers: comment.cheers,
        createdat: comment.createdat,
        boos: comment.boos,
        award_type: awards,
        user_picture: user ? user.picture : null,
        userProfilePicture: user ? user.picture : null,
        userFeedback: userFeedback,
      };
    });
    activityLogger.info(`Fetched comments for post ID: ${postId}`);
    res.status(200).json({
      totalItems: comments.count,
      totalPages: Math.ceil(comments.count / pageSize),
      currentPage: page,
      comments: formattedComments,
    });
  } catch (err) {
    errorLogger.error("Something wrong with fetchComments", err);
    res.status(500).json({
      msg: err.message || "Something went wrong",
    });
  }
};

exports.addComment = async (req, res) => {
  try {
    const { contentid, text, parentCommentid } = req.body;
    const userId = req.user._id.toString();
    // Validate input parameters
    const username = req.user.username;
    if (!contentid || !text) {
      return res.status(400).json({ msg: "All fields are required" });
    }

    // Create the new comment
    const newComment = await Comment.create({
      contentid: contentid,
      parent_commentid: parentCommentid,
      userid: userId,
      username: username,
      text: text,
      cheers: 0,
      boos: 0,
      createdat: new Date(),
    });
    const content = await Content.findOne({
      where: {
        contentid: contentid,
      },
    });
    const commentId = newComment.commentid;
    const contentUserId = content.userid;
    if (contentUserId !== userId) {
      const contentOwner = await User.findById(contentUserId);
      const ownerToken = contentOwner.fcmToken;
      try {
        await fetch(notificationAPI, {
          method: "POST",
          body: JSON.stringify({
            token: ownerToken, //"dMVpqZWrHtPvqBHOYIsrnK:APA91bEoWJcOHLQFGyeDYYCaFqbldiLN1bwp6gE6FOUYLEySOELLevYS6_S7rvySmBLdQd7ZA6gnhaQgRPyterRwb8Vp0px8F2SsM9sl9s4Eq9hXVtPgm0wE3Vdbe8_JusSgpOKWBLin",
            eventType: "CommentTrigger",
            commentId: commentId,
            userid: contentUserId,
            title: `Comment on your Post`,
            content: `${username} has commented on your post.`,
            notificationBody: `Someone commented on your Post`,
            notificationTitle: `Comment on your Post`,
          }),
          headers: {
            Accept: "application/json, text/plain, */*",
            "Content-Type": "application/json",
            authorization: req.headers["authorization"],
            Cookie: "refreshToken=" + req.cookies.refreshToken,
          },
        });
      } catch (e) {
        errorLogger.error("Something wrong with sendNotification", e);
      }
    }

    // Check if the new comment is a child comment (reply to another comment)
    if (parentCommentid) {
      const parentComment = await Comment.findById(parentCommentid);
      const parentUserId = parentComment.userid;

      if (parentUserId && parentUserId !== userId) {
        const parentUser = await User.findById(parentUserId);
        const parentToken = parentUser.fcmToken;

        if (parentToken) {
          try {
            await fetch(notificationAPI, {
              method: "POST",
              body: JSON.stringify({
                token: parentToken,
                eventType: "ReplyTrigger",
                commentId: newComment.commentid,
                userid: parentUserId,
                title: `Reply to your comment`,
                content: `${username} has replied to your comment.`,
                notificationBody: `Someone replied to your comment`,
                notificationTitle: `Reply to your comment`,
              }),
              headers: {
                Accept: "application/json, text/plain, */*",
                "Content-Type": "application/json",
                authorization: req.headers["authorization"],
                Cookie: "refreshToken=" + req.cookies.refreshToken,
              },
            });
          } catch (e) {
            errorLogger.error(
              "Something went wrong with sendNotification to parent commenter",
              e
            );
          }
        }
      }
    }
    activityLogger.info(
      `New comment added by user: ${username}, contentid: ${contentid}`
    );
    res.status(201).json(newComment);
  } catch (err) {
    errorLogger.error("Something wrong with addComment", err);
    res.status(500).json({
      msg: err.message || "Something went wrong",
    });
  }
};

//TODO I do not like the vote addition logic, rework once we launch?
exports.sendPollVote = async (req, res) => {
  try {
    const { contentid, optionid } = req.body;
    const userid = req.user._id.toString();

    if (!contentid || !optionid) {
      return res
        .status(400)
        .json({ error: "Content ID and Option ID are required" });
    }

    // Fetch the poll content to check if multiple votes are allowed
    const pollContent = await Post.findByPk(contentid);
    if (!pollContent) {
      return res.status(404).json({ error: "Poll not found" });
    }

    const allowMultipleVotes = pollContent.allow_multiple_votes;

    // Check if the user has already voted for this poll
    const existingVotes = await PollVote.findAll({
      where: {
        contentid,
        userid,
      },
    });

    if (existingVotes.length > 0) {
      if (!allowMultipleVotes) {
        return res
          .status(400)
          .json({ error: "Multiple votes are not allowed for this poll" });
      }

      const hasVotedForOption = existingVotes.some(
        (vote) => vote.optionid === optionid
      );
      if (hasVotedForOption) {
        return res
          .status(400)
          .json({ error: "You have already voted for this option" });
      }
    }

    // Create a new poll vote entry
    const newVote = await PollVote.create({
      contentid,
      userid,
      optionid,
      votes: 1, // Every vote will be just 1 vote. We add the total count in the end
      votedate: new Date(),
    });
    activityLogger.info(
      `Added new vote by user: ${userid}, contentid: ${contentid}`
    );
    res.status(201).json(newVote);
  } catch (error) {
    errorLogger.error("Error sending poll vote:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
