const Event = require('../models/EventModel');
const { Op, where } = require('sequelize');
const {getCity} = require('../utils/commonUtils');
const { activityLogger, errorLogger } = require("../utils/logger");
const { sequelize } = require('../config/database');
const Group = require('../models/groupModel');
const User = require('../models/userModel');
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;
const { otpgenerator } = require('../utils/emailService');

exports.createEvent = async (req, res) => {
    const { name, description, radius, startTime, endTime, avatarUrl, address } = req.body;
    const user = req.user;
    const isHome = req.query?.home;
    
    // Determine the location based on user preference
    let eventLocation = isHome ? user.home_coordinates.coordinates : user.current_coordinates.coordinates;

    const admin = {
        userId: user._id,
        userName: user.username,
        picture: user.picture,
        karma: user.karma
    };

    try {
        // Generate a unique display name for the group
        let code = otpgenerator();
        let displayname = name + code;
        while (await Group.findOne({ displayname })) {
            code = otpGenerator.generate(4, { upperCaseAlphabets: false, lowerCaseAlphabets: false, specialChars: false });
            displayname = name + code;
        }

        // Create a new group
        const group = await Group.create({
            name: name,
            displayname: displayname,
            description: description,
            location: {
                type: "Point",
                coordinates: eventLocation,
            },
            radius: radius,
            isOpen: true,
            admin: [admin],
            members: [admin], // Add the admin to the group members
            karma: 1000,
            typeOf: "open"
        });

        const city = getCity();

        // Create a new event
        const event = await Event.create({
            userid: user._id.toString(),
            eventname: name,
            description: description,
            location: { type: "Point", coordinates: eventLocation },
            starttime: Date.parse(startTime),
            endtime: Date.parse(endTime),
            createdat: Date.now(),
            avatarUrl:avatarUrl,
            groupid: group._id.toString(),
            address: address,
            locationStr:city,
            host: [admin],
        });

        // Add the group to the user's groups list
        const groupAddedInUser = await User.updateOne(
            { _id: user._id },
            { $addToSet: { groups: group._id } }
        );

        activityLogger.info(`Event created with eventid: ${event.eventid} and groupid: ${group._id}`);
        res.status(200).json({
            "eventId": event.eventid,
            "groupId": group._id
        });
    } catch (err) {
        errorLogger.error('Some error in create events: ', err);
        res.status(400).json({
            "msg": "Some thing wrong with create event",
            err
        });
    }
};



exports.getNearbyEvents = async (req, res) => {
    const { radius } = req.query;
    const user = req.user; 
    const isHome = req.query?.home === 'true'; 

    try {
        // Decide the location based on the user's choice
        const lat = isHome ? user.home_coordinates.latitude : user.current_coordinates.latitude;
        const lon = isHome ? user.home_coordinates.longitude : user.current_coordinates.longitude;
        const rad = parseInt(radius);

        activityLogger.info(`Coordinates: Latitude = ${lat}, Longitude = ${lon}, Radius = ${rad}`);

        const events = await Event.findAll({
            where: sequelize.where(
                sequelize.fn(
                    'ST_DWithin',
                    sequelize.col('location'),
                    sequelize.fn('ST_SetSRID', sequelize.fn('ST_MakePoint', lon, lat), 4326),
                    rad
                ),
                true
            ),
            order: [['createdat', 'DESC']]
        });

        activityLogger.info(`Found ${events.length} events nearby.`);
        res.status(200).json(events);
    } catch (err) {
        errorLogger.error("Something wrong in events/nearby: ", err);
        res.status(400).json({
            "msg": err.message || "Failed to fetch events"
        });
    }
};



exports.joinEvent = async (req, res) => {
    try {
        const eventId = parseInt(req.params['eventId']);
        const event = await Event.findByPk(eventId);
        const groupId = event.groupid;
        const user = req.user;
        // Update the User collection to add the group to the user's groups array
        const groupAddedInUser = await User.updateOne(
            { _id: user._id },
            { $addToSet: { groups: new ObjectId(groupId) } }
        );
        //Updating 'members' field that is an array of ObjectId references to User documents
        const userAddedToGroup = await Group.updateOne(
            { _id: new ObjectId(groupId) },
            {
                $addToSet: {
                    members: {
                        userId: user._id,
                        userName: user.username,
                        picture: user.picture,
                        karma: user.karma,
                    },
                },
            }
        );

        activityLogger.info(`User ${user.username} joined event ${event.eventname}`);
        res.status(200).json({
            "msg": "user joined successfully"
        });
    } catch (err) {
        errorLogger.error("Something wrong in joinEvent: ", err);
        res.status(400).json({
            "msg":err
        });
    }
}

