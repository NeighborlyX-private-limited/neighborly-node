const User = require("../models/userModel");
const Post = require("../models/ContentModel");
const Comment = require("../models/CommentModel");
const Group = require("../models/groupModel");
const esClient = require("./es");

const indexUserData = async () => {
  try {
    const users = await User.find();
    users.forEach((user) => {
      esClient.index({
        index: "users",
        id: user._id.toString(),
        body: {
          username: user.username,
          email: user.email,
        },
      });
    });
  } catch (error) {
    console.error("Error indexing user data:", error);
  }
};

const indexGroups = async () => {
  try {
    const groups = await Group.find();
    groups.forEach((group) => {
      esClient.index({
        index: "groups",
        id: group._id.toString(),
        body: {
          name: group.name,
          description: group.description,
        },
      });
    });
  } catch (error) {
    console.error("Error indexing user data:", error);
  }
};

const indexPosts = async () => {
  try {
    const posts = await Post.findAll();
    posts.forEach((post) => {
      esClient.index({
        index: "posts",
        id: post.contentid.toString(),
        body: {
          body: post.body,
          city: post.city,
          username: post.username,
          title: post.title,
        },
      });
    });
  } catch (error) {
    console.error("Error indexing posts data:", error);
  }
};

const indexComments = async () => {
  try {
    const comments = await Comment.findAll();
    comments.forEach((comment) => {
      esClient.index({
        index: "comments",
        id: comment.commentid.toString(),
        body: {
          text: comment.text,
          username: comment.username,
        },
      });
    });
  } catch (error) {
    console.error("Error indexing posts data:", error);
  }
};

const indexAllData = async () => {
  await indexUserData();
  await indexPosts();
  await indexComments();
  await indexGroups();
};

module.exports = { indexAllData };
