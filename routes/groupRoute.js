const express = require("express");

const { createGroup, addUser, makeGroupPermanent, removeUser, nearestGroup } = require("../controllers/groupController");


const router = express.Router();

router.route("/create_group").post(createGroup);

router.route("/remove-user").delete(removeUser);

router.route("/make-group-permanent").put(makeGroupPermanent);

router.route("/add-user").post(addUser);

router.route("/nearest-group").post(nearestGroup);

module.exports = router;
