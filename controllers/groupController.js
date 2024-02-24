const opencage = require("opencage-api-client");
const Message = require("../models/messageModel");
const Group = require("../models/groupModel");
const User = require('../models/userModel');
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;


exports.addUser = async (req, res) => {
  try {
    // Destructure userId and groupId from the request body
    const { userId, groupId } = req.body;

    // Update the User collection to add the group to the user's groups array
    const result2 = await User.updateOne(
      { _id: new ObjectId(userId) },
      { $addToSet: { groups: new ObjectId(groupId) } }
    );

    const foundUser = await User.findById(
      new ObjectId(userId)
    );
  
    // Update the Group collection to add the user to the group
    const result1 = await Group.updateOne(
      { _id: new ObjectId(groupId) },
      { $addToSet: { members:{user: {userId: new ObjectId(userId), username: foundUser.username}} } }
    );

  
    // Check if both updates were successful by inspecting modifiedCount
    if (result1.modifiedCount > 0 && result2.modifiedCount > 0) {
      // If both updates were successful, send a success response
      res.status(200).json({ message: 'User added to the group successfully.' });
    } else {
      // If no updates or only one update was successful, send a failure response
      res.status(200).json({ message: 'Group not found or user already in the group.' });
    }
  } catch (error) {
    // Handle unexpected errors, log them, and send an internal server error response
    console.error('Unexpected error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
  
};

exports.makeGroupPermanent = async (req, res) => {
  try {
    // Destructure groupId from the request body
    const { groupId } = req.body;
  
    // Find the group by ID and update the permanentGroup field
    const updatedGroup = await Group.findByIdAndUpdate(
      groupId,
      { $set: { permanentGroup: true } },
      { new: true }
    );
  
    // Check if the group was not found
    if (!updatedGroup) {
      // If the group is not found, send a 404 response
      return res.status(404).json({ message: 'Group not found.' });
    }
  
    // If the group was successfully updated, send a success response with the updated group
    res.status(200).json({ message: 'Permanent group field updated successfully.', group: updatedGroup });
  } catch (error) {
    // Handle unexpected errors, log them, and send an internal server error response
    console.error('Error updating permanent group field:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
  
};

exports.removeUser = async (req, res) => {
  try {
    const { userId, groupId } = req.body;

    const foundUser = await User.findById(
      new ObjectId(userId)
    );

    // Update the Group collection to remove the user from the group
    const result1 = await Group.updateOne(
      { _id: new ObjectId(groupId) },
      { $pull: { members: { user: { userId: new ObjectId(userId), username: foundUser.username }} } }
    );
  
    // Update the User collection to remove the group from the user's groups array
    const result2 = await User.updateOne(
      { _id: new ObjectId(userId) },
      { $pull: { groups: new ObjectId(groupId) } }
    );
  
    // Check if both updates were successful by inspecting modifiedCount
    if (result1.modifiedCount > 0 && result2.modifiedCount > 0) {
      // If both updates were successful, send a success response
      res.status(200).json({ message: 'User removed from the group successfully.' });
    } else {
      // If no updates or only one update was successful, send a failure response
      res.status(200).json({ message: 'Group not found or user not in the group.' });
    }
  } catch (error) {
    // Handle unexpected errors, log them, and send an internal server error response
    console.error('Unexpected error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
  
};

exports.createGroup = async (req, res) => {
  let group=null;
  try {
    const { latitude, longitude, name, type, topic, radius, list } = req.body;

    // Validate coordinates
    if (!isValidCoordinate(latitude) || !isValidCoordinate(longitude)) {
      return res.status(400).json({ message: 'Invalid coordinates' });
    }
    
    group = await Group.create({
      name: name,
      topic: topic,
      radius: radius,
      admin: { userId: req.user._id },
      members: list,
      group_type: type
    });
    list.forEach(async member_user => {
      await User.updateOne(
        { _id: member_user.user.userId },
        { $addToSet: { groups: group._id } }
      );
    })
    await User.updateOne(
      { _id: req.user._id },
      { $addToSet: { groups: group._id } }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
  res.status(200).json({
    group: group
  });
};

exports.nearbyUsers = async(req, res) => {
  const { latitude, longitude, type, karma_need } = req.body;
  // Query the database for nearby users based on current_coordinates
  const nearbyUsers = await User.find({
    current_coordinates: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [parseFloat(longitude), parseFloat(latitude)],
        },
        $maxDistance: 100000000, // Adjust this distance as needed (in meters)
      },
    }
  });
  let list = [];

  if (type === "open") {
    nearbyUsers.map(near_user => {
      list.push({
        user: {
          userId: near_user._id,
          username: near_user.username
        }
      });
    });
  }
  else {
    nearbyUsers.map(near_user => {
      if (near_user.karma >= karma_need) {
        list.push({
          user: {
            userId: near_user._id,
            username: near_user.username
          }
        });
      }
    });
  }
  res.status(200).json({
    list: list
  });
};

exports.nearestGroup = async (req, res) => {
  try {
    const { latitude, longitude } = req.body;

    // Validate coordinates
    if (!isValidCoordinate(latitude) || !isValidCoordinate(longitude)) {
      return res.status(400).json({ message: 'Invalid coordinates' });
    }

    // Query the database for nearby groups based on current_coordinates
    const nearbyGroups = await Group.find({
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [parseFloat(longitude), parseFloat(latitude)],
          },
          $maxDistance: 30000, // Adjust this distance as needed (in meters)
        },
      }
    });
    

    var nearGroupsList = nearbyGroups.map(group => ({
      groupname: group.name, 
      topic: group.topic
    }));

  } catch (error) {
    console.error('Unexpected error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
  res.status(200).json({
    nearGroup: nearGroupsList
  });
};

//added paging to scroll in the messages
exports.fetchLastMessages = async (req, res) => {
  try {
    console.log('********************************')
    console.log('fetching last messages')
    const groupId = req.body.groupId;
    const page = parseInt(req.body.page) || 1; // Default page 1 
    const limit = parseInt(req.body.limit) || 10; // Default 10 messages

    const skip = (page - 1) * limit;

    const messages = await Message.find({ group_id: groupId })
      .sort({ sent_at: -1 }) // Sort by sent_at in descending order to get the latest messages first
      .skip(skip)
      .limit(limit);
    console.log('Messages fetched successfully')
    res.status(200).json(messages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.fetchGroupDetails = async (req, res) => {
  try{
    const groupId = req.body.groupId;
    console.log(`${groupId} Fetching group details..`)
    const groupDetails = await Group.findOne({id: groupId})
    if (!groupDetails) {
      return res.status(404).json({ error: "Group not found" });
    }
    console.log(groupDetails)
    res.status(200).json(groupDetails)
  }
  catch(error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Function to validate coordinates
function isValidCoordinate(coord) {
  return typeof coord === 'number' && !isNaN(coord) && coord >= -180 && coord <= 180;
}

