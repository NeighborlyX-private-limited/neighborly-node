const User = require('../models/userModel');
const Group = require('../models/groupModel');
const opencage = require('opencage-api-client');

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
