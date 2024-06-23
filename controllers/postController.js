const Post = require("../models/ContentModel");
const User = require("../models/userModel");
const Report = require("../models/ReportModel");
const Comment = require("../models/CommentModel");
const Award = require("../models/AwardModel");
const { Op, where } = require("sequelize");
const { activityLogger, errorLogger } = require("../utils/logger");
const { sequelize } = require("../config/database");

//TODO improvements needed here
exports.fetchCommentThread = async (req, res) => {
  try {
    const parentCommentid = req.params["id"];

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
      "username picture"
    );

    // Map user details to comments
    const userMap = users.reduce((acc, user) => {
      acc[user._id] = user;
      return acc;
    }, {});

    const formattedComments = comments.map((comment) => {
      const awards = comment.awards.map((award) => award.award_type);
      const user = userMap[comment.userid];
      return {
        commentid: comment.commentid,
        text: comment.body,
        userid: comment.userid,
        username: comment.username,
        cheers: comment.cheers,
        createdat: comment.createdat,
        boos: comment.boos,
        awards: awards,
        user_picture: user ? user.picture : null,
        user_username: user ? user.username : null,
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
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 15;

    const offset = (page - 1) * pageSize;
    const limit = pageSize;

    // Fetch comments with awards
    const comments = await Comment.findAndCountAll({
      where: { contentid: postId },
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

    // Map user details to comments
    const userMap = users.reduce((acc, user) => {
      acc[user._id] = user;
      return acc;
    }, {});

    const formattedComments = comments.rows.map((comment) => {
      const awards = comment.awards.map((award) => award.award_type);
      const user = userMap[comment.userid];
      return {
        commentid: comment.commentid,
        text: comment.body,
        userid: comment.userid,
        username: comment.username,
        cheers: comment.cheers,
        createdat: comment.createdat,
        boos: comment.boos,
        award_type: awards,
        user_picture: user ? user.picture : null,
        user_username: user ? user.username : null,
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

//TODO fetch the user details from req
exports.addComment = async (req, res) => {
  try {
    const { contentid, text } = req.body;
    // Validate input parameters
    userid = req.user._id;
    username = req.user.username;
    if (!contentid || !userid || !username || !text) {
      return res.status(400).json({ msg: "All fields are required" });
    }

    // Check if the user exists
    const user = await User.findById(userid);
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }
    // Create the new comment
    const newComment = await Comment.create({
      contentid: contentid,
      userid: userid.toString(),
      username: username,
      text: text,
      cheers: 0,
      boos: 0,
      createdat: new Date(),
    });

    activityLogger.info(
      `New comment added by user: ${username}, contentid: ${contentid}`
    );
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
