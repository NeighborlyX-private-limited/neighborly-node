const Post = require("../models/ContentModel");
const User = require("../models/userModel");
const Report = require("../models/ReportModel");
const { Op, where } = require("sequelize");
const { activityLogger, errorLogger } = require("../utils/logger");
const { sequelize } = require("../config/database");

exports.feedBack = async (req, res) => {
  const { postId, feedback } = req.body;
  let update;
  try {
    if (feedback) {
      update = await Post.increment(
        { cheers: 1 },
        { where: { contentid: postId } }
      );
    } else {
      update = await Post.increment(
        { boos: 1 },
        { where: { contentid: postId } }
      );
    }
    res.status(200).json(update);
  } catch (err) {
    errorLogger.error("Some error in feedBack: ", err);
    res.status(500).json({
      msg: "Internal server error in feedback-post",
    });
  }
};

exports.reportPost = async (req, res) => {
  try {
    const { postId, reason } = req.body;
    const post = await Post.findOne({
      where: {
        contentid: postId,
      },
    });
    const userId = req.user._id;
    if (userId.toString() === post.userid) {
      res.status(400).json({
        msg: "user is self reporter",
      });
    } else {
      const report = await Report.create({
        userid: userId,
        contentid: postId,
        report_reason: reason,
        createdat: Date.now(),
      });
      res.status(200).json(report);
    }
  } catch (err) {
    errorLogger.error("Something wrong with reportPost: ", err);
    res.status(500).json({
      msg: "error in report-post",
    });
  }
};

exports.fetchPostById = async (req, res) => {
  try {
    const { id } = req.params;
    const post = await Post.findOne({
      where: { contentid: id, type: "post" },
    });
    activityLogger.info("Found a post with id:", id);
    res.status(200).json(post);
  } catch (err) {
    errorLogger.error("Something wrong with fetchPostById", err);
    res.status(400).json({
      msg: err,
    });
  }
};

exports.fetchCommentThread = async (req, res) => {
  try {
    const { id } = req.params;
    const comment = await Comment.findAll();
    res.status(200).json(comment);
  } catch (err) {
    errorLogger.error("Something wrong with fetchCommentThread", err);
    res.status(400).json({
      msg: err,
    });
  }
};
