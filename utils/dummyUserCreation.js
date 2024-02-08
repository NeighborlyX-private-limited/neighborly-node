const mongoose = require('mongoose');
const faker = require('faker');
const User = require('../models/userModel');
const Message = require('../models/messageModel');

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

// will need to add another method in the future to only create fake mssages from the users present in the said group
// probably just another API call to fetch users from the group
exports.createFakeMessages = async (req, res) => {
  try {
    const { numMessages, groupId } = req.body; 
    console.log('Started fake message creation ');
    const fakeMessages = [];

    for (let i = 0; i < numMessages; i++) {
      const message = {
        group_id: groupId, 
        sender: faker.internet.userName(),
        msg: faker.lorem.sentence(),
        sent_at: faker.date.recent(),
        msg_id: faker.datatype.uuid(),
        read_by: [], 
        votes: faker.datatype.number(100), 
      };
      fakeMessages.push(message);
    }
    const insertedMessages = await Message.insertMany(fakeMessages);

    if (insertedMessages.length === numMessages) {
      res.status(201).json({ message: `${numMessages} fake messages created successfully.` });
      console.log('successfully added fake messages');
    } else {
      res.status(500).json({ message: 'Failed to insert all fake messages into the database.' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

