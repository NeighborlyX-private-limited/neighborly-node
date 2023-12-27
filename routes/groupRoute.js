const express = require("express");
const { createGroup, addUser } = require("../controllers/groupController");

const router = express.Router();

router.route("/create_group").post(createGroup);
router.route("/add-user").post(addUser);
module.exports = router;