const opencage = require("opencage-api-client");
const Message = require("../models/messageModel");
const Group = require("../models/groupModel");
const User = require("../models/userModel");
const mongoose = require("mongoose");
const { activityLogger, errorLogger } = require("../utils/logger");
const { error } = require("winston");
const ObjectId = mongoose.Types.ObjectId;
const {otpgenerator} = require('../utils/emailService');

exports.addUser = async (req, res) => {
  try {

    const groupId = req.params["groupId"]; 
     
    const userId = req.query.userId || req.user._id.toString();

    activityLogger.info(`Adding user with ID ${userId} to group with ID ${groupId}.`);

    const group = await Group.findById(new ObjectId(groupId));
    if (!group) {
      activityLogger.info(`Group with ${groupId} not found.`);
      return res.status(404).json({ message: "Group not found." });
    }

    const requiredKarma = group.karma;

    const user = await User.findById(new ObjectId(userId));
    if (!user) {
      activityLogger.info("User not found");
      return res.status(404).json({ message: "User not found." });
    }

    if (user.karma < requiredKarma) {
      activityLogger.info("Karma insufficient");
      return res.status(403).json({ message: "Insufficient karma." });
    }

    // Update the User collection to add the group to the user's groups array
    const groupAddedInUser = await User.updateOne(
      { _id: new ObjectId(userId) },
      { $addToSet: { groups: new ObjectId(groupId) } }
    );

    // Updating 'members' field that is an array of ObjectId references to User documents
    const userAddedToGroup = await Group.updateOne(
      { _id: new ObjectId(groupId) },
      {
        $addToSet: {
          members: {
            userId: new ObjectId(userId),
            userName: user.username,
            picture: user.picture,
            karma: user.karma,
          },
        },
      }
    );

    // Check if both updates were successful by inspecting modifiedCount
    if (userAddedToGroup.modifiedCount > 0 && groupAddedInUser.modifiedCount > 0) {
      activityLogger.info("User added.");
      res.status(200).json({ message: "User added to the group successfully." });
    } else {
      res.status(400).json({ message: "Group not found or user already in the group." });
    }
  } catch (error) {
    errorLogger.error("An unexpected error occurred during adding user to group:", error);
    console.error("Unexpected error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};


exports.makeGroupPermanent = async (req, res) => {
  try {
    // Destructure groupId from the request body
    const { groupId } = req.body;
    activityLogger.info(`Making group with ID ${groupId} permanent.`);

    // Find the group by ID and update the permanentGroup field
    const updatedGroup = await Group.findByIdAndUpdate(
      groupId,
      { $set: { permanentGroup: true } },
      { new: true }
    );

    // Check if the group was not found
    if (!updatedGroup) {
      // If the group is not found, send a 404 response
      activityLogger.error(`Group with ID ${groupId} not found.`);
      return res.status(404).json({ message: "Group not found." });
    }

    // If the group was successfully updated, send a success response with the updated group
    activityLogger.info(
      `Permanent group field updated successfully for group with ID ${groupId}.`
    );
    res.status(200).json({
      message: "Permanent group field updated successfully.",
      group: updatedGroup,
    });
  } catch (error) {
    // Handle unexpected errors, log them, and send an internal server error response
    errorLogger.error(
      "An unexpected error occurred during updating permanent group field:",
      error
    );
    console.error("Error updating permanent group field:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.removeUser = async (req, res) => {
  try {
    const { userId, groupId } = req.body;
    activityLogger.info(
      `Removing user with ID ${userId} from group with ID ${groupId}.`
    );

    const foundUser = await User.findById(new ObjectId(userId));

    const group = await Group.findById(new ObjectId(groupId));
    let flag = false;
    let result1, result2;

    for (let i = 0; i < group.members.length; ++i) {
      if (group.members[i].userId.toString() === userId) {
        flag = true;
        break;
      }
    }

    // Update the Group collection to remove the user from the group
    if (flag) {
      result1 = await Group.updateOne(
        { _id: new ObjectId(groupId) },
        {
          $pull: {
            members: {
              userId: new ObjectId(userId),
              userName: foundUser.username,
              picture: foundUser.picture,
              karma: foundUser.karma,
            },
          },
        }
      );
      // Update the User collection to remove the group from the user's groups array
      result2 = await User.updateOne(
        { _id: new ObjectId(userId) },
        { $pull: { groups: new ObjectId(groupId) } }
      );
      // Check if both updates were successful by inspecting modifiedCount
      if (result1.modifiedCount > 0 && result2.modifiedCount > 0) {
        // If both updates were successful, send a success response
        activityLogger.info(
          `User with ID ${userId} removed from group with ID ${groupId} successfully.`
        );
        res
          .status(200)
          .json({ message: "User removed from the group successfully." });
      } else {
        // If no updates or only one update was successful, send a failure response
        activityLogger.info(
          `Group not found or user not in the group: User ID ${userId}, Group ID ${groupId}.`
        );
        res
          .status(200)
          .json({ message: "Group not found or user not in the group." });
      }
      return;
    }
    flag = false;
    for (let i = 0; i < group.admin.length; ++i) {
      if (group.admin[i].userId.toString() === userId) {
        flag = true;
        break;
      }
    }
    if (flag && group.admin.length > 1) {
      result1 = await Group.updateOne(
        { _id: new ObjectId(groupId) },
        {
          $pull: {
            admin: {
              userId: new ObjectId(userId),
              userName: foundUser.username,
              picture: foundUser.picture,
              karma: foundUser.karma,
            },
          },
        }
      );
      // Update the User collection to remove the group from the user's groups array
      result2 = await User.updateOne(
        { _id: new ObjectId(userId) },
        { $pull: { groups: new ObjectId(groupId) } }
      );
      // Check if both updates were successful by inspecting modifiedCount
      if (result1.modifiedCount > 0 && result2.modifiedCount > 0) {
        // If both updates were successful, send a success response
        activityLogger.info(
          `User with ID ${userId} removed from group with ID ${groupId} successfully.`
        );
        res
          .status(200)
          .json({ message: "User removed from the group successfully." });
      } else {
        // If no updates or only one update was successful, send a failure response
        activityLogger.info(
          `Group not found or user not in the group: User ID ${userId}, Group ID ${groupId}.`
        );
        res
          .status(200)
          .json({ message: "Group not found or user not in the group." });
      }
    } else {
      res.status(502).json({
        message:
          "Last admin cannot be removed. Please select another user to be admin",
      });
    }
  } catch (error) {
    // Handle unexpected errors, log them, and send an internal server error response
    console.error("Unexpected error:", error);
    errorLogger.error(
      "An unexpected error occurred during removing user from group:",
      error
    );
    res.status(500).json({ message: "Internal Server Error" });
  }
};


exports.createGroup = async (req, res) => {
  try {
    const {
      name,
      description,
      typeOf,
      radius = 3000,
      karma = 0,
      icon
    } = req.body;
    const user = req.user;
    const isHome = req.query.home === 'true'; // Convert query param to boolean
    activityLogger.info("Attempting to create a group with the following data:", req.body);

    let coordinates;
    if (isHome) {
      if (!user.home_coordinates || !user.home_coordinates.coordinates || user.home_coordinates.coordinates.length !== 2) {
        return res.status(400).json({ message: "User's home coordinates are not available or invalid." });
      }
      coordinates = user.home_coordinates.coordinates;
    } else {
      if (!user.current_coordinates || !user.current_coordinates.coordinates || user.current_coordinates.coordinates.length !== 2) {
        return res.status(400).json({ message: "User's current coordinates are not available or invalid." });
      }
      coordinates = user.current_coordinates.coordinates;
    }

    const location = {
      type: "Point",
      coordinates: coordinates
    };

    const code = otpgenerator();
    let displayname = name + code;
    while (await Group.findOne({ displayname })) {
      code = otpGenerator.generate(4, { upperCaseAlphabets: false, lowerCaseAlphabets: false, specialChars: false });
      displayname = name + code;
    }

    // Create the group
    const group = await Group.create({
      name,
      displayname,
      icon: icon,
      description,
      location,
      typeOf,
      radius,
      karma,
      admin: [{
        userId: user._id,
        userName: user.username,
        karma: user.karma,
        picture: user.picture,
      }],
      members: [{
        userId: user._id,
        userName: user.username,
        karma: user.karma,
        picture: user.picture,
      }]
    });

    // Add group to the user's list of groups
    await User.updateOne(
      { _id: user._id },
      { $addToSet: { groups: group._id } }
    );

    activityLogger.info(`Group ${group.name} created successfully with location based on ${isHome ? "home coordinates" : "current coordinates"}.`);
    res.status(200).json({ group });
  } catch (error) {
    errorLogger.error("An unexpected error occurred during group creation: " + error);
    res.status(500).json({ message: "Internal Server Error", error: error.toString() });
  }
};


exports.nearbyUsers = async (req, res) => {
  const { latitude, longitude, karma_need } = req.query;
  const karmaThreshold = parseInt(karma_need, 10);
  const coordinates = [parseFloat(latitude), parseFloat(longitude)];

  try {
    // First query for users based on current_coordinates
    // TODO: this logic needs to be changed, we need not check coordinates for both user and city
    const currentCoordinatesUsers = await User.find({
      current_coordinates: {
        $near: {
          $geometry: { type: "Point", coordinates },
          $maxDistance: 3000,
        },
      },
      karma: { $gte: karmaThreshold },
      _id: { $ne: req.user._id },
      findMe: { $eq: true },
    });

    // Then query for users based on city coordinates
    const cityCoordinatesUsers = await User.find({
      city: {
        $near: {
          $geometry: { type: "Point", coordinates },
          $maxDistance: 3000,
        },
      },
      karma: { $gte: karmaThreshold },
      _id: { $ne: req.user._id },
      findMe: { $eq: true },
    });

    // Combine and deduplicate users from both queries
    const combinedUsersMap = new Map();
    [...currentCoordinatesUsers, ...cityCoordinatesUsers].forEach((user) => {
      combinedUsersMap.set(user._id.toString(), user);
    });
    const combinedUsers = Array.from(combinedUsersMap.values());

    // Transform the combined users for response
    const list = combinedUsers.map((near_user) => ({
      userId: near_user._id,
      userName: near_user.username,
      karma: near_user.karma,
      picture: near_user.picture,
    }));

    res.status(200).json({ list });
  } catch (error) {
    errorLogger.error(`Unexpected error occured:`, error);
    console.error("Unexpected error:", error);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

exports.nearestGroup = async (req, res) => {
  try {
    const _id = req.user._id;
    const latitude = Number(req.query.latitude);
    const longitude = Number(req.query.longitude);
    // Validate coordinates
    if (!isValidCoordinate(latitude, longitude)) {
      activityLogger.info(`Invalid coordinates for ${_id}`);
      return res.status(400).json({ message: "Invalid coordinates" });
    }
    // Query the database for nearby groups based on current_coordinates
    const nearbyGroups = await Group.find({
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [parseFloat(latitude), parseFloat(longitude)],
          },
          $maxDistance: 300000, // Adjust this distance as needed (in meters)
        },
      },
      "members.userId": { $ne: _id },
      // "admin.userId": { $ne: _id },
      "admin.userId": {
        $ne: _id,
      },
    });

    var nearGroupsList = nearbyGroups.map((group) => ({
      groupName: group.name,
      groupId: group._id,
      topic: group.topic,
    }));
    res.status(200).json({
      nearGroup: nearGroupsList,
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    errorLogger.eror("An error occured:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

//added paging to scroll in the messages
exports.fetchLastMessages = async (req, res) => {
  try {
    const groupId = req.params["groupId"];
    const page = parseInt(req.query.page) || 1; // Default page 1
    const limit = parseInt(req.query.limit) || 10; // Default 10 messages

    const skip = (page - 1) * limit;

    const messages = await Message.find({ group_id: groupId })
      .sort({ sent_at: -1 }) // Sort by sent_at in descending order to get the latest messages first
      .skip(skip)
      .limit(limit);
    res.status(200).json(messages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    errorLogger.error("An error occured while fetching messages:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.fetchGroupDetails = async (req, res) => {
  try {
    const groupId = req.params["groupId"];
    const groupDetails = await Group.findOne({ _id: groupId });
    if (!groupDetails) {
      return res.status(404).json({ error: "Group not found" });
    }
    res.status(200).json(groupDetails);
  } catch (error) {
    console.error("Error fetching messages:", error);
    errorLogger.error(
      `An error occurred while fetching group details for ${groupId}`,
      error
    );

    res.status(500).json({ error: "Internal Server Error" });
  }
};

  exports.updateGroupDetails = async (req, res) => {
    const { groupId, name, description, isOpen, icon, displayname } = req.body;
    const group = await Group.findById(new ObjectId(groupId));
    const user = req.user;
    let flag = false;
    try {
      const admin_count = group.admin.length;
      const presentGroup = await Group.findOne({ displayname });
      if (presentGroup) {
        throw new Error('Duplicate displayname');
      }
      for (let i = 0; i < admin_count; ++i) {
        if (group.admin[i].userId.toString() == user._id.toString()) {
          flag = true;
          break;
        }
      }
      if (flag) {
        const updated = await Group.updateOne(
          { _id: new ObjectId(groupId) },
          { $set: { name: name, displayname: displayname, description: description, isOpen: isOpen, icon: icon } }
        );
        activityLogger.info(`Group Details updated for group ${groupId}.`);
        res.status(200).json(updated);
      } else {
        throw new Error("Access denied");
      }
    } catch (err) {
      res.status(403).json({
        msg: err.message,
      });
    }
  };
exports.deleteGroup = async (req, res) => {
  try {
    const user = req.user;
    const groupId = req.params["groupId"];
    const group = await Group.findById({ _id: new ObjectId(groupId) });
    let flag = false;
    for (let i = 0; i < group.admin.length; ++i) {
      if (group.admin[i].userId.toString() === user._id.toString()) {
        flag = true;
        break;
      }
    }
    if (flag) {
      group.members.forEach(async (member) => {
        await User.updateOne(
          { _id: member.userId },
          {
            $pull: {
              groups: group._id,
            },
          }
        );
      });
      group.admin.forEach(async (member) => {
        await User.updateOne(
          { _id: member.userId },
          {
            $pull: {
              groups: group._id,
            },
          }
        );
      });
      const changedData = await Group.deleteOne({ _id: group._id });
      res.status(200).json(changedData);
    } else res.status(403);
  } catch (error) {
    res.status(500);
  }
};

exports.addAdmin = async (req, res) => {
  const user = req.user;
  const { groupId, userId } = req.body;
  try {
    const foundUser = await User.findById({ _id: new ObjectId(userId) });
    const group = await Group.findById({ _id: new ObjectId(groupId) });
    let flag = false;
    for (let i = 0; i < group.admin.length; ++i) {
      if (group.admin[i].userId.toString() === user._id.toString()) {
        flag = true;
        break;
      }
    }
    if (flag) {
      let memberFound = false;
      for (let i = 0; i < group.members.length; ++i) {
        if (group.members[i].userId.toString() === userId) {
          memberFound = true;
          break;
        }
      }
      if (memberFound) {
        await Group.updateOne(
          { _id: new ObjectId(groupId) },
          {
            $pull: {
              members: {
                user: {
                  userId: new ObjectId(userId),
                  userName: foundUser.username,
                  picture: foundUser.picture,
                  karma: foundUser.karma,
                },
              },
            },
          }
        );
        await Group.updateOne(
          { _id: new ObjectId(groupId) },
          {
            $addToSet: {
              admin: {
                userId: new ObjectId(userId),
                userName: foundUser.username,
                picture: foundUser.picture,
                karma: foundUser.karma,
              },
            },
          }
        );
        activityLogger.info("new admin added in admin-list of the group");
        res.status(200).json({ message: "added a new admin" });
      } else {
        activityLogger.error("new admin is not member of group");
        res.status(502).json({ message: "new admin is not member of group" });
      }
    } else {
      activityLogger.error("only admin can add new admin");
      res.status(403).json({ message: "only admin can add new admin" });
    }
  } catch (error) {
    errorLogger.error("An error occured while adding group admin", error);
    res.status(500).json({
      success: false,
      message: "An error occured while adding group admin.",
      error: error.message,
    });
  }
};

// Function to validate coordinates
function isValidCoordinate(latitude, longitude) {
  return (
    typeof latitude === "number" &&
    !isNaN(latitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    typeof longitude === "number" &&
    !isNaN(longitude) &&
    longitude >= -180 &&
    longitude <= 180
  );
}


exports.searchGroups = async (req, res) => {
  const query = req.body.searchQuery;

  if (!query) {
      errorLogger.error("Search query missing - cannot proceed with group search.");
      return res.status(400).json({ message: "Please provide a search query." });
  }

  try {
      const groups = await Group.find({
          $or: [
              { name: { $regex: query, $options: 'i' } },
              { description: { $regex: query, $options: 'i' } },
              { typeOf: { $regex: query, $options: 'i' } }
          ]
      }).select('id name description typeOf location').sort({ name: 'asc' });

      if (groups.length > 0) {
          activityLogger.info(`Found ${groups.length} groups matching the query '${query}'.`);
          res.status(200).json(groups);
      } else {
          errorLogger.info(`No groups found for the query '${query}'.`);
          res.status(404).json({ message: "No groups found matching your query." });
      }
  } catch (error) {
      errorLogger.error('Error searching for groups: ' + error.message);
      res.status(500).json({ message: "Error searching for groups." });
  }
};