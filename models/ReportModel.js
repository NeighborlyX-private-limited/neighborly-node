const { sequelize } = require("../config/database");
const { DataTypes } = require("sequelize");
const Comment = require("./CommentModel");
const Content = require("./ContentModel");

const Report = sequelize.define(
  "report",
  {
    reportid: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      defaultValue: sequelize.literal(
        "nextval('reports_reportid_seq'::regclass)"
      ),
      field: "reportid", // Ensure field names are consistent
    },
    contentid: {
      type: DataTypes.INTEGER,
      references: {
        model: Content,
        key: "contentid",
      },
      field: "contentid", // Ensure field names are consistent
    },
    commentid: {
      type: DataTypes.INTEGER,
      references: {
        model: Comment,
        key: "commentid",
      },
      field: "commentid", // Ensure field names are consistent
    },
    userid: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: "userid", // Ensure field names are consistent
    },
    report_reason: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: "report_reason", // Ensure field names are consistent
    },
    createdat: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: "createdat", // Ensure field names are consistent
    },
    processed: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: "processed", // Ensure field names are consistent
    },
    messageid: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: "messageid", // Ensure field names are consistent
    },
    groupid: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: "groupid", // Ensure field names are consistent
    },
    severity: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: "severity", // Ensure field names are consistent
    },
    reported_user_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: "reported_user_id", // Ensure field names are consistent
    },
  },
  {
    timestamps: false,
    tableName: "reports", // Ensure the table name is correctly set
  }
);

module.exports = Report;
