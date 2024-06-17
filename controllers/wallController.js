const Post = require("../models/ContentModel");
const User = require("../models/userModel");
const Comment = require("../models/CommentModel");
const Award = require("../models/AwardModel");
const Report = require("../models/ReportModel");
const PollVote = require("../models/PollVoteModel");
const { Op, where } = require("sequelize");
const { activityLogger, errorLogger } = require("../utils/logger");
const { sequelize } = require("../config/database");
const { raw } = require("express");

// Fetch posts and polls
exports.findPosts = async (req, res) => {
  let isHome = false;
  isHome = req.query?.home;
  const user = req.user;
  let posts;

  try {
    let location = null;
    if (isHome === true) {
      location = user.home_coordinates.coordinates;
    } else {
      location = user.current_coordinates.coordinates;
    }
    posts =
      await sequelize.query(`SELECT contentid, userid, username, title, content, multimedia, createdat, cheers, boos, postlocation, city, type, poll_options
	FROM content WHERE ST_DWithin(postlocation, ST_SetSRID(ST_Point(${location[0]}, ${location[1]}), 4326), 300000) ORDER BY createdat DESC`);
    posts = posts[0];

    // Fetch user details for posts
    const postsWithUserDetails = await Promise.all(
      posts.map(async (post) => {
        const user = await User.findById(req.user._id).lean();
        const commentCount = await Comment.count({ where: { contentid: post.contentid } });
        const awardCount = await Award.count({ where: { contentid: post.contentid } });
        if (post.type === "poll") {
          const options = post.poll_options;
          let pollVotes = await Promise.all(
            options.map(async (data) => {
              const vote = await PollVote.findOne({
                raw: true,
                attributes: ['votes'],
                where: {
                  [Op.and]: [{ contentid: post.contentid }, { optionid: data.optionId }]
                }
              });
              const result = {
                option: data.option,
                votes: vote.votes
              };
              return result;
            }));
          return {
            ...post,
            userProfilePicture: user.picture,
            commentCount: commentCount,
            awardCount: awardCount,
            pollVotes: pollVotes
          };
        }
        else {
          return {
            ...post,
            userProfilePicture: user.picture,
            commentCount: commentCount,
            awardCount: awardCount
          };
        }
      })
    );

    activityLogger.info("Posts and polls are fetched");
    res.status(200).json(postsWithUserDetails);
  } catch (err) {
    errorLogger.error(err);
    res.status(500).json({
      msg: "Internal server error in fetch-posts",
    });
  }
};

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
      update = await Post.increment({ boos: 1 }, { where: { contentid: postId } });
    }
    res.status(200).json(update);
  } catch (err) {
    errorLogger.error("Some error in feedBack: ", err);
    res.status(500).json({
      msg: "Internal server error in feedback-post",
    });
  }
};

exports.createPost = async (req, res) => {
  const { title, content, multimedia, location, type, city, allowMultipleVotes, pollOptions } = req.body;
  const user = req.user;
  try {
    const userId = user._id.toString();
    const username = user.username;
    let post;
    if (type === "poll") {
      post = await Post.create({
        userid: userId,
        username: username,
        title: title,
        body: content,
        multimedia: multimedia,
        createdat: Date.now(),
        cheers: 0,
        boos: 0,
        postlocation: { type: "POINT", coordinates: location },
        type: type,
        city: city,
        allow_multiple_votes: allowMultipleVotes,
        poll_options: pollOptions
      });
    }
    else {
      post = await Post.create({
        userid: userId,
        username: username,
        title: title,
        body: content,
        multimedia: multimedia,
        createdat: Date.now(),
        cheers: 0,
        boos: 0,
        postlocation: { type: "POINT", coordinates: location },
        type: type,
        city: city
      });
    }
    activityLogger.info("new Post created");
    res.status(200).json(post);
  } catch (err) {
    errorLogger.error("Create post is not working: ", err);
    res.status(500).json({
      msg: "Internal server error in create-post",
    });
  }
};

exports.deletePost = async (req, res) => {
  try {
    const postId = req.params["postId"];
    const post = await Post.findOne({
      where: {
        contentid: postId,
      },
    });
    const userId = req.user._id;
    if (userId.toString() !== post.userid) {
      res.status(403).json({
        msg: "unauthorized user",
      });
    } else {
      const deleteMsg = await Post.destroy({
        where: {
          postid: postId,
        },
      });
      res.status(200).json(deleteMsg);
    }
  } catch (err) {
    errorLogger.error("Something wrong with deletePost: ", err);
    res.status(500).json({
      msg: "error in delete-post",
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

