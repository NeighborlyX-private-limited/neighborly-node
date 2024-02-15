const express = require("express");
const router = express.Router();
const { isAuthenticated } = require("../middlewares/auth");


const { createGroup, addUser, makeGroupPermanent, removeUser, nearestGroup, fetchLastMessages, fetchGroupDetails } = require("../controllers/groupController");


router.route("/remove-user").delete(removeUser);
router.route("/make-group-permanent").put(makeGroupPermanent);
router.route("/add-user").post(addUser);
router.route("/nearest-group").get(nearestGroup);
router.route("/create").post(isAuthenticated,createGroup);
router.route("/fetchgroupmessage").get(fetchLastMessages);
router.route("/fetchgroupdetails").get(fetchGroupDetails);

module.exports = router;
