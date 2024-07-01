const express = require("express");
const { isAuthenticated } = require("../middlewares/auth");

const router = express.Router();

const { createEvent, getNearbyEvents, joinEvent, deleteEvent, searchEvents, updateEvent } = require('../controllers/eventController');

router.route('/create-event').post(isAuthenticated, createEvent);
router.route('/events/nearby').get(isAuthenticated, getNearbyEvents);
router.route('/events/:eventId/join').put(isAuthenticated, joinEvent);
router.route('/delete-event/:eventId').delete(isAuthenticated,deleteEvent);
router.route('/search-events').get(isAuthenticated,searchEvents);
router.route('/update-event/:eventId').put(isAuthenticated,updateEvent);

module.exports = router;