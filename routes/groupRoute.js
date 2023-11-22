const express = require("express");
const { createGroup } = require("../controllers/groupController");

const router = express.Router();

router.route("/create").get(createGroup);

module.exports = router;