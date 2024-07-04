const { sequelize } = require("../config/database");
const { DataTypes } = require("sequelize");
const Comment = require("./CommentModel");
const Content = require("./ContentModel");

const Report = sequelize.define("report", {
  reportid: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    defaultValue: sequelize.literal(
      "nextval('reports_reportid_seq'::regclass)"
    ),
  },
  contentid: {
    type: DataTypes.INTEGER,
    references: {
      model: Content,
      key: "contentid",
    },
  },
  commentid: {
    type: DataTypes.INTEGER,
    references: {
      model: Comment,
      key: "commentid",
    },
  },
  userid: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  report_reason: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  createdat: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  processed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  messageid: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  groupid: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  severity: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
});

module.exports = Report;
