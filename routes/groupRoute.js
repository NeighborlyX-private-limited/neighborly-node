const express = require("express");
const { createGroup, fetchLastMessages, fetchGroupDetails } = require("../controllers/groupController");

const router = express.Router();

router.route("/create").get(createGroup);
router.route("/fetchgroupmessage").get(fetchLastMessages);
router.route("/fetchgroupdetails").get(fetchGroupDetails);

module.exports = router;