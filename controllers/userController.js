const { generateToken } = require("../middlewares/auth");
const User = require("../models/userModel");
const Group = require("../models/groupModel");
const ErrorHandler = require("../utils/errorHandler");
const sendToken = require("../utils/jwtToken");
const crypto = require("crypto");
const {ObjectId } = require('mongodb');

exports.loggedInUser = async (req, res, next) => {
  const user = req.user;
  if(user){
    sendToken(user, 200, res);
  }
};

// User Login
exports.loginUser = async (req, res, next) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email: email });

  if (!user) {
    return next(new ErrorHandler("Invalid Email or Password", 401));
  }

  const match = await user.comparePassword(password);

  if (!match) {
    return next(new ErrorHandler("Invalid Email or Password", 401));
  }

  sendToken(user, 200, res);
};

// User Register
exports.registerUser = async (req, res) => {
  const { username, password, email, current_coordinates } = req.body;

  try {
    const user = await User.create({
      username: username,
      password: password,
      email: email,
      current_coordinates: current_coordinates,
    });

    sendToken(user, 200, res);

  } catch (error) {
    if (error.code === 11000 || error.code === 11001) {
      return res.status(400).json({
        error: "Duplicate Entry",
        message: Object.keys(error.keyValue)[0] + " already exists.",
      });
    }
    return res.status(400).json(error);
  }
};


exports.validateUserGroup = async (req, res) => {
  const {userID, groupID} = req.body;
  try {
    const group = await Group.findOne({ _id: new ObjectId(groupID) });

    if (group) {
      // Check if userID is present in the participants array
      if (group.participants && group.participants.includes(userID)) {
        res.status(200).json({
          success: true,
          message: "User is present in group."
        });      
      } else {
        res.status(200).json({
          success: true,
          message: "User is not present in group."
        });      
      }
    } else {
        res.status(200).json({
          success: true,
          message: "Group does not exist."
        });
    }
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error
    });
  }
};
//Logout User
exports.logoutUser = async (req, res, next) => {
  res.clearCookie("token");
  res.status(200).json({
    success: true,
    message: "You have been successfully logged out"
  })

}