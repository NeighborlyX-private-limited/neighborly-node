const { sequelize } = require("../config/database");
const Post = require("../models/ContentModel");
const Feedback = require("../models/FeedbackModel");
const PollVote = require("../models/PollVoteModel");
const Comment = require("../models/CommentModel");
const Award = require("../models/AwardModel");
const User = require("../models/userModel");
const Group = require("../models/groupModel");
const ContentVote = require("../models/ContentVoteModel");
const CommentVote = require("../models/CommentVoteModel");
const uuid = require("uuid");
const sharp = require("sharp");
const { S3, S3_BUCKET_NAME, DELETED_USER_DP } = require("../utils/constants");
const { activityLogger, errorLogger } = require("../utils/logger");

exports.getUserContent = async (req, res) => {
  try {
    const userId = req.query.userId || req.user._id.toString();

    const content = await Post.findAll({
      where: { userid: userId },
      order: [["createdat", "DESC"]],
      include: [{ model: Award, attributes: ["award_type"], as: "awards" }],
    });

    const contentWithDetails = await Promise.all(
      content.map(async (item) => {
        const user = await User.findById(item.userid).lean();
        const commentCount = await Comment.count({
          where: { contentid: item.contentid },
        });

        const awards = item.awards.map((award) => award.award_type);
        const userVote = await ContentVote.findOne({
          where: {
            contentid: item.contentid,
            userid: userId,
          },
          attributes: ["votetype"], // This assumes "votetype" can be "cheer" or "boo"
        });

        const userFeedback = userVote ? userVote.votetype : null;
        if (item.type === "poll") {
          const options = item.poll_options;

          const pollVotes = await PollVote.findAll({
            raw: true,
            attributes: [
              "optionid",
              [sequelize.fn("SUM", sequelize.col("votes")), "votes"],
            ],
            where: {
              contentid: item.contentid,
            },
            group: ["optionid"],
          });

          const pollVotesMap = pollVotes.reduce((acc, vote) => {
            acc[vote.optionid] = parseInt(vote.votes, 10);
            return acc;
          }, {});

          // Check if the user has voted on this poll
          const userPollVotes = await PollVote.findAll({
            where: {
              contentid: item.contentid,
              userid: userId,
            },
            attributes: ["optionid"], // The IDs of the options the user voted for
          });

          // Create a set of option IDs the user has voted for
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
            ...item.get({ plain: true }),
            userProfilePicture: user ? user.picture : null,
            commentCount: commentCount,
            awards: awards,
            pollResults: pollResults,
            userFeedback: userFeedback,
            poll_options: undefined,
            thumbnail: item.thumbnail,
          };
        } else {
          return {
            ...item.get({ plain: true }),
            userProfilePicture: user ? user.picture : null,
            commentCount: commentCount,
            userFeedback: userFeedback,
            awards: awards,
            thumbnail: item.thumbnail,
          };
        }
      })
    );

    activityLogger.info(
      `Fetched content (posts and polls) for user: ${userId}`
    );
    res.status(200).json(contentWithDetails);
  } catch (err) {
    errorLogger.error(`Error fetching user content: ${err.message}`);
    res
      .status(500)
      .json({ msg: "Internal server error fetching user content" });
  }
};

// Fetch user awards
exports.getUserAwards = async (req, res) => {
  try {
    const userId = req.query.userId || req.user._id.toString();

    // Fetch the user's stored awards (the awards the user has)
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    const userStoredAwards = user.awards; // Directly use the awards from the user model

    // Fetch the awards the user has received from the Award model (for most prominent award calculation only)
    const receivedAwards = await Award.findAll({
      where: { receiver_userid: userId },
      attributes: ["award_type"],
    });

    // Calculate the most prominent award based on received awards
    const awardCounts = receivedAwards.reduce((acc, award) => {
      acc[award.award_type] = (acc[award.award_type] || 0) + 1;
      return acc;
    }, {});

    // Determine the most prominent award (based on received awards)
    const mostProminentAward = Object.keys(awardCounts).reduce(
      (a, b) => (awardCounts[a] > awardCounts[b] ? a : b),
      null
    );

    // Format the user's awards (only the ones from the User model)
    const formattedAwards = Object.entries(userStoredAwards).map(
      ([type, count]) => ({
        type,
        count,
      })
    );

    activityLogger.info(`Fetched awards for user: ${userId}`);

    // Return the awards from the user model and the most prominent award from the received awards
    res.status(200).json({
      awards: formattedAwards,
      mostProminentAward: mostProminentAward,
    });
  } catch (err) {
    errorLogger.error(`Error fetching user awards: ${err.message}`);
    res.status(500).json({ msg: "Internal server error fetching user awards" });
  }
};

