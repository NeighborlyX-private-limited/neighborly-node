const Post = require("../models/ContentModel");
const User = require("../models/userModel");
const Comment = require("../models/CommentModel");
const Award = require("../models/AwardModel");
const Report = require("../models/ReportModel");
const PollVote = require("../models/PollVoteModel");
const ContentVote = require("../models/ContentVoteModel");
const CommentVote = require("../models/CommentVoteModel");
const { Op, where } = require("sequelize");
const { activityLogger, errorLogger } = require("../utils/logger");
const { sequelize } = require("../config/database");
const { raw } = require("express");
const { VALIDAWARDTYPES } = require("../utils/constants");

// Fetch posts and polls
exports.findPosts = async (req, res) => {
  const isHome = req.query?.home;
  const user = req.user;
  const postId = req.params.postId; // Added to check if a specific post ID is provided
  let posts;

  try {
    let location = null;
    if (isHome === true) {
      location = user.home_coordinates.coordinates;
    } else {
      location = user.current_coordinates.coordinates;
    }

    if (postId) {
      // Fetch a specific post by ID
      posts = await sequelize.query(`
        SELECT contentid, userid, username, title, body, multimedia, createdat, cheers, boos, postlocation, city, type, poll_options, allow_multiple_votes
        FROM content
        WHERE contentid = ${postId}
      `);
    } else {
      // Fetch all posts within a certain distance
      posts = await sequelize.query(`
        SELECT contentid, userid, username, title, body, multimedia, createdat, cheers, boos, postlocation, city, type, poll_options, allow_multiple_votes
        FROM content
        WHERE ST_DWithin(postlocation, ST_SetSRID(ST_Point(${location[0]}, ${location[1]}), 4326), 300000)
        ORDER BY createdat DESC
      `);
    }

    posts = posts[0];

    // Fetch user details for posts
    const postsWithUserDetails = await Promise.all(
      posts.map(async (post) => {
        const user = await User.findById(post.userid).lean();
        const commentCount = await Comment.count({
          where: { contentid: post.contentid },
        });

        // Fetch detailed awards information
        const awards = await Award.findAll({
          where: { contentid: post.contentid },
          attributes: ["award_type"],
        });
        const awardNames = awards.map((award) => award.award_type);

        if (post.type === "poll") {
          const options = post.poll_options;

          // Fetch votes for all options in the poll
          const pollVotes = await PollVote.findAll({
            raw: true,
            attributes: [
              "optionid",
              [sequelize.fn("SUM", sequelize.col("votes")), "votes"],
            ],
            where: {
              contentid: post.contentid,
            },
            group: ["optionid"],
          });

          const pollVotesMap = pollVotes.reduce((acc, vote) => {
            acc[vote.optionid] = vote.votes;
            return acc;
          }, {});

          const pollResults = options.map((data) => ({
            option: data.option,
            votes: pollVotesMap[data.optionId] || 0,
          }));

          return {
            ...post,
            userProfilePicture: user ? user.picture : null,
            commentCount: commentCount,
            awards: awardNames,
            pollVotes: pollResults,
          };
        } else {
          return {
            ...post,
            userProfilePicture: user ? user.picture : null,
            commentCount: commentCount,
            awards: awardNames,
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

exports.feedback = async (req, res) => {
  try {
    const { id, type, feedback } = req.body;
    const userId = req.user._id;

    let voteType = feedback === "cheer" ? "cheer" : "boo";
    let oppositeVoteType = feedback === "cheer" ? "boo" : "cheer";
    let voteModel, contentModel, contentIdField;

    if (type === "post") {
      activityLogger.info(
        `Processing Post feedback for ${id} from user ${userId}`
      );
      voteModel = ContentVote;
      contentModel = Post;
      contentIdField = "contentid";
    } else if (type === "comment") {
      activityLogger.info(
        `Processing Comment feedback for ${id} from user ${userId}`
      );
      voteModel = CommentVote;
      contentModel = Comment;
      contentIdField = "commentid";
    } else {
      errorLogger.error("Invalid type specified, should be a comment or post");
      return res.status(400).json({ msg: "Invalid type specified" });
    }

    const content = await contentModel.findOne({
      where: { [contentIdField]: id },
    });
    if (!content) {
      return res.status(404).json({
        msg: `${type.charAt(0).toUpperCase() + type.slice(1)} not found`,
      });
    }

    const existingVote = await voteModel.findOne({
      where: { [contentIdField]: id, userid: userId.toString() },
    });

    if (existingVote) {
      if (existingVote.votetype === voteType) {
        // Reverse the vote
        activityLogger.info(`Reversing feedback for ${id} from user ${userId}`);
        await voteModel.destroy({ where: { voteid: existingVote.voteid } });
        await contentModel.decrement(
          { [voteType + "s"]: 1 },
          { where: { [contentIdField]: id } }
        );
        return res.status(200).json({ msg: "Vote reversed successfully" });
      } else {
        // Update the vote type
        activityLogger.info(`Updating feedback for ${id} from user ${userId}`);
        existingVote.votetype = voteType;
        await existingVote.save();
        await contentModel.increment(
          { [voteType + "s"]: 1, [oppositeVoteType + "s"]: -1 },
          { where: { [contentIdField]: id } }
        );
        return res.status(200).json({ msg: "Vote updated successfully" });
      }
    } else {
      // Create a new vote
      await voteModel.create({
        [contentIdField]: id,
        userid: userId.toString(),
        votetype: voteType,
        createdat: new Date(),
        processed: true,
      });
      await contentModel.increment(
        { [voteType + "s"]: 1 },
        { where: { [contentIdField]: id } }
      );
      activityLogger.info(
        `Feedback (${feedback}) added to ${type} ID ${id} by user ${userId}`
      );
      return res.status(200).json({ msg: "Feedback recorded" });
    }
  } catch (err) {
    errorLogger.error("Something wrong with feedback: ", err);
    return res.status(500).json({ msg: "Internal server error in feedback" });
  }
};

exports.createPost = async (req, res) => {
  const {
    title,
    content,
    multimedia,
    location,
    type,
    city,
    allowMultipleVotes,
    pollOptions,
  } = req.body;
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
        poll_options: pollOptions,
      });
    } else {
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

exports.deleteData = async (req, res) => {
  try {
    const { id, type } = req.params;
    const userId = req.user._id;

    if (type === "post") {
      const post = await Post.findOne({ where: { contentid: id } });
      if (!post) {
        return res.status(404).json({ msg: "Post not found" });
      }
      if (userId.toString() !== post.userid) {
        return res.status(403).json({ msg: "Unauthorized user" });
      }

      await Post.destroy({ where: { contentid: id } });
      activityLogger.info(`Post with ID ${id} deleted by user ${userId}`);
      return res.status(200).json({ msg: "Post deleted" });
    } else if (type === "comment") {
      const comment = await Comment.findOne({ where: { commentid: id } });
      if (!comment) {
        return res.status(404).json({ msg: "Comment not found" });
      }
      if (userId.toString() !== comment.userid) {
        return res.status(403).json({ msg: "Unauthorized user" });
      }

      await Comment.destroy({ where: { commentid: id } });
      activityLogger.info(`Comment with ID ${id} deleted by user ${userId}`);
      return res.status(200).json({ msg: "Comment deleted" });
    } else {
      return res.status(400).json({ msg: "Invalid type specified" });
    }
  } catch (err) {
    errorLogger.error("Something wrong with delete: ", err);
    return res.status(500).json({ msg: "Internal server error in delete" });
  }
};

exports.report = async (req, res) => {
  try {
    const { id, type, reason } = req.body;
    const userId = req.user._id;

    if (type === "post") {
      const post = await Post.findOne({ where: { contentid: id } });
      if (!post) {
        return res.status(404).json({ msg: "Post not found" });
      }
      if (userId.toString() === post.userid) {
        return res
          .status(400)
          .json({ msg: "User cannot report their own post" });
      }

      const report = await Report.create({
        userid: userId.toString(),
        contentid: id,
        report_reason: reason,
        createdat: Date.now(),
      });
      activityLogger.info(`Post with ID ${id} reported by user ${userId}`);
      return res.status(200).json(report);
    } else if (type === "comment") {
      const comment = await Comment.findOne({ where: { commentid: id } });
      if (!comment) {
        return res.status(404).json({ msg: "Comment not found" });
      }
      if (userId.toString() === comment.userid) {
        return res
          .status(400)
          .json({ msg: "User cannot report their own comment" });
      }

      const report = await Report.create({
        userid: userId.toString(),
        commentid: id,
        report_reason: reason,
        createdat: Date.now(),
      });
      activityLogger.info(`Comment with ID ${id} reported by user ${userId}`);
      return res.status(200).json(report);
    } else {
      return res.status(400).json({ msg: "Invalid type specified" });
    }
  } catch (err) {
    errorLogger.error("Something wrong with report: ", err);
    return res.status(500).json({ msg: "Internal server error in report" });
  }
};

exports.giveAward = async (req, res) => {
  try {
    const { id, type, awardType } = req.body;
    const giverUserId = req.user._id;

    if (!id || !type || !awardType) {
      return res.status(400).json({ msg: "Missing required fields" });
    }

    // Validate the award type using the constants file
    if (!VALIDAWARDTYPES.has(awardType)) {
      return res.status(400).json({ msg: "Invalid award type" });
    }

    if (type === "post") {
      const post = await Post.findOne({ where: { contentid: id } });
      if (!post) {
        return res.status(404).json({ msg: "Post not found" });
      }

      await Award.create({
        contentid: id,
        commentid: null,
        giver_userid: giverUserId.toString(),
        receiver_userid: post.userid,
        award_type: awardType,
        createdat: new Date(),
      });

      activityLogger.info(
        `Award (${awardType}) given to post ID ${id} by user ${giverUserId}`
      );
    } else if (type === "comment") {
      const comment = await Comment.findOne({ where: { commentid: id } });
      if (!comment) {
        return res.status(404).json({ msg: "Comment not found" });
      }

      await Award.create({
        contentid: null,
        commentid: id,
        giver_userid: giverUserId.toString(),
        receiver_userid: comment.userid,
        award_type: awardType,
        createdat: new Date(),
      });

      activityLogger.info(
        `Award (${awardType}) given to comment ID ${id} by user ${giverUserId}`
      );
    } else {
      return res.status(400).json({ msg: "Invalid type specified" });
    }

    return res.status(200).json({ msg: "Award given successfully" });
  } catch (err) {
    errorLogger.error("Something wrong with giveAward: ", err);
    return res.status(500).json({ msg: "Internal server error in giveAward" });
  }
};
