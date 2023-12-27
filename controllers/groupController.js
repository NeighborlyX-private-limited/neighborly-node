const User = require('../models/userModel');
const Group = require('../models/groupModel');
const opencage = require('opencage-api-client');

exports.removeUser = async (req, res) => {
  try {
    const { userId, groupId } = req.body;
  
    // Update the Group collection to remove the user from the group
    const result1 = await Group.updateOne(
      { _id: groupId },
      { $pull: { participants: userId } }
    );
  
    // Update the User collection to remove the group from the user's groups array
    const result2 = await User.updateOne(
      { _id: userId },
      { $pull: { groups: groupId } }
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
  try {
    const { latitude, longitude } = req.body;

    // Validate coordinates
    if (!isValidCoordinate(latitude) || !isValidCoordinate(longitude)) {
      return res.status(400).json({ message: 'Invalid coordinates' });
    }

    // Query the database for nearby users based on current_coordinates
    const nearbyUsers = await User.find({
      current_coordinates: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(longitude), parseFloat(latitude)],
          },
          $maxDistance: 30000, // Adjust this distance as needed (in meters)
        },
      }
    });

    var nearUsersList = nearbyUsers.map(user => ({
      username: user.username, 
      karma: user.karma 
    }));

  } catch (error) {
    console.error('Unexpected error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
  res.status(200).json({
    nearUser: nearUsersList
  });
};

// Function to validate coordinates
function isValidCoordinate(coord) {
  return typeof coord === 'number' && !isNaN(coord) && coord >= -180 && coord <= 180;
}
