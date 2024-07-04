const { sequelize } = require("../config/database");
const { DataTypes } = require("sequelize");

const Event = sequelize.define(
  "events",
  {
    eventid: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    userid: {
      type: DataTypes.STRING(24),
      allowNull: false,
    },
    eventname: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    description: DataTypes.TEXT,
    location: {
      type: DataTypes.GEOGRAPHY("POINT", 4326),
      allowNull: false,
    },
    starttime: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    endtime: DataTypes.DATE,
    createdat: DataTypes.DATE,
    multimedia: DataTypes.STRING(255),
    groupid: {
      type: DataTypes.STRING(24),
      allowNull: false,
    },
  },
  {
    timestamps: false,
  }
);

module.exports = Event;
