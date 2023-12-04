const express = require("express");
const { createGroup } = require("../controllers/groupController");

const router = express.Router();

router.route("/create").post(createGroup);

module.exports = router;