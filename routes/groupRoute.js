const express = require("express");
const router = express.Router();



const { createGroup, addUser, makeGroupPermanent, removeUser, nearestGroup, fetchLastMessages, fetchGroupDetails } = require("../controllers/groupController");


const router = express.Router();

router.route("/remove-user").delete(removeUser);
router.route("/make-group-permanent").put(makeGroupPermanent);
router.route("/add-user").post(addUser);
router.route("/nearest-group").post(nearestGroup);
router.route("/create").get(createGroup);
router.route("/fetchgroupmessage").get(fetchLastMessages);
router.route("/fetchgroupdetails").get(fetchGroupDetails);

module.exports = router;
