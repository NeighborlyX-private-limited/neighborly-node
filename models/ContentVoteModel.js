const { sequelize } = require("../config/database");
const { DataTypes } = require("sequelize");

const ContentVote = sequelize.define(
  "content_votes",
  {
    voteid: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      defaultValue: sequelize.literal("nextval('content_votes_voteid_seq')"),
    },
    contentid: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "content",
        key: "contentid",
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
    tableName: "content_votes",
  }
);

module.exports = ContentVote;
