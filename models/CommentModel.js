const { sequelize } = require("../config/database");
const { DataTypes } = require("sequelize");
const Award = require("./AwardModel");
const Content = require("./ContentModel");

const Comment = sequelize.define(
  "comments",
  {
    commentid: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    contentid: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    parent_commentid: DataTypes.INTEGER,
    userid: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    username: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    text: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    createdat: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    cheers: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    boos: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
  },
  {
    timestamps: false,
  }
);

// Since a comment can have many awards
Comment.hasMany(Award, { foreignKey: "commentid", as: "awards" });
Comment.belongsTo(Content, { foreignKey: "contentid", as: "content" });
module.exports = Comment;
