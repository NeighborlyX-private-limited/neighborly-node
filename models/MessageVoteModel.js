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
    messageId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "messages", // This should correspond to your messages table
        key: "messageid",
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
      enum: ['cheer', 'boo'], // Using ENUM to restrict votetype to 'cheer' or 'boo'
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
    modelName: 'MessageVote'
  }
);

module.exports = MessageVote;
