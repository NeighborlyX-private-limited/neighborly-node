const Event = require('../models/EventModel');
const { Op, where } = require('sequelize');
const { activityLogger, errorLogger } = require("../utils/logger");
const { sequelize } = require('../config/database');
const Group = require('../models/groupModel');
const User = require('../models/userModel');
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;
const { otpgenerator } = require('../utils/emailService');
const { error } = require('winston');

exports.createEvent = async (req, res) => {
    const { name, description, location, radius, startTime, endTime, multimedia } = req.body;
    const user = req.user;
    const admin = {
        userId: user._id,
        userName: user.username,
        picture: user.picture,
        karma: user.karma
    }
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
                coordinates: location,
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
            location: { type: "POINT", coordinates: location },
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
        })
    }
}

exports.getNearbyEvents = async (req, res) => {
    const { latitude, longitude, radius } = req.query;
    let events;
    try {
        events = await sequelize.query(`SELECT eventid, userid, eventname, description, location, starttime, endtime, createdat, multimedia, groupid
	FROM events WHERE ST_DWithin(location, ST_SetSRID(ST_Point(${latitude}, ${longitude}), 4326), ${radius}) ORDER BY createdat DESC`);
        events = events[0];
        res.status(200).json(events);
    } catch (err) {
        errorLogger.error("Something wrong in events/nearby: ", err);
        res.status(400).json({
            "msg": err
        });
    }
}

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
exports.eventDetails = async(req,res)=>{
    const eventId = (req.params['eventId']);
    console.log(eventId)
    try {
        activityLogger.info("event Id recived");
        const event = await Event.findByPk(eventId, {
            attributes: ['eventid', 'eventname', 'description', 'starttime', 'endtime', 'location', 'multimedia'],
            
        });
        if (!event) {
            return res.status(404).json({ msg: 'Event not found' });
        }
           console.log(event)
        // Format the response
        const eventDetails = {
            eventId: event.eventid,
            title: event.eventname,
            description: event.description,
            date: event.starttime,
            time: event.endtime,
            location: event.location,
            category: event.category,          
        };

        // Send the response
        res.status(200).json(eventDetails);
    } catch (err) {
        errorLogger.error("Error fetching event details: ", err);
        res.status(500).json({ msg: 'Internal server error' });
    }
    
}