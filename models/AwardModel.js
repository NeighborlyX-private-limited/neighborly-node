const { sequelize } = require("../config/database");
const { DataTypes } = require("sequelize");

const Award = sequelize.define(
  "awards",
  {
    award_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    giver_userid: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    receiver_userid: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    award_type: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    contentid: DataTypes.INTEGER,
    commentid: DataTypes.INTEGER,
    created_at: DataTypes.DATE,
    messageId: DataTypes.STRING(255),
  },
  {
    timestamps: false,
  }
);

module.exports = Award;
