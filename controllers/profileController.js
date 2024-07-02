const { sequelize } = require("../config/database");
const Post = require("../models/ContentModel");
const PollVote = require("../models/PollVoteModel");
const Comment = require("../models/CommentModel");
const Award = require("../models/AwardModel");
const Group = require("../models/groupModel");
const { activityLogger, errorLogger } = require("../utils/logger");

// Fetch user posts
exports.getUserPosts = async (req, res) => {
  try {
    const userId = req.params.userId || req.user._id.toString();
    const posts = await Post.findAll({
      where: { userid: userId, type: "post" },
      order: [["createdat", "DESC"]],
    });
    activityLogger.info(`Fetched posts for user: ${userId}`);
    res.status(200).json(posts);
  } catch (err) {
    errorLogger.error(`Error fetching user posts: ${err.message}`);
    res.status(500).json({ msg: "Internal server error fetching user posts" });
  }
};

// Fetch user polls
exports.getUserPolls = async (req, res) => {
  try {
    const userId = req.params.userId || req.user._id.toString();
    const polls = await Post.findAll({
      where: { userid: userId, type: "poll" },
      order: [["createdat", "DESC"]],
    });

    const pollsWithVotes = await Promise.all(
      polls.map(async (poll) => {
        const options = poll.poll_options;

        // Fetch votes for all options in the poll
        const pollVotes = await PollVote.findAll({
          raw: true,
          attributes: [
            "optionid",
            [sequelize.fn("SUM", sequelize.col("votes")), "votes"],
          ],
          where: {
            contentid: poll.contentid,
          },
          group: ["optionid"],
        });

        const pollVotesMap = pollVotes.reduce((acc, vote) => {
          acc[vote.optionid] = vote.votes;
          return acc;
        }, {});

        const pollResults = options.map((data) => ({
          option: data.option,
          optionId: data.optionId,
          votes: pollVotesMap[data.optionId] || 0,
        }));

        return {
          ...poll.get({ plain: true }),
          pollResults: pollResults,
          poll_options: undefined, // Explicitly remove poll_options from the response
        };
      })
    );

    activityLogger.info(`Fetched polls for user: ${userId}`);
    res.status(200).json(pollsWithVotes);
  } catch (err) {
    errorLogger.error(`Error fetching user polls: ${err.message}`);
    res.status(500).json({ msg: "Internal server error fetching user polls" });
  }
};

// Fetch user awards
exports.getUserAwards = async (req, res) => {
  try {
    const userId = req.params.userId || req.user._id.toString();
    const awards = await Award.findAll({
      where: { receiver_userid: userId },
    });
    activityLogger.info(`Fetched awards for user: ${userId}`);
    res.status(200).json(awards);
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
      order: [["createdat", "DESC"]],
    });
    activityLogger.info(`Fetched comments for user: ${userId}`);
    res.status(200).json(comments);
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
