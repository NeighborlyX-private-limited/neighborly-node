const User = require("../models/userModel");
// const Post = require("../models/ContentModel");
// const Comment = require("../models/CommentModel");
// const Message = require("../models/messageModel");
const sendToken = require("../utils/jwtToken");
const { activityLogger, errorLogger } = require("../utils/logger");
const Group = require("../models/groupModel");
const bcrypt = require("bcryptjs");
const uuid = require("uuid");
const {
  CITY_TO_COORDINATE,
  AVAILABLE_CITIES,
  S3,
  S3_BUCKET_NAME,
} = require("../utils/constants");

//TODO remove obsolete methods
exports.uploadFile = async (req, res, next) => {
  const file = req.file;
  const fileKey = `${uuid.v4()}-${file.originalname}`;
  activityLogger.info(`Uploading file: ${fileKey}`);

  const params = {
    Bucket: S3_BUCKET_NAME,
    Key: fileKey,
    Body: file.buffer,
    ContentType: file.mimetype,
    ACL: "public-read",
  };

  S3.upload(params, (err, data) => {
    if (err) {
      errorLogger.error("Error uploading file:", err);
      return res.status(500).json({ success: false, message: "Upload failed" });
    }

    activityLogger.info("File uploaded successfully. S3 URL:", data.Location);
    res.status(200).json({ success: true, url: data.Location });
  });
};

exports.fetchCities = async (req, res, next) => {
  activityLogger.info("Cities fetched:" + AVAILABLE_CITIES);
  res.status(200).json({
    success: true,
    cities: AVAILABLE_CITIES,
  });
};

exports.updateLocation = async (req, res, next) => {
  const { body, user } = req;

  try {
    const userLocation = body?.userLocation;
    const cityLocation = body?.cityLocation;
    const homeLocation = body?.homeLocation;
    let updatedCoordinates;
    if (homeLocation) {
      // If homeLocation is provided, it should be an array with [lat, lng]
      activityLogger.info(
        "Updating user's home location based on coordinates: " + homeLocation
      );
      updatedCoordinates = homeLocation;
      await User.findByIdAndUpdate(user._id, {
        $set: {
          "home_coordinates.coordinates": homeLocation,
        },
      });
    } else if (userLocation) {
      // If userLocation is provided, it should be an array with [lat, lng]
      activityLogger.info(
        "Updating user's location based on coordinates: " + userLocation
      );
      updatedCoordinates = userLocation;
      await User.findByIdAndUpdate(user._id, {
        $set: {
          "current_coordinates.coordinates": userLocation,
          "city.coordinates": [0, 0],
        },
      });
    } else if (cityLocation && CITY_TO_COORDINATE[cityLocation.toLowerCase()]) {
      // If cityLocation is provided, look up the coordinates and update
      activityLogger.info(
        "Updating user's location based on city: " + cityLocation
      );
      const coordinates = CITY_TO_COORDINATE[cityLocation.toLowerCase()];
      updatedCoordinates = coordinates;
      await User.findByIdAndUpdate(user._id, {
        $set: {
          "city.coordinates": coordinates,
          "current_coordinates.coordinates": [0, 0],
        },
      });
    } else {
      throw new Error("Invalid location data provided");
    }
    activityLogger.info("User location update successful");
    res.status(200).json({
      success: true,
      user_coordinates: updatedCoordinates,
      message: "Location updated successfully",
    });
  } catch (error) {
    errorLogger.error(error);
    res.status(500).json({
      success: false,
      message: "An error occurred while updating location",
    });
  }
};

//TODO remove obsolete methods
exports.loggedInUser = async (req, res, next) => {
  const user = req.user;
  if (user) {
    sendToken(user, 200, res);
    activityLogger.info(req.user + " has logged in.");
  }
};

// update user display pictures

exports.updatePicture = async (req, res) => {
  const user = req.user;
  const { picture, randomize } = req.body;
  let updates;
  try {
    if (!randomize) {
      activityLogger.info(`Pic updated for user: ${user._id}`);
      updates = await User.updateOne(
        { _id: user._id },

        { $set: { picture: picture } }
      );
    } else {
      randomAvatarURL = createRandomAvatar();
      updates = await User.updateOne(
        { _id: userId },
        { $set: { picture: randomAvatarURL } }
      );
    }
    res.status(200).json({ message: "success" });
  } catch (error) {
    errorLogger.error(`An error occured :`, error);
    res.status(500).json({ message: "failed" });
  }
};

