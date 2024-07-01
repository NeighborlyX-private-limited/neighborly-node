const Event = require('../models/EventModel');
const { Op, where } = require('sequelize');
const { activityLogger, errorLogger } = require("../utils/logger");
const { sequelize } = require('../config/database');
const Group = require('../models/groupModel');
const User = require('../models/userModel');
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;
const { otpgenerator } = require('../utils/emailService');

exports.createEvent = async (req, res) => {
    const { name, description, radius, startTime, endTime, multimedia } = req.body;
    const user = req.user;
    const isHome = req.query?.home;
    
    // Use a new variable to determine the location
    let eventLocation = isHome ? user.home_coordinates.coordinates : user.current_coordinates.coordinates;

    const admin = {
        userId: user._id,
        userName: user.username,
        picture: user.picture,
        karma: user.karma
    };

    try {
        let code = otpgenerator();
        let displayname = name + code;
        while (await Group.findOne({ displayname })) {
            code = otpGenerator.generate(4, { upperCaseAlphabets: false, lowerCaseAlphabets: false, specialChars: false });
            displayname = name + code;
        }

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
            members: [],
            karma: 1000,
        });

        const event = await Event.create({
            userid: user._id.toString(),
            eventname: name,
            description: description,
            location: { type: "Point", coordinates: eventLocation },
            starttime: Date.parse(startTime),
            endtime: Date.parse(endTime),
            createdat: Date.now(),
            multimedia: multimedia,
            groupid: group._id.toString()
        });

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
            "msg": "Some thing wrong with create event"
        });
    }
};


exports.getNearbyEvents = async (req, res) => {
    const { latitude, longitude, radius } = req.query;
    const user = req.user; // Ensure the user object is available in the request
    const isHome = req.query?.home === 'true'; // Correctly parse the boolean from query string

    try {
        // Decide the location based on the user's choice
        const lat = isHome ? user.home_coordinates.latitude : parseFloat(latitude);
        const lon = isHome ? user.home_coordinates.longitude : parseFloat(longitude);
        const rad = parseInt(radius);

        activityLogger.info(`Coordinates: Latitude = ${lat}, Longitude = ${lon}, Radius = ${rad}`);

        const events = await Event.findAll({
            attributes: [
                'eventid', 'userid', 'eventname', 'description', 'location', 
                'starttime', 'endtime', 'createdat', 'multimedia', 'groupid'
            ],
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
            attributes: ['eventid', 'eventname', 'starttime', 'location'],
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
        // Attempt to update the event
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
