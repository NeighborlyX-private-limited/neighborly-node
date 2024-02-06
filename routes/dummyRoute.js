const express = require("express");
const { createDummyUsers, createFakeMessages } = require("../utils/dummyUserCreation");

const router = express.Router();

router.route("/createfakeuser").post(createDummyUsers);
router.route("/createfakemessages").post(createFakeMessages);

module.exports = router;