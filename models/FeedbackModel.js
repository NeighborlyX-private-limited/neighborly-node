const { sequelize } = require("../config/database");
const { DataTypes } = require("sequelize");

const Review = sequelize.define(
  "feedback",
  {
    feedbackid: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    userid: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    feedback_text: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    createdat: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    timestamps: false,
    tableName: "feedback",
  }
);

module.exports = Review;
