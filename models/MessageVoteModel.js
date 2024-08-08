const { sequelize } = require("../config/database");
const { DataTypes } = require("sequelize");

const MessageVote = sequelize.define(
  "message_votes",
  {
    voteid: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      defaultValue: sequelize.literal("nextval('message_votes_voteid_seq')"), // Ensure the sequence is created in PostgreSQL
    },
    messageid: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    userid: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    votetype: {
      type: DataTypes.STRING(50),
      allowNull: false,
      enum: ["cheer", "boo"], // Using ENUM to restrict votetype to 'cheer' or 'boo'
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
    tableName: "message_votes",
    modelName: "MessageVote",
  }
);

module.exports = MessageVote;
