const mongoose = require('mongoose');
const faker = require('faker');
const User = require('../models/userModel');

exports.createDummyUsers = async (req, res)=> {
  try {
    const { numUsers } = req.body; // Assuming you pass the number of users in the request body

    const dummyUsers = [];

    for (let i = 0; i < numUsers; i++) {
      const user = {
        username: faker.internet.userName(),
        password: faker.internet.password(),
        email: faker.internet.email(),
        current_coordinates: {
          type: 'Point',
          coordinates: [faker.address.longitude(), faker.address.latitude()],
        },
        cities: [
          {
            type: 'Point',
            coordinates: [faker.address.longitude(), faker.address.latitude()],
          },
          // Add more cities if needed
        ],
        groups: [], // You can add group IDs if needed
        karma: faker.datatype.number(),
      };

      dummyUsers.push(user);
    }

    await User.insertMany(dummyUsers);
    res.status(201).json({ message: `${numUsers} dummy users created successfully.` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
}

