const express = require("express");

const { createGroup, makeGroupPermanent } = require("../controllers/groupController");

const { createGroup, addUser } = require("../controllers/groupController");

const router = express.Router();

router.route("/create_group").post(createGroup);

router.route("/make-group-permanent").put(makeGroupPermanent);

router.route("/add-user").post(addUser);

module.exports = router;