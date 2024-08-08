const Post = require("../models/ContentModel");
const User = require("../models/userModel");
const Comment = require("../models/CommentModel");
const Award = require("../models/AwardModel");
const Report = require("../models/ReportModel");
const Message = require("../models/messageModel");
const PollVote = require("../models/PollVoteModel");
const ContentVote = require("../models/ContentVoteModel");
const CommentVote = require("../models/CommentVoteModel");
const MessageVote = require("../models/MessageVoteModel");
const { Op, where } = require("sequelize");
const { activityLogger, errorLogger } = require("../utils/logger");
const { sequelize } = require("../config/database");
const { raw } = require("express");
const uuid = require("uuid");
const { S3, S3_BUCKET_NAME, VALIDAWARDTYPES } = require("../utils/constants");

const deleteCommentAndChildren = async (commentid) => {
  const childComments = await Comment.findAll({
    where: { parent_commentid: commentid },
  });
  // Delete the parent comment
  await Comment.destroy({ where: { commentid: commentid } });
  // Recursively delete child comments
  for (const childComment of childComments) {
    await deleteCommentAndChildren(childComment.commentid);
  }
};

const checkForNull = async (type, contentModel, contentIdField, id) => {
  let doesExist = true;
  if (type === "message") {
    doesExist = await Message.findById(id);
  } else {
    doesExist = await contentModel.findOne({ where: { [contentIdField]: id } });
  }
  if (!doesExist) {
    return false;
  }
  return true;
};

