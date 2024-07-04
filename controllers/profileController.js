const { sequelize } = require("../config/database");
const Post = require("../models/ContentModel");
const Feedback = require("../models/FeedbackModel");
const PollVote = require("../models/PollVoteModel");
const Comment = require("../models/CommentModel");
const Award = require("../models/AwardModel");
const User = require("../models/userModel");
const Group = require("../models/groupModel");
const { activityLogger, errorLogger } = require("../utils/logger");

exports.getUserContent = async (req, res) => {
  try {
    const userId = req.params.userId || req.user._id.toString();
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

          const pollResults = options.map((data) => ({
            option: data.option,
            optionId: data.optionId,
            votes: pollVotesMap[data.optionId] || 0,
          }));

          return {
            ...item.get({ plain: true }),
            userProfilePicture: user ? user.picture : null,
            commentCount: commentCount,
            awards: awards,
            pollResults: pollResults,
            poll_options: undefined,
          };
        } else {
          return {
            ...item.get({ plain: true }),
            userProfilePicture: user ? user.picture : null,
            commentCount: commentCount,
            awards: awards,
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
    const userId = req.params.userId || req.user._id.toString();
    const awards = await Award.findAll({
      where: { receiver_userid: userId },
      attributes: ["award_type"],
    });

    const awardCounts = awards.reduce((acc, award) => {
      acc[award.award_type] = (acc[award.award_type] || 0) + 1;
      return acc;
    }, {});

    const mostProminentAward = Object.keys(awardCounts).reduce(
      (a, b) => (awardCounts[a] > awardCounts[b] ? a : b),
      null
    );

    const formattedAwards = Object.entries(awardCounts).map(
      ([type, count]) => ({
        type,
        count,
      })
    );

    activityLogger.info(`Fetched awards for user: ${userId}`);
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
    const userId = req.params.userId || req.user._id.toString();

    const comments = await Comment.findAll({
      where: { userid: userId },
      include: [
        {
          model: Post,
          as: "content",
        },
      ],
      order: [["createdat", "DESC"]],
    });

    activityLogger.info(`Fetched comments for user: ${userId}`);

    const formattedComments = comments.map((comment) => ({
      commentid: comment.commentid,
      text: comment.body,
      userid: comment.userid,
      username: comment.username,
      cheers: comment.cheers,
      createdat: comment.createdat,
      boos: comment.boos,
      content: comment.content,
    }));

    res.status(200).json(formattedComments);
  } catch (err) {
    errorLogger.error(`Error fetching user comments: ${err.message}`);
    res
      .status(500)
      .json({ msg: "Internal server error fetching user comments" });
  }
};

// Fetch user groups needs to be fixed along with all the group APIs
exports.getUserGroups = async (req, res, next) => {
  const userId = req.params.userId || req.user._id.toString();
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
  const userId = req.params.userId || req.user._id.toString();
  try {
    const user = await User.findById(userId).lean();

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    const [postCount, awards] = await Promise.all([
      Post.count({ where: { userid: userId, type: "post" } }),
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
      bio: user.bio || null, // Check for bio existence as for older users bio does not exist
      postCount: postCount,
      karma: user.karma,
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
