const Post = require("../models/PostModel");
const Report = require("../models/ReportModel");
const { Op, where } = require("sequelize");
const { activityLogger, errorLogger } = require("../utils/logger");
const { sequelize } = require("../config/database");

exports.findPosts = async (req, res) => {
  let isHome = false;
  isHome = req.query?.home;
  const user = req.user;
  let posts;
  try {
    if (isHome === true) {
      const homeLocation = user.home_coordinates.coordinates;
      posts =
        await sequelize.query(`SELECT postid, userid, username, title, content, multimedia, createdat, cheers, boos, postlocation
	FROM posts WHERE ST_DWithin(postlocation, ST_SetSRID(ST_Point(${homeLocation[0]}, ${homeLocation[1]}), 4326), 300000) ORDER BY createdat DESC`);
      posts = posts[0];
    } else {
      if (user.city.coordinates[0] == 0 && user.city.coordinates[1] == 0) {
        const current_coordinates = user.current_coordinates.coordinates;
        posts =
          await sequelize.query(`SELECT postid, userid, username, title, content, multimedia, createdat, cheers, boos, postlocation
	FROM posts WHERE ST_DWithin(postlocation, ST_SetSRID(ST_Point(${current_coordinates[0]}, ${current_coordinates[1]}), 4326), 300000) ORDER BY createdat DESC`);
        posts = posts[0];
      } else {
        const cityLocation = user.city.coordinates;
        posts =
          await sequelize.query(`SELECT postid, userid, username, title, content, multimedia, createdat, cheers, boos, postlocation
	FROM posts WHERE ST_DWithin(postlocation, ST_SetSRID(ST_Point(${cityLocation[0]}, ${cityLocation[1]}), 4326), 300000) ORDER BY createdat DESC`);
        posts = posts[0];
      }
    }
    activityLogger.info("Posts are fetched");
    res.status(200).json(posts);
  } catch (err) {
    errorLogger.error(err);
    res.status(500).json({
      msg: "Internal server error in fetch-post",
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
        { where: { postid: postId } }
      );
    } else {
      update = await Post.increment({ boos: 1 }, { where: { postid: postId } });
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
  const { title, content, multimedia, location } = req.body;
  const user = req.user;
  try {
    const userId = user._id.toString();
    const userName = user.username;
    console.log(userId);
    const post = await Post.create({
      userid: userId,
      username: userName,
      title: title,
      content: content,
      multimedia: multimedia,
      createdat: Date.now(),
      cheers: 0,
      boos: 0,
      postlocation: { type: "POINT", coordinates: location },
    });
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
        postid: postId,
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
        postid: postId,
      },
    });
    const userId = req.user._id;
    const userName = req.user.username;
    if (userId.toString() === post.userid) {
      res.status(400).json({
        msg: "user is self reporter",
      });
    } else {
      const report = await Report.create({
        reportedby: userName,
        postid: postId,
        reason: reason,
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
