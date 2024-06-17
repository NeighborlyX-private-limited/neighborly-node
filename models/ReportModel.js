const { sequelize } = require("../config/database");
const { DataTypes } = require('sequelize');

const Report = sequelize.define('reports', {
    reportid: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    userid: {
        type: DataTypes.STRING(24),
        allowNull: false
    },
    contentid: DataTypes.INTEGER,
    commentid: DataTypes.INTEGER,
    report_reason: DataTypes.TEXT,
    createdat: DataTypes.DATE,
    processed: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    }
}, {
    timestamps: false
});
module.exports = Report;