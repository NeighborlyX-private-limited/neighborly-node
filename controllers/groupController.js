const User = require('../models/userModel');
const opencage = require('opencage-api-client');

exports.createGroup = async (req, res) => {
  try {
    const { latitude, longitude } = req.body;

    // Validate coordinates
    if (!isValidCoordinate(latitude) || !isValidCoordinate(longitude)) {
      return res.status(400).json({ message: 'Invalid coordinates' });
    }

    // const locationDetails = await opencage.geocode({
    //   q: `${latitude},${longitude}`,
    //   language: 'en',
    //   address_only: 1,
    // });

    if (true/*locationDetails && locationDetails.status && locationDetails.status.code === 200*/) {
      //const currentUserLocation = locationDetails.results[0].formatted;

      // Query the database for nearby users based on current_coordinates
      const usersByCurrentCoordinates = await User.find({
        current_coordinates: {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [parseFloat(longitude), parseFloat(latitude)],
            },
            $maxDistance: 10000, // You can adjust this distance as needed (in meters)
          },
        },
      });

      // Query the database for nearby users based on cities.coordinates
      const usersByCityCoordinates = await User.find({
        'cities.coordinates': {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [parseFloat(longitude), parseFloat(latitude)],
            },
            $maxDistance: 10000,
          },
        },
      });

      // Merge the results from both queries
      const nearbyUsers = [...usersByCurrentCoordinates, ...usersByCityCoordinates];

      // Extract relevant data for nearby users
      const nearbyUsersData = nearbyUsers.map(user => ({
        name: user.username,
        location: user.current_coordinates.coordinates,
        karma: user.karma,
      }));

      res.status(200).json({
        //currentUserLocation,
        nearbyUsers: nearbyUsersData,
      });
    } else {
      console.log('Error from OpenCage API:', locationDetails.status.message);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  } catch (error) {
    console.error('Unexpected error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// Function to validate coordinates
function isValidCoordinate(coord) {
  return typeof coord === 'number' && !isNaN(coord) && coord >= -180 && coord <= 180;
}