// Fetch user comments
exports.getUserComments = async (req, res) => {
  try {
    const userId = req.query.userId || req.user._id.toString();
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 15;

    const offset = (page - 1) * pageSize;
    const limit = pageSize;

    const { count, rows: comments } = await Comment.findAndCountAll({
      where: { userid: userId },
      include: [
        {
          model: Post,
          as: "content",
          include: [
            {
              model: Award,
              as: "awards",
              attributes: ["award_type"],
            },
          ],
        },
        {
          model: Award,
          as: "awards",
          attributes: ["award_type"],
        },
      ],
      order: [["createdat", "DESC"]],
      offset: offset,
      limit: limit,
    });

    activityLogger.info(`Fetched comments for user: ${userId}`);

    const formattedComments = await Promise.all(
      comments.map(async (comment) => {
        const postAwards = comment.content.awards.map(
          (award) => award.award_type
        );
        const commentAwards = comment.awards.map((award) => award.award_type);
        const userVote = await CommentVote.findOne({
          where: {
            commentid: comment.commentid,
            userid: userId,
          },
          attributes: ["votetype"], // This assumes "votetype" can be "cheer" or "boo"
        });

        const userFeedback = userVote ? userVote.votetype : null;

        let pollResults = [];
        if (comment.content.type === "poll") {
          const options = comment.content.poll_options;

          // Fetch votes for all options in the poll
          const pollVotes = await PollVote.findAll({
            raw: true,
            attributes: [
              "optionid",
              [sequelize.fn("SUM", sequelize.col("votes")), "votes"],
            ],
            where: {
              contentid: comment.content.contentid,
            },
            group: ["optionid"],
          });

          const pollVotesMap = pollVotes.reduce((acc, vote) => {
            acc[vote.optionid] = parseInt(vote.votes, 10);
            return acc;
          }, {});
          // Check if the user has voted on this poll
          const userPollVotes = await PollVote.findAll({
            where: {
              contentid: comment.content.contentid,
              userid: userId,
            },
            attributes: ["optionid"], // The IDs of the options the user voted for
          });

          // Create a set of option IDs the user has voted for
          const userVotedOptions = new Set(
            userPollVotes.map((vote) => vote.optionid)
          );
          pollResults = options.map((data) => ({
            option: data.option,
            optionId: data.optionId,
            votes: pollVotesMap[data.optionId] || 0,
            userVoted: userVotedOptions.has(data.optionId), // If the user voted for this option
          }));
        }
        const commenterDetails = await User.findById(comment.userid);
        const userProfilePicture = await User.findById(comment.content.userid);

        return {
          commentid: comment.commentid,
          text: comment.text,
          userid: comment.userid,
          username: comment.username,
          cheers: comment.cheers,
          createdat: comment.createdat,
          boos: comment.boos,
          content: {
            ...comment.content.get({ plain: true }),
            awards: postAwards,
            pollResults: pollResults,
            userProfilePicture: userProfilePicture
              ? userProfilePicture.picture
              : DELETED_USER_DP,
            thumbnail: comment.content.thumbnail,
            poll_options: undefined, // Explicitly remove poll_options from the response
          },
          commenterProfilePicture: commenterDetails.picture,
          awards: commentAwards,
          userFeedback: userFeedback,
        };
      })
    );

    res.status(200).json({
      totalItems: count,
      totalPages: Math.ceil(count / pageSize),
      currentPage: page,
      comments: formattedComments,
    });
  } catch (err) {
    errorLogger.error(`Error fetching user comments: ${err.message}`);
    res
      .status(500)
      .json({ msg: "Internal server error fetching user comments" });
  }
};

