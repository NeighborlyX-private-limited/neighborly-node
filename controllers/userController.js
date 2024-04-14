const { generateToken } = require("../middlewares/auth");
const {
  generateFromEmail,
  generateUsername,
} = require("unique-username-generator");
const User = require("../models/userModel");
const ErrorHandler = require("../utils/errorHandler");
const sendToken = require("../utils/jwtToken");
const crypto = require("crypto");
const { ObjectId } = require("mongodb");
const { activityLogger, errorLogger } = require("../utils/logger");
const {
  CITY_TO_COORDINATE,
  AVAILABLE_CITIES,
  S3,
  S3_BUCKET_NAME,
} = require("../utils/constants");

exports.fetchPreSignedURL = async (req, res, next) => {
  const params = {
    Bucket: S3_BUCKET_NAME,
    Key: req.query.fileName,
    Expires: 120, //seconds
    ContentType: "image/jpeg",
  };

  S3.getSignedUrl("putObject", params, (error, url) => {
    if (error) {
      errorLogger.error(
        "An error occurred while fetching presigned URL." + error
      );
      res.status(500).json({
        success: false,
        message: "An error occurred while fetching presigned URL.",
      });
    } else {
      res.status(200).json({ success: true, url });
    }
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
    let updatedCoordinates;
    if (userLocation) {
      // If userLocation is provided, it should be an array with [lat, lng]
      activityLogger.info(
        "Updating user's location based on coordinates: " + userLocation
      );
      updatedCoordinates = userLocation;
      await User.findByIdAndUpdate(user._id, {
        $set: {
          "current_coordinates.coordinates": userLocation,
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

exports.loggedInUser = async (req, res, next) => {
  const user = req.user;
  if (user) {
    sendToken(user, 200, res);
    activityLogger.info(req.user + " has logged in.");
  }
};

exports.getUserGroups = async (req, res, next) => {
  const user = req.user;
  activityLogger.info(`fetching groups for ${user.username}`);
  try {
    const groups = await User.findById(user._id).populate("groups");
    const list = [];
    groups.groups.forEach((group) => {
      list.push({
        group_name: group.name,
        group_id: group._id,
      });
    });
    activityLogger.info(`Retrieved groups for ${user.username}`);
    res.status(200).json({
      success: true,
      groups: list,
    });
  } catch (error) {
    errorLogger.error(
      `Error in getUserGroups for ${user.username}. Error: ${error}`
    );
  }
};

// User Login
exports.loginUser = async (req, res, next) => {
  const { userId, password } = req.body;
  let email = "";
  let username = "";
  let user;

  const emailRegex = /^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/;

  if (emailRegex.test(userId)) {
    email = userId;
    user = await User.findOne({ email: email });
  } else {
    username = userId;
    user = await User.findOne({ username: username });
  }

  if (!user) {
    return next(new ErrorHandler("Invalid Email or Password", 401));
  }

  const match = await user.comparePassword(password);

  if (!match) {
    errorLogger.error("An unexpected error occurred during login:", error);
    return next(new ErrorHandler("Invalid Email or Password", 401));
  }
  activityLogger.info(
    `User ${user.username}(${user._id}) has logged in successfully`
  );
  sendToken(user, 200, res);
};

// User Register
exports.registerUser = async (req, res) => {
  const { password, email, pic, current_coordinates } = req.body;
  let username = generateUsername() + Math.floor(Math.random() * 10000);
  while (await User.findOne({ username })) {
    username = generateUsername() + Math.floor(Math.random() * 10000);
    activityLogger.info(
      `Registration attempt for user with username ${username}.`
    );
  }
  try {
    const user = await User.create({
      username: username,
      password: password,
      email: email,
    });

    sendToken(user, 200, res);
  } catch (error) {
    errorLogger.error(
      "An unexpected error occurred during user registration:",
      error
    );
    if (error.code === 11000 || error.code === 11001) {
      return res.status(400).json({
        error: "Duplicate Entry",
        message: Object.keys(error.keyValue)[0] + " already exists.",
      });
    }
    return res.status(400).json(error);
  }
};

//Logout User

exports.logoutUser = async (req, res, next) => {
  res.clearCookie("token");
  res.end();
};

// update user display pictures
exports.updatePic = async (req, res) => {
  const { user_id, pic } = req.body;
  const update = await User.update({ _id: user_id }, { $set: { pic: pic } });
  activityLogger.info(`Pic updated for user: ${userId}`);
  res.status(200).json(update);
};

//Userinfo
exports.userinfo = async (req, res) => {
  const user = req.user;
  activityLogger.info(`info fetched for USer: ${userId}`);
  res.status(200).json(user);
};
