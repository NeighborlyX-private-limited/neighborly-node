const { sequelize } = require("../config/database");
const { DataTypes } = require("sequelize");

const CommentVote = sequelize.define(
  "comment_votes",
  {
    voteid: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      defaultValue: sequelize.literal("nextval('comment_votes_voteid_seq')"),
    },
    commentid: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "comments",
        key: "commentid",
      },
      onUpdate: "NO ACTION",
      onDelete: "CASCADE",
    },
    userid: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    votetype: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    createdat: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    processed: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    timestamps: false,
    tableName: "comment_votes",
  }
);

module.exports = CommentVote;