exports.eventDetails = async (req, res) => {
    const eventId = req.params['eventId'];
    const userId = req.user.id;
    try {
       
        activityLogger.info(`Event ID received: ${eventId}`);

        const event = await Event.findByPk(eventId);

        if (!event) {
            return res.status(404).json({ msg: 'Event not found' });
        }

        const group = await Group.findById(event.groupid);

        const isJoined = group ? group.members.some(member => member.userId.toString() === userId.toString()) : false;

        // Fetch user details
        const user = await User.findById(event.userid).lean();

        // Determine if the current user is the host
        const isMine = event.host.some(host => host.userId.toString() === userId.toString());

        

        const eventDetails = {
            eventId: event.eventid,
            title: event.eventname,
            description: event.description,
            date: event.starttime,
            time: event.endtime,
            location: event.location,
            avatarUrl: event.avatarUrl,
            address: event.address,
            locationStr: event.locationStr,
            host: event.host,
            isJoined: isJoined,
            isMine: isMine
        };

        // Send the response
        res.status(200).json(eventDetails);
    } catch (err) {
        errorLogger.error("Error fetching event details: ", err);
        res.status(500).json({ msg: 'Internal server error' });
    }
};


exports.deleteEvent = async (req, res) => {
    const eventId = req.params.eventId;

    if (!eventId) {
        return res.status(400).json({ message: "Event ID is missing" });
    }

    try {
        // Fetch the event to get the associated group ID using Sequelize
        const event = await Event.findByPk(eventId);
        if (!event) {
            return res.status(404).json({ message: "Event not found or already deleted" });
        }

        const groupId = event.groupid;

        // Delete the event using Sequelize
        await Event.destroy({
            where: { eventid: eventId }
        });

        // If the event has an associated group, delete the group using Mongoose
        if (groupId) {
            await Group.findByIdAndDelete(groupId);
        }

        await User.updateMany(
            { groups: groupId },
            { $pull: { groups: groupId } }
        );


        activityLogger.info("Event and associated group successfully canceled");
        res.status(200).json({ message: "Event and associated group successfully canceled" });
    } catch (error) {
        errorLogger.error('Error deleting event and associated group:', error);
        res.status(500).json({ message: "Failed to delete the event and associated group due to an error" });
    }
};

exports.searchEvents = async (req, res) => {
    const query = req.body.searchQuery; 

    if (!query) {
        errorLogger.error("Search query missing - cannot proceed with event search.");
        return res.status(400).json({ message: "Please provide a search query." });
    }

    try {
        const events = await Event.findAll({
            where: {
                [Op.or]: [ 
                    {
                        eventname: {
                            [Op.iLike]: `%${query}%`  
                        }
                    },
                    {
                        description: {
                            [Op.iLike]: `%${query}%`
                        }
                    }
                ]
            },
            
            order: [['starttime', 'ASC']]
        });

        if (events.length > 0) {
            activityLogger.info(`Found ${events.length} events matching the query '${query}'.`);
            res.status(200).json(events);
        } else {
            errorLogger.info(`No events found for the query '${query}'.`);
            res.status(404).json({ message: "No events found matching your query." });
        }
    } catch (error) {
        errorLogger.error('Error searching for events: ' + error.message);
        res.status(500).json({ message: "Error searching for events." });
    }
};

exports.updateEvent = async (req, res) => {
    const eventId = req.params['eventId']; 
    const {...updateData } = req.body; 

    if (!eventId) {
        return res.status(400).json({ message: "Event ID is required" });
    }

    if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: "No update fields provided" });
    }

    try {
      
        const [updatedRows] = await Event.update(updateData, {
            where: { eventid: eventId }
        });

        if (updatedRows > 0) {
            activityLogger.info(`Event updated for ${eventId}`);
            res.status(200).json({ message: "Event updated successfully" });
        } else {
            errorLogger.error(`Event not found`);
            res.status(404).json({ message: "Event not found" });
        }
    } catch (error) {
        errorLogger.error('Error updating event:', error);
        res.status(500).json({ message: "Failed to update the event due to an error" });
    }
};

exports.getGoingEvents = async (req, res) => {
    try {
      const user = req.user;
  
   
      const userGroups = await Group.find({
        'members.userId': user._id
      });
  
   
      const groupIds = userGroups.map(group => group._id.toString());
  
     
      const events = await Event.findAll({
        where: {
          groupid: {
            [Op.in]: groupIds
          }
        }
      });
  
      res.status(200).json(events);
    } catch (err) {
      errorLogger.error('Error fetching going events:', err);
      res.status(500).json({ msg: 'Internal server error' });
    }
  };

  exports.getMyEvents = async (req, res) => {
    try {
      const user = req.user;
  
      
      const events = await Event.findAll({
        where: {
          userid: user._id.toString()
        }
      });
  
      res.status(200).json(events);
    } catch (err) {
      errorLogger.error('Error fetching my events:', err);
      res.status(500).json({ msg: 'Internal server error' });
    }
  };