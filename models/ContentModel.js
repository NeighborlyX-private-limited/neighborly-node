const { sequelize } = require('../config/database');
const { DataTypes } = require('sequelize');



const Content = sequelize.define('content', {
    contentid: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    userid: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    username: DataTypes.STRING(255),
    title: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    body: DataTypes.TEXT,
    multimedia: DataTypes.TEXT,
    createdat: DataTypes.DATE,
    cheers: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
    },
    boos: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    postlocation: DataTypes.GEOGRAPHY('POINT', 4326),
    city: DataTypes.STRING(255),
    type: {
        type: DataTypes.STRING(50),
        allowNull: false
    },
    poll_options: DataTypes.JSONB,
    allow_multiple_votes: DataTypes.BOOLEAN
}, {
    timestamps: false
});

module.exports = Content;