// Fetch user groups needs to be fixed along with all the group APIs
exports.getUserGroups = async (req, res, next) => {
  const userId = req.query.userId || req.user._id.toString();
  activityLogger.info(`Fetching groups for user: ${userId}`);
  try {
    const user = await User.findById(userId).populate("groups");
    const list = user.groups.map((group) => ({
      group_name: group.name,
      group_id: group._id,
    }));
    activityLogger.info(`Retrieved groups for user: ${userId}`);
    res.status(200).json({
      success: true,
      groups: list,
    });
  } catch (error) {
    errorLogger.error(
      `Error in getUserGroups for user: ${userId}. Error: ${error}`
    );
    res.status(500).json({ msg: "Internal server error fetching user groups" });
  }
};

exports.getUserInfo = async (req, res) => {
  const userId = req.query.userId || req.user._id.toString();
  try {
    const user = await User.findById(userId).lean();

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    const [postCount, awards] = await Promise.all([
      Post.count({ where: { userid: userId } }),
      Award.findAll({
        where: { receiver_userid: userId },
        attributes: ["award_type"],
      }),
    ]);

    // Calculate awards count and most prominent award
    const awardCounts = awards.reduce((acc, award) => {
      acc[award.award_type] = (acc[award.award_type] || 0) + 1;
      return acc;
    }, {});

    const mostProminentAward = Object.keys(awardCounts).reduce(
      (a, b) => (awardCounts[a] > awardCounts[b] ? a : b),
      null
    );

    const userInfo = {
      userId: userId,
      username: user.username,
      email: user.email,
      picture: user.picture,
      phoneNumber: user.phoneNumber,
      gender: user.gender,
      bio: user.bio || null, // Check for bio existence as for older users bio does not exist
      postCount: postCount,
      karma: user.karma,
      findMe: user.findMe,
      isPhoneVerified: user.isPhoneVerified,
      isEmailVerified: user.isVerified,
      awardsCount: Object.values(awardCounts).reduce((a, b) => a + b, 0),
      mostProminentAward: mostProminentAward,
      title: mostProminentAward || "",
    };

    res.status(200).json({
      success: true,
      user: userInfo,
    });
  } catch (error) {
    errorLogger.error(
      `Error in getUserInfo for user: ${userId}. Error: ${error}`
    );
    res.status(500).json({ msg: "Internal server error fetching user info" });
  }
};

exports.submitFeedback = async (req, res) => {
  const { feedbackText } = req.body;
  const user = req.user;
  if (!feedbackText) {
    return res.status(400).json({ msg: "Feedback text is required" });
  }

  try {
    const feedback = await Feedback.create({
      userid: user._id.toString(),
      feedback_text: feedbackText,
      createdat: new Date(),
    });

    activityLogger.info(`Feedback submitted by user: ${user.username}`);
    res.status(200).json({ msg: "Feedback submitted successfully" });
  } catch (error) {
    errorLogger.error(`Error submitting feedback: ${error}`);
    res.status(500).json({ msg: "Internal server error submitting feedback" });
  }
};

