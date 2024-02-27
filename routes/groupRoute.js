const express = require("express");
const router = express.Router();
const { isAuthenticated } = require("../middlewares/auth");

const { createGroup, addUser, makeGroupPermanent, removeUser, nearestGroup, fetchLastMessages, fetchGroupDetails, nearbyUsers } = require("../controllers/groupController");


router.route("/remove-user").post(removeUser);
router.route("/make-group-permanent").put(makeGroupPermanent);
router.route("/fetch-nearby-users").get(nearbyUsers);
router.route("/add-user").post(addUser);
router.route("/nearest-group").get(nearestGroup);
router.route("/create").post(isAuthenticated,createGroup);
router.route("/fetch-group-messages/:groupId").get(fetchLastMessages);
router.route("/fetch-group-details/:groupId").get(fetchGroupDetails);

module.exports = router;
