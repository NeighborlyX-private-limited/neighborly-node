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
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;
const { Op, where } = require("sequelize");
const { activityLogger, errorLogger } = require("../utils/logger");
const { sequelize } = require("../config/database");
const { raw } = require("express");
const uuid = require("uuid");
const {
  S3,
  S3_BUCKET_NAME,
  VALIDAWARDTYPES,
  EXPIRATION_TIME_FOR_REDIS_CACHE,
} = require("../utils/constants");
const client = require("../services/redis");
const { cache } = require("sharp");
const { CACHE_KEY_TEMPLATE } = require("../utils/cacheKey");

const notificationAPI = process.env.API_ENDPOINT + process.env.NOTIFICATION;

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
  let doesExist;
  if (type === "message") {
    doesExist = await Message.findById(id);
  } else {
    doesExist = await contentModel.findOne({ where: { [contentIdField]: id } });
  }
  return doesExist;
};

// Fetch posts and polls
exports.findPosts = async (req, res) => {
  const isHome = req.query?.home === "true";
  const user = req.user;
  const postId = req.params.postId;
  const limit = parseInt(req.query.limit, 10) || 100;
  const offset = parseInt(req.query.offset, 10) || 0;
  const latitude = parseFloat(req.query.latitude);
  const longitude = parseFloat(req.query.longitude);
  let range = req.query.range * 1000 || 4000;
  let posts;
  let location;

  const compositeKey = CACHE_KEY_TEMPLATE.replace("${postId}", postId)
    .replace("${userId}", user._id.toString())
    .replace("${latitude}", latitude)
    .replace("${longitude}", longitude);

  let data;

  try {
    if (isHome) {
      location = user.home_coordinates.coordinates;
    } else if (latitude && longitude) {
      location = [latitude, longitude];
    } else {
      throw new Error(
        "Current location coordinates are required if not fetching from home"
      );
    }

    // // Check Redis for cached data
    if (client && client.isOpen) {
      try {
        const cachedPosts = await client.get(compositeKey);
        if (cachedPosts) {
          data = JSON.parse(cachedPosts);
          return res.status(200).json(data);
        }
      } catch (redisError) {
        console.error("Redis error while fetching posts:", redisError.message);
        //     // Proceed to fetch from the database if Redis fails
      }
    }

    if (postId) {
      posts = await Post.findAll({
        where: { contentid: postId },
        include: [{ model: Award, attributes: ["award_type"], as: "awards" }],
      });
    } else {
      posts = await Post.findAll({
        where: sequelize.where(
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
        include: [{ model: Award, attributes: ["award_type"], as: "awards" }],
        order: [["createdat", "DESC"]],
        limit,
        offset,
      });
    }

    if (posts.length === 0) {
      return res.status(200).json([]);
    }

    const postsWithUserDetails = await Promise.all(
      posts.map(async (post) => {
        const postAuthor = await User.findById(post.userid).lean();
        const commentCount = await Comment.count({
          where: { contentid: post.contentid },
        });
        const awards = post.awards.map((award) => award.award_type);

        const userVote = await ContentVote.findOne({
          where: { contentid: post.contentid, userid: user._id.toString() },
          attributes: ["votetype"],
        });
        const userFeedback = userVote ? userVote.votetype : null;

        if (post.type === "poll") {
          const options = post.poll_options;
          const pollVotes = await PollVote.findAll({
            raw: true,
            attributes: [
              "optionid",
              [sequelize.fn("SUM", sequelize.col("votes")), "votes"],
            ],
            where: { contentid: post.contentid },
            group: ["optionid"],
          });
          const pollVotesMap = pollVotes.reduce((acc, vote) => {
            acc[vote.optionid] = parseInt(vote.votes, 10);
            return acc;
          }, {});
          const userPollVotes = await PollVote.findAll({
            where: { contentid: post.contentid, userid: user._id.toString() },
            attributes: ["optionid"],
          });
          const userVotedOptions = new Set(
            userPollVotes.map((vote) => vote.optionid)
          );

          const pollResults = options.map((data) => ({
            option: data.option,
            optionId: data.optionId,
            votes: pollVotesMap[data.optionId] || 0,
            userVoted: userVotedOptions.has(data.optionId),
          }));

          return {
            ...post.get({ plain: true }),
            userProfilePicture: postAuthor ? postAuthor.picture : null,
            commentCount: commentCount,
            awards: awards,
            pollResults: pollResults,
            userFeedback: userFeedback,
            thumbnail: post.thumbnail,
            poll_options: undefined,
          };
        } else {
          return {
            ...post.get({ plain: true }),
            userProfilePicture: postAuthor ? postAuthor.picture : null,
            commentCount: commentCount,
            awards: awards,
            userFeedback: userFeedback,
            thumbnail: post.thumbnail,
          };
        }
      })
    );

    data = postsWithUserDetails;

    activityLogger.info("Posts fetched successfully");
    try {
      await client.set(compositeKey, JSON.stringify(data));
      await client.expire(compositeKey, EXPIRATION_TIME_FOR_REDIS_CACHE);
    } catch (err) {
      errorLogger.error("Error while caching posts", err);
    }
    res.status(200).json(data);
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
    const username = req.user.username;
    const userPicture = req.user.picture;
    let triggerType;

    let voteType = feedback === "cheer" ? "cheer" : "boo";
    let oppositeVoteType = feedback === "cheer" ? "boo" : "cheer";
    let voteModel, contentModel, contentIdField;

    switch (type) {
      case "post":
        voteModel = ContentVote;
        contentModel = Post;
        contentIdField = "contentid";
        triggerType = "PostTrigger";
        break;
      case "comment":
        voteModel = CommentVote;
        contentModel = Comment;
        contentIdField = "commentid";
        triggerType = "CommentTrigger";
        break;
      case "message":
        voteModel = MessageVote;
        contentModel = Message;
        contentIdField = "messageid";
        triggerType = "MessageTrigger";
        break;
      default:
        return res.status(400).json({ msg: "Invalid type specified" });
    }

    const content = await checkForNull(type, contentModel, contentIdField, id);

    if (!content) {
      return res.status(404).json({ msg: "Content not found" });
    }

    const contentOwner = await User.findById({
      _id: new ObjectId(content.userid),
    });
    const userToken = contentOwner.fcmToken;
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

        let count;
        if (voteType === "cheer") count = content.cheers;
        else count = content.boos;

        // Send notification when vote count is a multiple of 5
        if (count % 5 == 0) {
          let notificationTitle, notificationBody;

          // Quirky notification messages based on vote type
          if (voteType === "cheer") {
            notificationTitle = "You're on Fire! 🔥";
            notificationBody = `${username} just gave a cheer to your ${type}! Keep it up!`;
          } else {
            notificationTitle = "Uh-oh! 🙈";
            notificationBody = `${username} just gave a boo to your ${type}. Time to step it up!`;
          }
          const contentData = await Post.findOne({
            where: {
              contentid: id,
            },
          });
          const postType = contentData.type;
          try {
            await fetch(notificationAPI, {
              method: "POST",
              body: JSON.stringify({
                token: userToken,
                eventType: triggerType,
                postId: id,
                userid: contentOwner._id.toString(),
                notificationImage: userPicture,
                type: postType,
                title: notificationTitle,
                content: notificationBody,
                notificationBody: notificationBody,
                notificationTitle: notificationTitle,
              }),
              headers: {
                Accept: "application/json, text/plain, */*",
                "Content-Type": "application/json",
                authorization: req.headers["authorization"],
                Cookie: "refreshToken=" + req.cookies.refreshToken,
              },
            });
          } catch (err) {
            errorLogger.error("Something wrong with Notification");
          }
        }
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
  const files = req.files?.files || []; // Array of multimedia files
  const thumbnailFile = req.files?.thumbnail?.[0]; // Thumbnail file
  const {
    title,
    content,
    type,
    city,
    allowMultipleVotes,
    pollOptions,
    location,
  } = req.body;

  const user = req.user;
  const isHome = req.query?.home === "true";
  const userId = user._id.toString();
  const username = user.username;

  let finalLocation;
  if (isHome) {
    finalLocation = user.home_coordinates.coordinates;
  } else if (location && Array.isArray(location) && location.length === 2) {
    finalLocation = location;
  } else {
    return res.status(400).json({
      message:
        "Invalid location format. Expected an array with latitude and longitude",
    });
  }

  // Function to upload files to S3
  const uploadToS3 = async (file) => {
    const fileKey = `${uuid.v4()}-${file.originalname}`;
    const params = {
      Bucket: S3_BUCKET_NAME,
      Key: fileKey,
      Body: file.buffer,
      ContentType: file.mimetype,
      ACL: "public-read",
    };

    return new Promise((resolve, reject) => {
      S3.upload(params, (err, data) => {
        if (err) {
          errorLogger.error("Error uploading file:", err);
          return reject(err);
        }
        activityLogger.info(
          "File uploaded successfully. S3 URL:",
          data.Location
        );
        resolve(data.Location);
      });
    });
  };

  // Main function to create a post
  const createPost = async (multimediaUrls, thumbnailUrl) => {
    try {
      let formattedPollOptions = null;

      // Format poll options if the post type is a poll
      if (type === "poll" && pollOptions) {
        const parsedPollOptions = Array.isArray(pollOptions)
          ? pollOptions
          : JSON.parse(pollOptions);
        formattedPollOptions = parsedPollOptions.map((option, index) => ({
          option,
          optionId: index + 1,
        }));
      }

      // Create the new post in the database
      const newPost = await Post.create({
        userid: userId,
        username: username,
        title: title,
        body: content,
        multimedia: multimediaUrls,
        thumbnail: thumbnailUrl || null, // Save thumbnail URL if provided
        createdat: Date.now(),
        cheers: 0,
        boos: 0,
        postlocation: { type: "POINT", coordinates: finalLocation },
        type: type,
        poll_options: formattedPollOptions,
        city: city,
        allow_multiple_votes: allowMultipleVotes,
      });

      activityLogger.info("New post created successfully");
      res.status(200).json(newPost);
    } catch (err) {
      errorLogger.error("Error creating post:", err);

      // Cleanup multimedia files from S3 if post creation fails
      if (multimediaUrls.length > 0) {
        multimediaUrls.forEach((fileUrl) => {
          const params = {
            Bucket: S3_BUCKET_NAME,
            Key: fileUrl.split("/").pop(),
          };
          S3.deleteObject(params, (err) => {
            if (err) {
              errorLogger.error(`Failed to delete uploaded file: ${err}`);
            } else {
              activityLogger.info(
                `Successfully deleted uploaded file: ${fileUrl}`
              );
            }
          });
        });
      }

      res.status(500).json({ msg: "Internal server error in create-post" });
    }
  };

  try {
    const multimediaUrls = [];
    let thumbnailUrl = null;

    // Handle multimedia file uploads (if any)
    if (files && files.length > 0) {
      const uploadPromises = files.map((file) => uploadToS3(file));
      multimediaUrls.push(...(await Promise.all(uploadPromises)));
    }

    // Handle thumbnail file upload (if provided)
    if (thumbnailFile) {
      thumbnailUrl = await uploadToS3(thumbnailFile);
    }

    // Call createPost with uploaded URLs
    createPost(multimediaUrls, thumbnailUrl);
  } catch (err) {
    errorLogger.error("File upload failed:", err);
    res.status(500).json({ success: false, message: "File upload failed" });
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
    const { user } = req;

    if (!id || !type || !awardType) {
      return res.status(400).json({ msg: "Missing required fields" });
    }

    const awardCount = user.awards[awardType];
    if (!awardCount || awardCount <= 0) {
      return res.status(400).json({ msg: "Award not available" });
    }
    await User.updateOne(
      { _id: user._id },
      { $inc: { [`awards.${awardType}`]: -1 } }
    );

    let content, receiverUserId, receiverToken;
    if (type === "post") {
      content = await Post.findOne({ where: { contentid: id } });
      if (!content) return res.status(404).json({ msg: "Post not found" });
      receiverUserId = content.userid;
    } else if (type === "comment") {
      content = await Comment.findOne({ where: { commentid: id } });
      if (!content) return res.status(404).json({ msg: "Comment not found" });
      receiverUserId = content.userid;
    } else {
      return res.status(400).json({ msg: "Invalid type specified" });
    }

    const receiverUser = await User.findById(receiverUserId);
    receiverToken = receiverUser?.fcmToken;

    await Award.create({
      contentid: type === "post" ? id : null,
      commentid: type === "comment" ? id : null,
      giver_userid: user._id.toString(),
      receiver_userid: receiverUserId,
      award_type: awardType,
      createdat: new Date(),
    });
    activityLogger.info(
      `Award (${awardType}) given to ${type} ID ${id} by user ${user._id}`
    );

    if (receiverToken) {
      try {
        await fetch(notificationAPI, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            authorization: req.headers["authorization"],
            Cookie: "refreshToken=" + req.cookies.refreshToken,
          },
          body: JSON.stringify({
            title: `You're a Winner! 🏆`,
            content: `${user.username} awarded you the ${awardType} for your ${type}! Celebrate your awesomeness!`,
            token: receiverToken,
            postId: type === "post" ? id : null,
            userid: receiverUserId,
            groupId: null,
            type: "award_notification",
            notificationImage: user.picture,
            commentId: type === "comment" ? id : null,
            messageId: null,
            eventType: "AwardTrigger",
            notificationBody: `${user.username} awarded you the ${awardType} for your ${type}!`,
            notificationTitle: `You're a Winner! 🏆`,
          }),
        });
        activityLogger.info(
          `Notification sent for award (${awardType}) to user ${receiverUserId}`
        );
      } catch (err) {
        errorLogger.error("Error sending notification", err);
      }
    }

    return res.status(200).json({ msg: "Award given successfully" });
  } catch (err) {
    errorLogger.error("Error in giveAward: ", err);
    return res.status(500).json({ msg: "Internal server error in giveAward" });
  }
};

exports.search = async (req, res) => {
  const isHome = req.query?.home;
  const user = req.user;
  const limit = parseInt(req.query.limit, 10) || 100;
  const offset = parseInt(req.query.offset, 10) || 0;
  const searchword = req.query?.searchword;
  let posts;
  const ranges = [3000, 30000, 300000, 1000000, 2500000]; // Define the range increments in meters
  let location = null;

  try {
    if (isHome) {
      location = user.home_coordinates.coordinates;
    } else {
      location = user.current_coordinates.coordinates;
    }
    for (let range of ranges) {
      posts = await Post.findAll({
        where: {
          [Op.and]: [
            {
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
            {
              [Op.or]: [
                {
                  username: { [Op.substring]: searchword },
                },
                {
                  title: { [Op.substring]: searchword },
                },
                {
                  body: { [Op.substring]: searchword },
                },
              ],
            },
          ],
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
    if (posts.length > 0) {
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
      activityLogger.info("Posts and polls are searched");
      res.status(200).json(postsWithUserDetails);
    }

    // TODO create the search for comments if no post is found. For that please add location in comments
    else res.status(200).json([]);
  } catch (err) {
    errorLogger.error(err);
    res.status(500).json({
      msg: "Internal server error in search",
    });
  }
};
