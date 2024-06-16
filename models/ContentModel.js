const { sequelize } = require("../config/database");
const { DataTypes } = require("sequelize");

const Content = sequelize.define(
  "content",
  {
    contentid: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    userid: {
      type: DataTypes.STRING(24),
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    multimedia: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    createdat: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    cheers: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    boos: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    postlocation: {
      type: DataTypes.GEOGRAPHY("POINT", 4326),
      allowNull: true,
    },
  },
  {
    timestamps: false,
  }
);

module.exports = Content;
