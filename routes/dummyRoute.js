const express = require("express");
const { createDummyUsers } = require("../utils/dummyUserCreation");

const router = express.Router();

router.route("/create").post(createDummyUsers);

module.exports = router;