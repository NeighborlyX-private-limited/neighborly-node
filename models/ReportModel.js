const { sequelize } = require("../config/database");
const { DataTypes } = require('sequelize');

const Report = sequelize.define('reports', {
    reportid: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    reportedby: DataTypes.STRING(24),
    postid: DataTypes.INTEGER,
    commentid: DataTypes.INTEGER,
    pollid: DataTypes.INTEGER,
    reason: DataTypes.TEXT,
    createdat: DataTypes.DATE
}, {
    timestamps: false
});
module.exports = Report;