const { sequelize } = require('../config/database');
const { DataTypes } = require('sequelize');

const Comment = sequelize.define('comments', {
    commentid: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    contentid: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    parent_commentid: DataTypes.INTEGER,
    userid: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    username: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    text: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    createdat: DataTypes.DATE,
    cheers: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    boos: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    }
}, {
    timestamps: false
});

module.exports = Comment;