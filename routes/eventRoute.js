const express = require("express");
const { isAuthenticated } = require("../middlewares/auth");

const router = express.Router();

const { createEvent, getNearbyEvents, joinEvent } = require('../controllers/eventController');

router.route('/create-event').post(isAuthenticated, createEvent);
router.route('/events/nearby').get(isAuthenticated, getNearbyEvents);
router.route('/events/:eventId/join').put(isAuthenticated, joinEvent);

module.exports = router;