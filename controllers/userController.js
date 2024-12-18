const User = require("../models/userModel");
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

exports.uploadFiles = async (req, res, next) => {
  const files = req.files;
  if (!files || files.length === 0) {
    return res
      .status(400)
      .json({ success: false, message: "No files uploaded" });
  }

  const fileUploadPromises = files.map((file) => {
    const fileKey = `${uuid.v4()}-${file.originalname}`;
    activityLogger.info(`Uploading file: ${fileKey}`);

    const params = {
      Bucket: S3_BUCKET_NAME,
      Key: fileKey,
      Body: file.buffer,
      ContentType: file.mimetype,
      ACL: "public-read",
    };

    // Return a promise for each file upload
    return new Promise((resolve, reject) => {
      S3.upload(params, (err, data) => {
        if (err) {
          errorLogger.error("Error uploading file:", err);
          reject(err);
        } else {
          activityLogger.info(
            "File uploaded successfully. S3 URL:",
            data.Location
          );
          resolve(data.Location);
        }
      });
    });
  });

  try {
    // Wait for all uploads to finish
    const fileUrls = await Promise.all(fileUploadPromises);
    res.status(200).json({ success: true, urls: fileUrls });
  } catch (error) {
    errorLogger.error("Error uploading files:", error);
    res.status(500).json({ success: false, message: "Upload failed" });
  }
};

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
  const { params, user } = req;

  try {
    const cityLocation = params.cityLocation;

    // Validate if the city name exists in the CITY_TO_COORDINATE constant
    if (cityLocation && CITY_TO_COORDINATE[cityLocation.toLowerCase()]) {
      // Fetch coordinates for the provided city name
      const updatedCoordinates = CITY_TO_COORDINATE[cityLocation.toLowerCase()];

      activityLogger.info(
        `Updating user's home location based on city: ${cityLocation}`
      );

      // Update user's home coordinates
      await User.findByIdAndUpdate(user._id, {
        $set: {
          "home_coordinates.coordinates": updatedCoordinates,
        },
      });

      activityLogger.info(
        `User's home location update to ${cityLocation} successful`
      );

      res.status(200).json({
        success: true,
        user_coordinates: updatedCoordinates,
        message: `User's home location updated successfully to ${cityLocation}`,
      });
    } else {
      // If cityLocation is invalid or not provided
      throw new Error("Invalid or missing city name");
    }
  } catch (error) {
    errorLogger.error(error);
    res.status(500).json({
      success: false,
      message: "An error occurred while updating home location",
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
    return res
      .status(400)
      .json({ message: "Invalid date format. Use YYYY-MM-DD." });
  }

  try {
    if (user.dobSet) {
      return res.status(403).json({ message: "DOB can only be set once." });
    }

    const updatedFields = { dob, dobSet: true };

    const updatedUser = await User.findByIdAndUpdate(
      user._id,
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

exports.saveFcmToken = async (req, res) => {
  try {
    const { userId, fcmToken } = req.body;
    await User.findByIdAndUpdate(userId, { fcmToken });
    activityLogger.info(`FCM token saved for user ${userId}`);
    res.status(200).json({ message: "FCM token saved successfully." });
  } catch (error) {
    errorLogger.error(`An unexpected error occurred: ${error.message}`);
    res.status(500).json({ message: "Error saving FCM token." });
  }
};

exports.updateTutorialInfo = async (req, res) => {
  try {
    const { tutorialInfo } = req.body;
    const userId = req.user._id;
    if (
      typeof tutorialInfo.viewedTutorial !== "boolean" ||
      typeof tutorialInfo.skippedTutorial !== "boolean"
    ) {
      return res.status(400).json({ message: "Invalid tutorial info data." });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: tutorialInfo },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found." });
    }

    activityLogger.info(`Tutorial info updated for user ${userId}`);
    res.status(200).json({
      message: "Tutorial info updated successfully.",
      user: updatedUser,
    });
  } catch (error) {
    errorLogger.error(`An unexpected error occurred: ${error.message}`);
    res.status(500).json({ message: "Error updating tutorial info." });
  }
};
