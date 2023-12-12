const express = require("express");
const { createGroup } = require("../controllers/groupController");

const router = express.Router();

router.route("/create_group").post(createGroup);

module.exports = router;