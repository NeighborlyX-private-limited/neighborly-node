const express = require("express");
const { isAuthenticated } = require("../middlewares/auth");

const router = express.Router();

const { createEvent, getNearbyEvents, joinEvent, eventId, eventDiscovery, eventDetails } = require('../controllers/eventController');

router.route('/create-event').post(isAuthenticated, createEvent);
router.route('/events/nearby').get(isAuthenticated, getNearbyEvents);
router.route('/events/:eventId/join').put(isAuthenticated, joinEvent);
router.route('/event-detail/:eventId').get(isAuthenticated, eventDetails);
module.exports = router;