// Fetch posts and polls
exports.findPosts = async (req, res) => {
  const isHome = req.query?.home;
  const user = req.user;
  const postId = req.params.postId; // Added to check if a specific post ID is provided
  const limit = parseInt(req.query.limit, 10) || 100;
  const offset = parseInt(req.query.offset, 10) || 0;
  let posts;
  const ranges = [3000, 30000, 300000, 1000000, 2500000]; // Define the range increments in meters
  let location = null;

  try {
    if (isHome) {
      location = user.home_coordinates.coordinates;
    } else {
      location = user.current_coordinates.coordinates;
    }

    if (postId) {
      // Fetch a specific post by ID
      posts = await Post.findAll({
        where: { contentid: postId },
        include: [{ model: Award, attributes: ["award_type"], as: "awards" }],
      });
    } else {
      // Incremental range search logic
      for (let range of ranges) {
        posts = await Post.findAll({
          where: {
            postlocation: {
              [Op.and]: [
                { [Op.ne]: null },
                sequelize.where(
                  sequelize.fn(
                    "ST_DWithin",
                    sequelize.col("postlocation"),
                    sequelize.fn(
                      "ST_SetSRID",
                      sequelize.fn("ST_Point", location[0], location[1]),
                      4326
                    ),
                    range
                  ),
                  true
                ),
              ],
            },
          },
          include: [{ model: Award, attributes: ["award_type"], as: "awards" }],
          order: [["createdat", "DESC"]],
          limit,
          offset,
        });

        if (posts.length > 0) {
          break; // Exit the loop if posts are found
        }
      }
    }

    // Fetch user details for posts
    const postsWithUserDetails = await Promise.all(
      posts.map(async (post) => {
        const user = await User.findById(post.userid).lean();
        const commentCount = await Comment.count({
          where: { contentid: post.contentid },
        });

        // Fetch detailed awards information
        const awards = post.awards.map((award) => award.award_type);

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
            acc[vote.optionid] = parseInt(vote.votes, 10);
            return acc;
          }, {});

          const pollResults = options.map((data) => ({
            option: data.option,
            optionId: data.optionId,
            votes: pollVotesMap[data.optionId] || 0,
          }));

          return {
            ...post.get({ plain: true }),
            userProfilePicture: user ? user.picture : null,
            commentCount: commentCount,
            awards: awards,
            pollResults: pollResults,
            poll_options: undefined, // Explicitly remove poll_options from the response
          };
        } else {
          return {
            ...post.get({ plain: true }),
            userProfilePicture: user ? user.picture : null,
            commentCount: commentCount,
            awards: awards,
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

    switch (type) {
      case "post":
        voteModel = ContentVote;
        contentModel = Post;
        contentIdField = "contentid";
        break;
      case "comment":
        voteModel = CommentVote;
        contentModel = Comment;
        contentIdField = "commentid";
        break;
      case "message":
        voteModel = MessageVote;
        contentModel = Message;
        contentIdField = "messageid";
        break;
      default:
        return res.status(400).json({ msg: "Invalid type specified" });
    }

    const content = checkForNull(type, contentModel, contentIdField, id);

    if (!content) {
      return res.status(404).json({ msg: "Content not found" });
    }

    const existingVote = await voteModel.findOne({
      where: { [contentIdField]: id, userid: userId.toString() },
    });

    if (existingVote) {
      if (existingVote.votetype === voteType) {
        // Reverse the vote
        activityLogger.info(`Reversing feedback for ${id} from user ${userId}`);
        await voteModel.destroy({ where: { voteid: existingVote.voteid } });
        if (type != "message") {
          await contentModel.decrement(
            { [voteType + "s"]: 1 },
            { where: { [contentIdField]: id } }
          );
        }
        return res.status(200).json({ msg: "Vote reversed successfully" });
      } else {
        // Update the vote type
        activityLogger.info(`Updating feedback for ${id} from user ${userId}`);
        existingVote.votetype = voteType;
        await existingVote.save();
        if (type != "message") {
          await contentModel.increment(
            { [voteType + "s"]: 1, [oppositeVoteType + "s"]: -1 },
            { where: { [contentIdField]: id } }
          );
        }
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
      if (type != "message") {
        await contentModel.increment(
          { [voteType + "s"]: 1 },
          { where: { [contentIdField]: id } }
        );
      }
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
  const file = req.file;
  const { title, content, type, city, allowMultipleVotes, pollOptions } =
    req.body;
  const user = req.user;
  const isHome = req.query?.home;
  let location;
  const userId = user._id.toString();
  const username = user.username;
  let multimediaLink = null;

  if (isHome) {
    location = user.home_coordinates.coordinates;
  } else {
    location = user.current_coordinates.coordinates;
  }

  const createPost = async (multimedia) => {
    try {
      let formattedPollOptions = null;
      if (type === "poll" && pollOptions) {
        let parsedPollOptions = Array.isArray(pollOptions)
          ? pollOptions
          : JSON.parse(pollOptions);
        formattedPollOptions = parsedPollOptions.map((option, index) => ({
          option: option,
          optionId: index + 1,
        }));
      }

      const newPost = await Post.create({
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
        poll_options: formattedPollOptions,
        city: city,
        allow_multiple_votes: allowMultipleVotes,
      });

      activityLogger.info("New post created");
      res.status(200).json(newPost);
    } catch (err) {
      errorLogger.error("Create post is not working: ", err);

      // If post creation fails, delete the uploaded file
      // This is not verified
      if (multimedia) {
        const params = {
          Bucket: S3_BUCKET_NAME,
          Key: multimedia.split("/").pop(),
        };
        S3.deleteObject(params, (err) => {
          if (err) {
            errorLogger.error(`Failed to delete uploaded file: ${err}`);
          } else {
            activityLogger.info(
              `Successfully deleted uploaded file: ${multimedia}`
            );
          }
        });
      }

      res.status(500).json({
        msg: "Internal server error in create-post",
      });
    }
  };

  if (file) {
    const fileKey = `${uuid.v4()}-${file.originalname}`;
    activityLogger.info(`Uploading file: ${fileKey}`);

    const params = {
      Bucket: S3_BUCKET_NAME,
      Key: fileKey,
      Body: file.buffer,
      ContentType: file.mimetype,
      ACL: "public-read",
    };

    S3.upload(params, (err, data) => {
      if (err) {
        errorLogger.error("Error uploading file:", err);
        return res
          .status(500)
          .json({ success: false, message: "Upload failed" });
      }

      activityLogger.info("File uploaded successfully. S3 URL:", data.Location);
      createPost(data.Location);
    });
  } else {
    createPost(null);
  }
};

exports.deleteData = async (req, res) => {
  try {
    const { id, type } = req.params;
    const userId = req.user._id.toString();

    if (type === "post") {
      const post = await Post.findOne({ where: { contentid: id } });
      if (!post) {
        return res.status(404).json({ msg: "Post not found" });
      }
      if (userId !== post.userid) {
        return res.status(403).json({ msg: "Unauthorized user" });
      }

      if (post.type === "poll") {
        await PollVote.destroy({ where: { contentid: id } });
      }

      await Comment.destroy({ where: { contentid: id } });
      await Post.destroy({ where: { contentid: id } });

      activityLogger.info(
        `Post with ID ${id} and related comments deleted by user ${userId}`
      );
      return res.status(200).json({ msg: "Post and related comments deleted" });
    } else if (type === "comment") {
      const comment = await Comment.findOne({ where: { commentid: id } });
      if (!comment) {
        return res.status(404).json({ msg: "Comment not found" });
      }
      if (userId !== comment.userid) {
        return res.status(403).json({ msg: "Unauthorized user" });
      }

      await deleteCommentAndChildren(id);

      activityLogger.info(
        `Comment with ID ${id} and related child comments deleted by user ${userId}`
      );
      return res
        .status(200)
        .json({ msg: "Comment and related child comments deleted" });
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
    let reportedUserId;

    if (type === "content") {
      const post = await Post.findOne({ where: { contentid: id } });
      if (!post) {
        return res.status(404).json({ msg: "Post not found" });
      }
      if (userId.toString() === post.userid) {
        return res
          .status(400)
          .json({ msg: "User cannot report their own post" });
      }
      reportedUserId = post.userid;

      const report = await Report.create({
        userid: userId.toString(),
        contentid: id,
        report_reason: reason,
        reported_user_id: reportedUserId,
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
      reportedUserId = comment.userid;

      const report = await Report.create({
        userid: userId.toString(),
        commentid: id,
        report_reason: reason,
        reported_user_id: reportedUserId,
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
    const user = req.user;

    if (!id || !type || !awardType) {
      return res.status(400).json({ msg: "Missing required fields" });
    }

    var isAvailable = true;

    switch (awardType) {
      case "Local Legend":
        if (user.awards["Local Legend"] <= 0) isAvailable = false;
        else
          await User.updateOne(
            { _id: user._id },
            { $inc: { "awards.Local Legend": -1 } }
          );
        break;
      case "Sunflower":
        if (user.awards["Sunflower"] <= 0) isAvailable = false;
        else
          await User.updateOne(
            { _id: user._id },
            { $inc: { "awards.Sunflower": -1 } }
          );
        break;
      case "Streetlight":
        if (user.awards["Streetlight"] <= 0) isAvailable = false;
        else
          await User.updateOne(
            { _id: user._id },
            { $inc: { "awards.Streetlight": -1 } }
          );
        break;
      case "Park Bench":
        if (user.awards["Park Bench"] <= 0) isAvailable = false;
        else
          await User.updateOne(
            { _id: user._id },
            { $inc: { "awards.Park Bench": -1 } }
          );
        break;
      case "Map":
        if (user.awards["Map"] <= 0) isAvailable = false;
        else
          await User.updateOne(
            { _id: user._id },
            { $inc: { "awards.Map": -1 } }
          );
        break;
      default:
        return res.status(400).json({ msg: "Invalid award type" });
    }
    if (!isAvailable)
      return res.status(400).json({ msg: "Award not available" });
    if (type === "post") {
      const post = await Post.findOne({ where: { contentid: id } });
      if (!post) {
        return res.status(404).json({ msg: "Post not found" });
      }

      await Award.create({
        contentid: id,
        commentid: null,
        giver_userid: user._id.toString(),
        receiver_userid: post.userid,
        award_type: awardType,
        createdat: new Date(),
      });

      activityLogger.info(
        `Award (${awardType}) given to post ID ${id} by user ${user._id}`
      );
    } else if (type === "comment") {
      const comment = await Comment.findOne({ where: { commentid: id } });
      if (!comment) {
        return res.status(404).json({ msg: "Comment not found" });
      }

      await Award.create({
        contentid: null,
        commentid: id,
        giver_userid: user._id.toString(),
        receiver_userid: comment.userid,
        award_type: awardType,
        createdat: new Date(),
      });

      activityLogger.info(
        `Award (${awardType}) given to comment ID ${id} by user ${user._id}`
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
