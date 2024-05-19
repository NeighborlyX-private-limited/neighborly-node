const {sequelize} = require("../config/database");
const {DataTypes} = require('sequelize');

const Post = sequelize.define('posts',{
    postid: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    userid: DataTypes.STRING(24),
    username: DataTypes.STRING(50),
    title: DataTypes.STRING(100),
    content: DataTypes.TEXT,
    multimedia: DataTypes.STRING(255),
    createdat: DataTypes.DATE,
    cheers: DataTypes.INTEGER,
    boos: DataTypes.INTEGER,
    postlocation: DataTypes.GEOGRAPHY('POINT', 4326)
}, {
    timestamps: false
});

module.exports = Post;