//Userinfo
exports.userinfo = async (req, res) => {
  const user = req.user;
  activityLogger.info(`info fetched for USer: ${user._id}`);
  res.status(200).json(user);
};

//TODO remove obsolete methods
exports.deleteUser = async (req, res) => {
  try {
    const user = req.user;
    user.groups?.forEach(async (group) => {
      await Group.updateOne(
        { _id: group },
        {
          $pull: {
            members: {
              user: {
                userId: user._id,
                username: user.username,
                userPic: user.picture,
                karma: user.karma,
              },
            },
          },
        }
      );
      await Group.updateOne(
        { _id: group },
        {
          $pull: {
            admin: {
              userId: user._id,
              username: user.username,
            },
          },
        }
      );
    });
    const newData = await User.deleteOne({ _id: user._id });
    res.status(200).json(newData);
  } catch (error) {
    errorLogger.error(`An error occured :`, error);
    res.status(500);
  }
};

exports.changePassword = async (req, res) => {
  const { currentPassword, newPassword, email, flag } = req.body;
  activityLogger.info(`changing password for user: ${email}`);
  const user = await User.findOne({ email });
  let match = false;
  if (flag) {
    match = await user.comparePassword(currentPassword);
  } else {
    match = true;
  }
  try {
    if (match) {
      const encryptPassword = await bcrypt.hash(newPassword, 10);
      const update = await User.updateOne(
        { _id: user._id },
        { $set: { password: encryptPassword } }
      );
      activityLogger.info("Password updated successfully");
      res.status(200).json({
        msg: "Password Updated successfully",
      });
    } else {
      errorLogger.error("Wrong password while changing password");
      res.status(401).json({
        msg: "wrong current password",
      });
    }
  } catch (err) {
    errorLogger.error(
      "An unexpected error occurred during change Password:",
      err
    );
    res.status(400).json({
      msg: "something wrong in change password",
    });
  }
};

exports.updateUserdob = async (req, res) => {
  const user = req.user;
  const { dob } = req.body;

  if (!user) {
    return res.status(403).json({ message: "User is not authenticated" });
  }

  
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
    return res.status(400).json({ message: "Invalid date format. Use YYYY-MM-DD." });
  }

  try {
    
    if (user.dobSet) {
      return res.status(403).json({ message: "DOB can only be set once." });
    }

    const updatedFields = { dob, dobSet: true };

    const updatedUser = await User.findByIdAndUpdate(user._id, 
        { $set: updatedFields },
        { new: true }
    );

    if (updatedUser) {
        activityLogger.info(`DOB updated for user ${updatedUser.username}`);
        sendToken(updatedUser, 200, res);
    } else {
        res.status(404).json({ message: "User not found" });
    }
  } catch (error) {
    errorLogger.error(`An unexpected error occurred: ${error.message}`);
    res.status(500).json({ message: "Internal server error" });
  }
};
// exports.deleteAccount = async (req, res) => {
//   const userId = req.user._id.toString();

//   try {
//     await User.findByIdAndUpdate(userId, {
//       isDeleted: true,
//       username: "[deleted]",
//       picture: null,
//     });

//     await Post.update({ username: "[deleted]" }, { where: { userid: userId } });
//     await Comment.update(
//       { username: "[deleted]" },
//       { where: { userid: userId } }
//     );
//     //TODO message model needs to be heavily changed to make it resemble other models, then make this change
//     //await Message.update({ username: '[deleted]' }, { where: { userid: userId } });

//     // Remove user from groups
//     const user = await User.findById(userId);
//     user.groups.forEach(async (groupId) => {
//       await Group.findByIdAndUpdate(groupId, { $pull: { members: userId } });
//     });

//     activityLogger.info(`User with ID ${userId} marked as deleted`);

//     res.status(200).json({ msg: "User account deleted successfully" });
//   } catch (err) {
//     errorLogger.error("Error deleting user account: ", err);
//     res
//       .status(500)
//       .json({ msg: "Internal server error deleting user account" });
//   }
// };
