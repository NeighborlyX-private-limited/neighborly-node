const express = require("express");
const { createGroup, removeUser } = require("../controllers/groupController");

const router = express.Router();

router.route("/create_group").post(createGroup);
router.route("/remove-user").delete(removeUser);
module.exports = router;