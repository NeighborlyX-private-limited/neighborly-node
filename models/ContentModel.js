const { sequelize } = require("../config/database");
const { DataTypes } = require("sequelize");
const Award = require("./AwardModel");
//const Comment = require("./CommentModel");

const Content = sequelize.define(
  "content",
  {
    contentid: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    userid: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    username: DataTypes.STRING(255),
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    thumbnail: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    body: DataTypes.TEXT,
    multimedia: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    createdat: DataTypes.DATE,
    cheers: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    boos: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    postlocation: DataTypes.GEOGRAPHY("POINT", 4326),
    city: DataTypes.STRING(255),
    type: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    poll_options: DataTypes.JSONB,
    allow_multiple_votes: DataTypes.BOOLEAN,
  },
  {
    tableName: "content",
    timestamps: false,
  }
);

Content.hasMany(Award, { foreignKey: "contentid", as: "awards" });
//Content.hasMany(Comment, { foreignKey: "contentid", as: "comments" });
module.exports = Content;
