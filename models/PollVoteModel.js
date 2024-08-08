const { sequelize } = require("../config/database");
const { DataTypes } = require("sequelize");

const PollVote = sequelize.define(
  "poll_votes",
  {
    pollvoteid: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    contentid: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    userid: {
      type: DataTypes.STRING(24),
      allowNull: false,
    },
    optionid: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    votes: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    votedate: DataTypes.DATE,
  },
  {
    timestamps: false,
  }
);

module.exports = PollVote;