exports.editUserInfo = async (req, res) => {
  const userId = req.user._id.toString();
  let {
    username,
    gender,
    bio,
    homeCoordinates,
    toggleFindMe,
    phoneNumber,
    email,
  } = req.body;
  const file = req.file;

  if (!userId) {
    errorLogger.error("UserId not found");
    return res.status(400).json({ message: "UserId is required" });
  }

  try {
    const existingUser = await User.findById(userId);
    if (!existingUser) {
      return res.status(404).json({ message: "User not found" });
    }

    if (username && username !== "[deleted]" && typeof username === "string") {
      username = username.trim();
      if (!/^[a-zA-Z0-9]+$/.test(username)) {
        throw new Error(
          "Username must be alphanumeric with no special characters."
        );
      }
    }
    if (gender) gender = gender.trim();
    if (bio) bio = bio.trim();

    if (gender === "" || username === "") {
      return res
        .status(400)
        .json({ message: "Username or Gender cannot be empty" });
    }
    const duplicateUser = await User.findOne({
      username: username,
      _id: { $ne: userId },
    });
    if (duplicateUser) {
      errorLogger.error("Username taken");
      return res.status(400).json({ message: "Username already taken" });
    }

    let updatedFields = { username, gender, bio };

    if (phoneNumber && phoneNumber !== existingUser.phoneNumber) {
      updatedFields.phoneNumber = phoneNumber;
      updatedFields.isPhoneVerified = false; // Reset phone verification status
    }

    if (email && email.toLowerCase() !== existingUser.email) {
      updatedFields.email = email.toLowerCase();
      updatedFields.isVerified = false; // Reset email verification status
    }

    if (toggleFindMe) {
      updatedFields.findMe = !existingUser.findMe;
    }

    if (homeCoordinates) {
      try {
        const coordinatesArray = JSON.parse(homeCoordinates);
        if (
          Array.isArray(coordinatesArray) &&
          coordinatesArray.length === 2 &&
          typeof coordinatesArray[0] === "number" &&
          typeof coordinatesArray[1] === "number"
        ) {
          updatedFields.home_coordinates = {
            type: "Point",
            coordinates: coordinatesArray,
          };
        } else {
          return res
            .status(400)
            .json({ message: "Invalid home coordinates format" });
        }
      } catch (e) {
        return res
          .status(400)
          .json({ message: "Invalid home coordinates format" });
      }
    }

    if (file) {
      // Compress the image using sharp
      const compressedImage = await sharp(file.buffer)
        .resize(300, 300) // Resizing to 300x300, adjust as necessary
        .jpeg({ quality: 40 }) // Compress to 80% quality
        .toBuffer();

      if (existingUser.picture) {
        const oldFileKey = existingUser.picture.split("/").pop();
        const deleteParams = {
          Bucket: S3_BUCKET_NAME,
          Key: oldFileKey,
        };
        await S3.deleteObject(deleteParams).promise();
      }

      // Upload the new picture to S3
      const fileKey = `${uuid.v4()}-${file.originalname}`;
      const uploadParams = {
        Bucket: S3_BUCKET_NAME,
        Key: fileKey,
        Body: file.buffer,
        ContentType: file.mimetype,
        ACL: "public-read",
      };
      activityLogger.info("Updated profile pic");
      const uploadResult = await S3.upload(uploadParams).promise();
      updatedFields.picture = uploadResult.Location;
    }

    // Update the user in the database with new info
    const updatedUser = await User.findByIdAndUpdate(userId, updatedFields, {
      new: true,
    });
    if (username && updatedUser) {
      await Post.update({ username: username }, { where: { userid: userId } });
      await Comment.update(
        { username: username },
        { where: { userid: userId } }
      );
      activityLogger.info("Updated username in Content and comment tables");
    }
    if (updatedUser) {
      activityLogger.info("Profile updated");
      return res.status(200).json({
        message: "Profile updated successfully",
        user: {
          username: updatedUser.username,
          gender: updatedUser.gender,
          bio: updatedUser.bio,
          picture: updatedUser.picture,
          home_coordinates: updatedUser.home_coordinates,
          findMe: updatedUser.findMe,
          email: updatedUser.email,
          phoneNumber: updatedUser.phoneNumber,
          isPhoneVerified: updatedUser.isPhoneVerified,
          isVerified: updatedUser.isVerified,
        },
      });
    }
  } catch (error) {
    errorLogger.error("Error updating user info:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.deleteAccount = async (req, res) => {
  const { email, phoneNumber } = req.body;
  let user;
  if (!email && !phoneNumber) {
    user = req.user;
  } else {
    user = await User.findOne({
      $or: [{ email: email }, { phoneNumber: phoneNumber }],
    });

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }
  }

  const userId = user._id.toString();

  try {
    // Completely remove user
    await User.findByIdAndDelete(userId);

    // Update associated records in Post and Comment tables
    await Post.update({ username: "[deleted]" }, { where: { userid: userId } });
    await Comment.update(
      { username: "[deleted]" },
      { where: { userid: userId } }
    );

    // Remove user from groups
    for (const groupId of user.groups) {
      await Group.findByIdAndUpdate(groupId, { $pull: { members: userId } });
    }

    activityLogger.info(`User with ID ${userId} completely deleted`);

    res.status(200).json({ msg: "User account deleted successfully" });
  } catch (err) {
    errorLogger.error("Error deleting user account: ", err);
    res
      .status(500)
      .json({ msg: "Internal server error deleting user account" });
  }
};

exports.getAwards = async (req, res) => {
  const userId = req.query.userId || req.user._id.toString();
  const user = await User.findById(userId);
  const awards = user.awards;
  res.status(200).json(awards);
};
